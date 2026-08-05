-- Replace the 5-minute Telegram daily-summary callback with a once-daily planner.
--
-- The planner reads the admin-configured Europe/Belgrade send time, converts it
-- to the matching UTC cron expression for the current local date, and schedules
-- a dedicated send job. Saving Telegram settings in the dashboard can call the
-- public service-role wrapper to re-plan the send job immediately.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create schema if not exists private;

create or replace function private.plan_telegram_daily_schedule_cron()
returns void
language plpgsql
security definer
set search_path = public, private, cron
as $$
declare
  send_time_text text;
  send_time time;
  local_date date;
  target_at timestamptz;
  target_utc timestamp;
  cron_expression text;
  existing_job_id bigint;
begin
  select value #>> '{}'
  into send_time_text
  from public.app_settings
  where key = 'telegram_daily_schedule_time'
  limit 1;

  if send_time_text is null or send_time_text !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' then
    send_time_text := '09:30';
  end if;

  send_time := send_time_text::time;
  local_date := (now() at time zone 'Europe/Belgrade')::date;
  target_at := (local_date + send_time) at time zone 'Europe/Belgrade';

  if target_at <= now() then
    target_at := ((local_date + 1) + send_time) at time zone 'Europe/Belgrade';
  end if;

  target_utc := target_at at time zone 'UTC';
  cron_expression := format(
    '%s %s %s %s *',
    extract(minute from target_utc)::int,
    extract(hour from target_utc)::int,
    extract(day from target_utc)::int,
    extract(month from target_utc)::int
  );

  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'raine-telegram-daily-schedule-send'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'raine-telegram-daily-schedule-send',
    cron_expression,
    $command$select private.invoke_telegram_daily_schedule_cron();$command$
  );

  raise log 'raine telegram daily schedule send planned for % using cron expression %', target_at, cron_expression;
end;
$$;

revoke all on function private.plan_telegram_daily_schedule_cron() from public, anon, authenticated;

create or replace function public.plan_telegram_daily_schedule_cron()
returns void
language sql
security definer
set search_path = public, private
as $$
  select private.plan_telegram_daily_schedule_cron();
$$;

revoke all on function public.plan_telegram_daily_schedule_cron() from public, anon, authenticated;
grant execute on function public.plan_telegram_daily_schedule_cron() to service_role;

do $$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'raine-telegram-daily-schedule'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'raine-telegram-daily-schedule-plan'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'raine-telegram-daily-schedule-plan',
    '0 0 * * *',
    $command$select private.plan_telegram_daily_schedule_cron();$command$
  );

  perform private.plan_telegram_daily_schedule_cron();
end $$;

comment on function private.plan_telegram_daily_schedule_cron()
  is 'Plans the next Raine Telegram daily schedule send job from app_settings.telegram_daily_schedule_time in Europe/Belgrade.';

comment on function public.plan_telegram_daily_schedule_cron()
  is 'Service-role wrapper used by the Next.js dashboard after Telegram daily schedule settings change.';

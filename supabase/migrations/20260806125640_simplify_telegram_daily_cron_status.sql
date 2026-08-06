-- Simplify Telegram daily schedule cron delivery and expose safe admin status.
--
-- Supabase Cron remains the scheduler, but the Next.js endpoint no longer needs
-- a shared CRON_SECRET from Vercel/Vault. Delivery is protected by POST-only
-- access, the configured send window, and daily idempotency in
-- notification_delivery_log. This table stores non-sensitive endpoint telemetry
-- so admins can see whether cron called the endpoint and what it answered.

create extension if not exists pg_net;
create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;
create schema if not exists private;

create table if not exists public.notification_cron_event_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  source text not null default 'supabase_cron',
  local_date date,
  status text not null,
  response_status integer not null,
  response_reason text,
  received_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notification_cron_event_log_event_type_check check (
    event_type in ('telegram_daily_schedule')
  ),
  constraint notification_cron_event_log_status_check check (
    status in ('received', 'sent', 'failed', 'skipped')
  ),
  constraint notification_cron_event_log_response_status_check check (
    response_status between 100 and 599
  ),
  constraint notification_cron_event_log_source_check check (
    source <> ''
    and source !~ '^-?[0-9]+$'
    and length(source) <= 80
  )
);

create index if not exists notification_cron_event_log_event_received_idx
  on public.notification_cron_event_log(event_type, received_at desc);

alter table public.notification_cron_event_log enable row level security;

revoke all on table public.notification_cron_event_log from anon, authenticated;
grant select on table public.notification_cron_event_log to authenticated;

drop policy if exists "Admin users can select notification cron event log" on public.notification_cron_event_log;
create policy "Admin users can select notification cron event log"
  on public.notification_cron_event_log
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

comment on table public.notification_cron_event_log
  is 'Safe admin-visible cron endpoint telemetry. Stores no tokens, raw Telegram identifiers, client data, or message bodies.';

create or replace function private.invoke_telegram_daily_schedule_cron()
returns void
language plpgsql
security definer
set search_path = public, private, vault, net
as $$
declare
  site_url text;
  request_id bigint;
begin
  select decrypted_secret
  into site_url
  from vault.decrypted_secrets
  where name = 'raine_site_url'
  limit 1;

  site_url := nullif(regexp_replace(coalesce(site_url, ''), '/+$', ''), '');

  if site_url is null then
    raise log 'raine telegram daily schedule cron skipped: Vault secret raine_site_url is missing';
    return;
  end if;

  select net.http_post(
    url := site_url || '/api/cron/telegram-daily-schedule',
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'source', 'supabase_cron',
      'triggered_at', now()
    ),
    timeout_milliseconds := 30000
  )
  into request_id;

  raise log 'raine telegram daily schedule cron queued pg_net request id %', request_id;
end;
$$;

revoke all on function private.invoke_telegram_daily_schedule_cron() from public, anon, authenticated;

comment on function private.invoke_telegram_daily_schedule_cron()
  is 'Supabase Cron callback wrapper for the Raine Telegram daily schedule summary. Reads only raine_site_url from Vault and queues the protected-by-schedule Next.js endpoint through pg_net.';

do $$
begin
  if to_regprocedure('private.plan_telegram_daily_schedule_cron()') is not null then
    perform private.plan_telegram_daily_schedule_cron();
  end if;
end $$;

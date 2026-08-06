-- Harden the Supabase Cron callback for the Telegram daily schedule summary.
--
-- The dashboard test action sends directly from Next.js and can succeed even when
-- the scheduled Supabase pg_net callback times out or is misconfigured. This
-- migration keeps the same protected Next.js endpoint but gives cold serverless
-- starts more room and logs the queued pg_net request id in Postgres logs.

create extension if not exists pg_net;
create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;

create schema if not exists private;

create or replace function private.invoke_telegram_daily_schedule_cron()
returns void
language plpgsql
security definer
set search_path = public, private, vault, net
as $$
declare
  site_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into site_url
  from vault.decrypted_secrets
  where name = 'raine_site_url'
  limit 1;

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'raine_cron_secret'
  limit 1;

  site_url := nullif(regexp_replace(coalesce(site_url, ''), '/+$', ''), '');
  cron_secret := nullif(cron_secret, '');

  if site_url is null or cron_secret is null then
    raise log 'raine telegram daily schedule cron skipped: Vault secrets raine_site_url or raine_cron_secret are missing';
    return;
  end if;

  select net.http_post(
    url := site_url || '/api/cron/telegram-daily-schedule',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || cron_secret
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
  is 'Supabase Cron callback wrapper for the Raine Telegram daily schedule summary. Reads raine_site_url and raine_cron_secret from Vault and queues the protected Next.js endpoint through pg_net.';

do $$
begin
  if to_regprocedure('private.plan_telegram_daily_schedule_cron()') is not null then
    perform private.plan_telegram_daily_schedule_cron();
  end if;
end $$;

-- Schedule the Telegram daily schedule summary through Supabase Cron.
--
-- Before applying this migration in hosted Supabase, store the endpoint config in Vault:
--
--   select vault.create_secret('https://raine.rs', 'raine_site_url', 'Raine production site URL for cron callbacks');
--   select vault.create_secret('<same value as deployment CRON_SECRET>', 'raine_cron_secret', 'Bearer token for Raine cron callbacks');
--
-- The cron runs every 5 minutes. The Next.js endpoint checks the admin-configured
-- Europe/Belgrade send time and delivery idempotency before sending Telegram.

create extension if not exists pg_net;
create extension if not exists pg_cron;
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
    raise log 'raine telegram daily schedule cron skipped: Vault secrets are missing';
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
    timeout_milliseconds := 10000
  )
  into request_id;
end;
$$;

revoke all on function private.invoke_telegram_daily_schedule_cron() from public, anon, authenticated;

select cron.schedule(
  'raine-telegram-daily-schedule',
  '*/5 * * * *',
  $$select private.invoke_telegram_daily_schedule_cron();$$
);

comment on function private.invoke_telegram_daily_schedule_cron()
  is 'Supabase Cron callback wrapper for the Raine Telegram daily schedule summary. Reads raine_site_url and raine_cron_secret from Vault.';

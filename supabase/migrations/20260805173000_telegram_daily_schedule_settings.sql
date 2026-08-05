-- Admin-managed Telegram daily schedule summary settings and safe delivery log.

alter table public.app_settings
  drop constraint if exists app_settings_available_rooms_value_check,
  drop constraint if exists app_settings_supported_values_check;

alter table public.app_settings
  add constraint app_settings_supported_values_check check (
    (
      key = 'available_rooms'
      and jsonb_typeof(value) = 'number'
      and (value #>> '{}') ~ '^[1-9][0-9]*$'
      and ((value #>> '{}')::integer between 1 and 10)
    )
    or (
      key = 'telegram_daily_schedule_enabled'
      and jsonb_typeof(value) = 'boolean'
    )
    or (
      key = 'telegram_daily_schedule_time'
      and jsonb_typeof(value) = 'string'
      and (value #>> '{}') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    )
    or (
      key = 'telegram_daily_schedule_timezone'
      and value = '"Europe/Belgrade"'::jsonb
    )
    or key not in (
      'available_rooms',
      'telegram_daily_schedule_enabled',
      'telegram_daily_schedule_time',
      'telegram_daily_schedule_timezone'
    )
  );

insert into public.app_settings (key, value)
values
  ('telegram_daily_schedule_enabled', 'true'::jsonb),
  ('telegram_daily_schedule_time', '"09:30"'::jsonb),
  ('telegram_daily_schedule_timezone', '"Europe/Belgrade"'::jsonb)
on conflict (key) do nothing;

drop policy if exists "Staff users can select app settings" on public.app_settings;
drop policy if exists "Admin users can select app settings" on public.app_settings;
drop policy if exists "Therapists can select operational app settings" on public.app_settings;

create policy "Admin users can select app settings"
  on public.app_settings
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Therapists can select operational app settings"
  on public.app_settings
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and key in ('available_rooms')
  );

create table if not exists public.notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  notification_type text not null,
  local_date date not null,
  destination_key text not null,
  status text not null,
  attempted_at timestamptz not null default now(),
  sent_at timestamptz,
  error_code text,
  error_message_safe text,
  created_at timestamptz not null default now(),
  constraint notification_delivery_log_type_check check (
    notification_type in ('telegram_daily_schedule', 'telegram_daily_schedule_test')
  ),
  constraint notification_delivery_log_status_check check (
    status in ('pending', 'sent', 'failed', 'skipped')
  ),
  constraint notification_delivery_log_destination_key_check check (
    destination_key <> ''
    and destination_key !~ '^-?[0-9]+$'
  )
);

create unique index if not exists notification_delivery_log_daily_schedule_once_idx
  on public.notification_delivery_log(notification_type, local_date, destination_key)
  where notification_type = 'telegram_daily_schedule';

create index if not exists notification_delivery_log_type_date_idx
  on public.notification_delivery_log(notification_type, local_date desc);

alter table public.notification_delivery_log enable row level security;

revoke all on table public.notification_delivery_log from anon, authenticated;
grant select on table public.notification_delivery_log to authenticated;

drop policy if exists "Admin users can select notification delivery log" on public.notification_delivery_log;
create policy "Admin users can select notification delivery log"
  on public.notification_delivery_log
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

comment on table public.notification_delivery_log
  is 'Safe notification delivery audit log. Stores delivery type, local date, status, and non-sensitive destination keys only.';

comment on column public.notification_delivery_log.destination_key
  is 'Non-sensitive destination reference such as a hashed Telegram chat id. Raw chat ids and bot tokens must not be stored here.';

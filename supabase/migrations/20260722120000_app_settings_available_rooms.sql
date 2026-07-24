-- Generic application settings for operational salon configuration.
-- The first setting controls treatment-room capacity for booking availability.

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint app_settings_key_format_check check (key ~ '^[a-z0-9_:-]+$')
);

create index if not exists app_settings_updated_by_idx on public.app_settings(updated_by);

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
  before update on public.app_settings
  for each row
  execute function private.set_updated_at();

alter table public.app_settings
  drop constraint if exists app_settings_available_rooms_value_check;

alter table public.app_settings
  add constraint app_settings_available_rooms_value_check check (
    key <> 'available_rooms'
    or (
      jsonb_typeof(value) = 'number'
      and (value #>> '{}') ~ '^[1-9][0-9]*$'
      and ((value #>> '{}')::integer between 1 and 10)
    )
  );

alter table public.app_settings enable row level security;

revoke all on table public.app_settings from anon, authenticated;
grant select on table public.app_settings to authenticated;
grant insert, update on table public.app_settings to authenticated;

drop policy if exists "Staff users can select app settings" on public.app_settings;
create policy "Staff users can select app settings"
  on public.app_settings
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'therapist'));

drop policy if exists "Admin users can insert app settings" on public.app_settings;
create policy "Admin users can insert app settings"
  on public.app_settings
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can update app settings" on public.app_settings;
create policy "Admin users can update app settings"
  on public.app_settings
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

insert into public.app_settings (key, value)
values ('available_rooms', '2'::jsonb)
on conflict (key) do nothing;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;

comment on table public.app_settings
  is 'Generic application settings. available_rooms controls concurrent booking capacity; only admins may modify settings, staff may read them, anon cannot access them.';

-- Dashboard MVP schema for admin and therapist staff workflows.
-- This migration is additive: it does not drop bookings data and keeps anon booking inserts working.

create schema if not exists private;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('admin', 'therapist')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.therapists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  locale text not null check (locale in ('sr', 'ru', 'en')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  duration_minutes int not null check (duration_minutes > 0),
  price_rsd int check (price_rsd is null or price_rsd >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.bookings
  add column if not exists client_id uuid references public.clients(id) on delete set null,
  add column if not exists therapist_id uuid references public.therapists(id) on delete set null,
  add column if not exists internal_notes text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists therapists_profile_id_idx on public.therapists(profile_id);
create index if not exists therapists_active_idx on public.therapists(active);
create index if not exists clients_locale_idx on public.clients(locale);
create index if not exists services_active_idx on public.services(active);
create index if not exists bookings_client_id_idx on public.bookings(client_id);
create index if not exists bookings_therapist_id_idx on public.bookings(therapist_id);
create index if not exists bookings_status_idx on public.bookings(status);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function private.set_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
  before update on public.clients
  for each row
  execute function private.set_updated_at();

drop trigger if exists set_bookings_updated_at on public.bookings;
create trigger set_bookings_updated_at
  before update on public.bookings
  for each row
  execute function private.set_updated_at();

create or replace function private.enforce_therapist_booking_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  dashboard_role text := auth.jwt() -> 'app_metadata' ->> 'role';
begin
  if dashboard_role = 'admin' then
    return new;
  end if;

  if dashboard_role = 'therapist' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.service is distinct from old.service
      or new.specialist is distinct from old.specialist
      or new.preferred_date is distinct from old.preferred_date
      or new.preferred_time is distinct from old.preferred_time
      or new.client_name is distinct from old.client_name
      or new.client_phone is distinct from old.client_phone
      or new.client_comment is distinct from old.client_comment
      or new.locale is distinct from old.locale
      or new.source is distinct from old.source
      or new.client_id is distinct from old.client_id
      or new.therapist_id is distinct from old.therapist_id
    then
      raise exception 'Therapists can only update booking status and internal notes.';
    end if;

    if new.status is distinct from old.status and new.status <> 'completed'::public.booking_status then
      raise exception 'Therapists can only set booking status to completed.';
    end if;

    return new;
  end if;

  raise exception 'Only dashboard staff can update bookings.';
end;
$$;

drop trigger if exists enforce_therapist_booking_update on public.bookings;
create trigger enforce_therapist_booking_update
  before update on public.bookings
  for each row
  execute function private.enforce_therapist_booking_update();

alter table public.profiles enable row level security;
alter table public.therapists enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.bookings enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.therapists from anon, authenticated;
revoke all on table public.clients from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, update on table public.therapists to authenticated;
grant select, update on table public.clients to authenticated;
grant select, update on table public.services to authenticated;
grant select, update on table public.bookings to authenticated;

grant insert on table public.bookings to anon;

create policy "Admin users can select profiles"
  on public.profiles
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can update profiles"
  on public.profiles
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can select therapists"
  on public.therapists
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can update therapists"
  on public.therapists
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Therapists can select own therapist record"
  on public.therapists
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and profile_id = (select auth.uid())
  );

create policy "Admin users can select clients"
  on public.clients
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can update clients"
  on public.clients
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can select services"
  on public.services
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can update services"
  on public.services
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can select bookings"
  on public.bookings
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Admin users can update bookings"
  on public.bookings
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "Therapists can select own bookings"
  on public.bookings
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

create policy "Therapists can update own bookings"
  on public.bookings
  for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

-- Existing public booking behavior: anon can insert website requests only.
-- No anon SELECT, UPDATE, or DELETE policies are defined.

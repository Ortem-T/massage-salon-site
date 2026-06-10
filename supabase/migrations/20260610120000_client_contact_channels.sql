-- Client contact normalization for dashboard manual bookings and future CRM.
-- Additive only: legacy booking snapshot fields stay in place.

alter table public.clients
  alter column phone drop not null,
  alter column locale drop not null,
  add column if not exists instagram_username text,
  add column if not exists telegram_username text,
  add column if not exists whatsapp_phone text,
  add column if not exists viber_phone text,
  add column if not exists primary_contact_channel text,
  add column if not exists primary_contact_value text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.bookings
  add column if not exists client_contact_channel text,
  add column if not exists client_contact_value text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_primary_contact_channel_check'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_primary_contact_channel_check
      check (
        primary_contact_channel is null
        or primary_contact_channel in ('instagram', 'whatsapp', 'telegram', 'viber', 'phone', 'walk_in', 'other')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_client_contact_channel_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_client_contact_channel_check
      check (
        client_contact_channel is null
        or client_contact_channel in ('instagram', 'whatsapp', 'telegram', 'viber', 'phone', 'walk_in', 'other')
      );
  end if;
end;
$$;

create index if not exists clients_phone_idx on public.clients(phone) where phone is not null;
create index if not exists clients_instagram_username_idx on public.clients(instagram_username) where instagram_username is not null;
create index if not exists clients_telegram_username_idx on public.clients(telegram_username) where telegram_username is not null;
create index if not exists clients_whatsapp_phone_idx on public.clients(whatsapp_phone) where whatsapp_phone is not null;
create index if not exists clients_viber_phone_idx on public.clients(viber_phone) where viber_phone is not null;
create index if not exists clients_primary_contact_idx
  on public.clients(primary_contact_channel, primary_contact_value)
  where primary_contact_channel is not null and primary_contact_value is not null;
create index if not exists bookings_client_contact_idx
  on public.bookings(client_contact_channel, client_contact_value)
  where client_contact_channel is not null and client_contact_value is not null;

grant insert on table public.clients to authenticated;

drop policy if exists "Admin users can insert clients" on public.clients;
create policy "Admin users can insert clients"
  on public.clients
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Therapists can select own booking clients" on public.clients;
create policy "Therapists can select own booking clients"
  on public.clients
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and exists (
      select 1
      from public.bookings
      join public.therapists on therapists.id = bookings.therapist_id
      where bookings.client_id = clients.id
        and therapists.profile_id = (select auth.uid())
        and therapists.active = true
    )
  );

drop policy if exists "Therapists can insert booking clients" on public.clients;
create policy "Therapists can insert booking clients"
  on public.clients
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist');

create or replace function public.find_or_create_public_booking_client(
  client_name text,
  client_phone text,
  client_locale text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_name text := nullif(trim(client_name), '');
  normalized_phone text := nullif(trim(client_phone), '');
  normalized_locale text := case
    when client_locale in ('sr', 'ru', 'en') then client_locale
    else 'sr'
  end;
  found_client_id uuid;
begin
  if normalized_name is null or normalized_phone is null then
    raise exception 'Client name and phone are required.';
  end if;

  select id
  into found_client_id
  from public.clients
  where phone = normalized_phone
     or whatsapp_phone = normalized_phone
     or viber_phone = normalized_phone
  order by created_at asc
  limit 1;

  if found_client_id is not null then
    return found_client_id;
  end if;

  insert into public.clients (
    name,
    phone,
    primary_contact_channel,
    primary_contact_value,
    locale
  )
  values (
    normalized_name,
    normalized_phone,
    'phone',
    normalized_phone,
    normalized_locale
  )
  returning id into found_client_id;

  return found_client_id;
end;
$$;

revoke all on function public.find_or_create_public_booking_client(text, text, text) from public;
grant execute on function public.find_or_create_public_booking_client(text, text, text) to anon, authenticated;

create or replace function private.enforce_therapist_booking_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  trusted_database_roles constant text[] := array['postgres', 'supabase_admin', 'service_role'];
  dashboard_role text;
begin
  if current_user = any(trusted_database_roles)
    or current_role = any(trusted_database_roles)
    or session_user = any(trusted_database_roles)
  then
    return new;
  end if;

  dashboard_role := auth.jwt() -> 'app_metadata' ->> 'role';

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
      or new.duration_minutes is distinct from old.duration_minutes
      or new.client_name is distinct from old.client_name
      or new.client_phone is distinct from old.client_phone
      or new.client_contact_channel is distinct from old.client_contact_channel
      or new.client_contact_value is distinct from old.client_contact_value
      or new.client_comment is distinct from old.client_comment
      or new.locale is distinct from old.locale
      or new.source is distinct from old.source
      or new.source_channel is distinct from old.source_channel
      or new.client_id is distinct from old.client_id
      or new.therapist_id is distinct from old.therapist_id
      or new.promotion_id is distinct from old.promotion_id
      or new.promotion_snapshot_title is distinct from old.promotion_snapshot_title
      or new.promotion_snapshot_description is distinct from old.promotion_snapshot_description
    then
      raise exception 'Therapists can only update booking status and internal notes.';
    end if;

    if new.status is distinct from old.status
      and new.status not in ('confirmed'::public.booking_status, 'cancelled'::public.booking_status, 'completed'::public.booking_status)
    then
      raise exception 'Therapists can only set booking status to confirmed, cancelled, or completed.';
    end if;

    return new;
  end if;

  raise exception 'Only dashboard staff can update bookings.';
end;
$$;

comment on column public.clients.instagram_username
  is 'Instagram username normalized with @ when provided.';
comment on column public.clients.telegram_username
  is 'Telegram username normalized with @ when provided.';
comment on column public.clients.primary_contact_channel
  is 'Preferred client contact channel for CRM and booking snapshots.';
comment on column public.clients.primary_contact_value
  is 'Preferred client contact value; usernames are stored here instead of clients.phone.';
comment on column public.bookings.client_contact_channel
  is 'Booking-specific client contact channel snapshot.';
comment on column public.bookings.client_contact_value
  is 'Booking-specific client contact value snapshot.';

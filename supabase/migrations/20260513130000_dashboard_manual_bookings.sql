-- Manual dashboard booking creation support.
-- Additive only: public website booking inserts remain anon insert-only.

alter table public.bookings
  add column if not exists source_channel text,
  add column if not exists duration_minutes int;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_source_channel_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_source_channel_check
      check (
        source_channel is null
        or source_channel in ('instagram', 'whatsapp', 'telegram', 'viber', 'phone', 'walk_in', 'other')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_duration_minutes_check'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_duration_minutes_check
      check (duration_minutes is null or duration_minutes > 0);
  end if;
end;
$$;

grant insert on table public.bookings to authenticated;

drop policy if exists "Admin users can insert dashboard bookings" on public.bookings;
create policy "Admin users can insert dashboard bookings"
  on public.bookings
  for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and source = 'dashboard'
    and status in ('pending'::public.booking_status, 'confirmed'::public.booking_status)
    and locale in ('sr', 'ru', 'en')
    and source_channel in ('instagram', 'whatsapp', 'telegram', 'viber', 'phone', 'walk_in', 'other')
  );

drop policy if exists "Therapists can insert own dashboard bookings" on public.bookings;
create policy "Therapists can insert own dashboard bookings"
  on public.bookings
  for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and source = 'dashboard'
    and status = 'confirmed'::public.booking_status
    and locale in ('sr', 'ru', 'en')
    and source_channel in ('instagram', 'whatsapp', 'telegram', 'viber', 'phone', 'walk_in', 'other')
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

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
      or new.duration_minutes is distinct from old.duration_minutes
      or new.client_name is distinct from old.client_name
      or new.client_phone is distinct from old.client_phone
      or new.client_comment is distinct from old.client_comment
      or new.locale is distinct from old.locale
      or new.source is distinct from old.source
      or new.source_channel is distinct from old.source_channel
      or new.client_id is distinct from old.client_id
      or new.therapist_id is distinct from old.therapist_id
    then
      raise exception 'Therapists can only update booking status and internal notes.';
    end if;

    if new.status is distinct from old.status
      and new.status not in (
        'confirmed'::public.booking_status,
        'cancelled'::public.booking_status,
        'completed'::public.booking_status
      )
    then
      raise exception 'Therapists can only set booking status to confirmed, cancelled, or completed.';
    end if;

    return new;
  end if;

  raise exception 'Only dashboard staff can update bookings.';
end;
$$;

comment on column public.bookings.source_channel
  is 'Manual booking source channel for dashboard-created bookings.';

comment on column public.bookings.duration_minutes
  is 'Optional dashboard booking duration snapshot in minutes.';

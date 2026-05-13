-- Dashboard booking permissions update.
-- Keeps admin unrestricted and allows therapists to manage only their assigned bookings
-- through the RLS policy plus this column-level update guard.

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

drop trigger if exists enforce_therapist_booking_update on public.bookings;
create trigger enforce_therapist_booking_update
  before update on public.bookings
  for each row
  execute function private.enforce_therapist_booking_update();

comment on function private.enforce_therapist_booking_update()
  is 'Dashboard guard: admin can update bookings freely; therapists can only change status/internal_notes on bookings visible to them through RLS.';

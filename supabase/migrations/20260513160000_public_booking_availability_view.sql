-- Safe public availability projection.
-- Exposes only scheduling fields needed by the public booking flow.
-- Full bookings remain protected from anon SELECT.

drop view if exists public.public_booking_availability;

grant select (
  preferred_date,
  preferred_time,
  therapist_id,
  service,
  duration_minutes,
  status
) on table public.bookings to anon;

drop policy if exists "Anon users can select booking availability" on public.bookings;
create policy "Anon users can select booking availability"
  on public.bookings
  for select
  to anon
  using (
    status in ('pending'::public.booking_status, 'confirmed'::public.booking_status)
    and therapist_id is not null
  );

create view public.public_booking_availability
with (security_invoker = true)
as
select
  bookings.preferred_date as booking_date,
  bookings.preferred_time,
  bookings.therapist_id,
  bookings.service as service_slug,
  coalesce(bookings.duration_minutes, services.duration_minutes, 60) as duration_minutes,
  bookings.status
from public.bookings
left join public.services on services.slug = bookings.service
where bookings.status in ('pending'::public.booking_status, 'confirmed'::public.booking_status)
  and bookings.therapist_id is not null;

revoke all on table public.public_booking_availability from anon, authenticated;
grant select on table public.public_booking_availability to anon, authenticated;

comment on view public.public_booking_availability
  is 'Safe scheduling projection for public availability. Does not expose client identity, phone, comments, or internal notes.';

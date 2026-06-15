-- Staff-safe client picker for manual dashboard bookings.
-- Keeps the full Clients CRM page admin-only while allowing therapists to select existing clients in booking flow.

create or replace function public.list_dashboard_booking_clients()
returns table (
  id uuid,
  name text,
  phone text,
  instagram_username text,
  telegram_username text,
  whatsapp_phone text,
  viber_phone text,
  primary_contact_channel text,
  primary_contact_value text,
  locale text,
  notes text
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    clients.id,
    clients.name,
    clients.phone,
    clients.instagram_username,
    clients.telegram_username,
    clients.whatsapp_phone,
    clients.viber_phone,
    clients.primary_contact_channel,
    clients.primary_contact_value,
    clients.locale,
    clients.notes
  from public.clients
  where (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'therapist')
  order by clients.updated_at desc nulls last, clients.created_at desc;
$$;

revoke all on function public.list_dashboard_booking_clients() from public;
grant execute on function public.list_dashboard_booking_clients() to authenticated;

comment on function public.list_dashboard_booking_clients()
  is 'Returns minimal client picker fields to authenticated dashboard staff for manual booking creation. Full Clients CRM remains admin-only through route checks and clients table RLS.';

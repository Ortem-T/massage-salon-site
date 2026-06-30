-- Enable Supabase Realtime Postgres Changes for dashboard calendar data.
-- RLS policies remain the security boundary for which rows authenticated users can receive.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'bookings'
    ) then
      alter publication supabase_realtime add table public.bookings;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'schedule_blocks'
    ) then
      alter publication supabase_realtime add table public.schedule_blocks;
    end if;
  end if;
end $$;

comment on table public.bookings
  is 'Booking requests and dashboard bookings. Included in supabase_realtime for authenticated dashboard calendar refresh; RLS controls row visibility.';

comment on table public.schedule_blocks
  is 'Internal dashboard schedule and availability blocks. Included in supabase_realtime for authenticated dashboard calendar refresh; RLS controls row visibility.';

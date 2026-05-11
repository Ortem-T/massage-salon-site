create type public.booking_status as enum (
  'pending',
  'confirmed',
  'cancelled',
  'completed'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service text not null,
  specialist text not null,
  preferred_date date not null,
  preferred_time text not null,
  client_name text not null,
  client_phone text not null,
  client_comment text,
  locale text not null check (locale in ('sr', 'ru', 'en')),
  status public.booking_status not null default 'pending',
  source text not null default 'website'
);

alter table public.bookings enable row level security;

revoke all on table public.bookings from anon;
grant insert on table public.bookings to anon;

create policy "Anon users can insert booking requests"
  on public.bookings
  for insert
  to anon
  with check (
    status = 'pending'
    and source = 'website'
    and locale in ('sr', 'ru', 'en')
  );

-- No SELECT, UPDATE, or DELETE policies are defined for anon users.

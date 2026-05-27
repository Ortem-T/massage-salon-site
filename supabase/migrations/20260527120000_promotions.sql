-- Admin-managed homepage promotion cards.
-- Adds a public active promotion surface and admin-only dashboard management.

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

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  active boolean not null default false,
  placement text not null default 'booking_section_card',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_placement_check check (placement in ('booking_section_card')),
  constraint promotions_date_range_check check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create table if not exists public.promotion_translations (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  locale text not null check (locale in ('sr', 'ru', 'en')),
  badge text,
  title text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotion_translations_unique unique (promotion_id, locale)
);

alter table public.bookings
  add column if not exists promotion_id uuid references public.promotions(id) on delete set null,
  add column if not exists promotion_snapshot_title text,
  add column if not exists promotion_snapshot_description text;

create index if not exists promotions_public_lookup_idx
  on public.promotions(placement, active, updated_at desc, created_at desc);

create index if not exists promotion_translations_promotion_locale_idx
  on public.promotion_translations(promotion_id, locale);

create index if not exists bookings_promotion_id_idx
  on public.bookings(promotion_id);

drop trigger if exists set_promotions_updated_at on public.promotions;
create trigger set_promotions_updated_at
  before update on public.promotions
  for each row
  execute function private.set_updated_at();

drop trigger if exists set_promotion_translations_updated_at on public.promotion_translations;
create trigger set_promotion_translations_updated_at
  before update on public.promotion_translations
  for each row
  execute function private.set_updated_at();

alter table public.promotions enable row level security;
alter table public.promotion_translations enable row level security;

revoke all on table public.promotions from anon, authenticated;
revoke all on table public.promotion_translations from anon, authenticated;

grant select on table public.promotions to anon, authenticated;
grant select on table public.promotion_translations to anon, authenticated;
grant insert, update, delete on table public.promotions to authenticated;
grant insert, update, delete on table public.promotion_translations to authenticated;

drop policy if exists "Public can select active booking section promotions" on public.promotions;
create policy "Public can select active booking section promotions"
  on public.promotions
  for select
  to anon, authenticated
  using (
    active = true
    and placement = 'booking_section_card'
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );

drop policy if exists "Admin users can select promotions" on public.promotions;
create policy "Admin users can select promotions"
  on public.promotions
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can insert promotions" on public.promotions;
create policy "Admin users can insert promotions"
  on public.promotions
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can update promotions" on public.promotions;
create policy "Admin users can update promotions"
  on public.promotions
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can delete promotions" on public.promotions;
create policy "Admin users can delete promotions"
  on public.promotions
  for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Public can select active promotion translations" on public.promotion_translations;
create policy "Public can select active promotion translations"
  on public.promotion_translations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.promotions
      where promotions.id = promotion_translations.promotion_id
        and promotions.active = true
        and promotions.placement = 'booking_section_card'
        and (promotions.starts_at is null or promotions.starts_at <= now())
        and (promotions.ends_at is null or promotions.ends_at >= now())
    )
  );

drop policy if exists "Admin users can select promotion translations" on public.promotion_translations;
create policy "Admin users can select promotion translations"
  on public.promotion_translations
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can insert promotion translations" on public.promotion_translations;
create policy "Admin users can insert promotion translations"
  on public.promotion_translations
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can update promotion translations" on public.promotion_translations;
create policy "Admin users can update promotion translations"
  on public.promotion_translations
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can delete promotion translations" on public.promotion_translations;
create policy "Admin users can delete promotion translations"
  on public.promotion_translations
  for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

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

drop trigger if exists enforce_therapist_booking_update on public.bookings;
create trigger enforce_therapist_booking_update
  before update on public.bookings
  for each row
  execute function private.enforce_therapist_booking_update();

with existing as (
  select id
  from public.promotions
  where placement = 'booking_section_card'
  order by created_at asc
  limit 1
),
inserted as (
  insert into public.promotions (
    active,
    placement
  )
  select
    true,
    'booking_section_card'
  where not exists (select 1 from existing)
  returning id
),
target_promotion as (
  select id from inserted
  union all
  select id from existing
  limit 1
),
translation_rows(locale, badge, title, description) as (
  values
    (
      'ru',
      'Акция',
      'Скидка 20% на первый массаж',
      'Для новых клиентов при первой записи. Цены на сайте указаны без учета акции — финальную стоимость подтвердим в сообщении.'
    ),
    (
      'sr',
      'Akcija',
      '20% popusta na prvu masažu',
      'Za nove klijente pri prvom zakazivanju. Cene na sajtu su prikazane bez popusta — konačnu cenu potvrdićemo u poruci.'
    ),
    (
      'en',
      'Offer',
      '20% off your first massage',
      'For new clients on their first booking. Prices on the website are shown before the discount — we will confirm the final price by message.'
    )
)
insert into public.promotion_translations (
  promotion_id,
  locale,
  badge,
  title,
  description
)
select
  target_promotion.id,
  translation_rows.locale,
  translation_rows.badge,
  translation_rows.title,
  translation_rows.description
from target_promotion
cross join translation_rows
on conflict (promotion_id, locale) do update
  set badge = excluded.badge,
      title = excluded.title,
      description = excluded.description;

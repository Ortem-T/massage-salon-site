-- Public therapist catalog with localized display names for booking.

create table if not exists public.therapist_translations (
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  locale text not null check (locale in ('sr', 'ru', 'en')),
  display_name text not null,
  public_title text,
  primary key (therapist_id, locale)
);

create index if not exists therapist_translations_locale_idx
  on public.therapist_translations(locale);

alter table public.therapists enable row level security;
alter table public.therapist_translations enable row level security;

grant select on table public.therapists to anon, authenticated;
grant select on table public.therapist_translations to anon, authenticated;
grant insert, update on table public.therapist_translations to authenticated;

drop policy if exists "Anon users can select active therapists" on public.therapists;
create policy "Anon users can select active therapists"
  on public.therapists
  for select
  to anon
  using (active = true);

drop policy if exists "Dashboard staff can select active therapists" on public.therapists;
create policy "Dashboard staff can select active therapists"
  on public.therapists
  for select
  to authenticated
  using (
    active = true
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'therapist')
  );

drop policy if exists "Anon users can select active therapist translations" on public.therapist_translations;
create policy "Anon users can select active therapist translations"
  on public.therapist_translations
  for select
  to anon
  using (
    exists (
      select 1
      from public.therapists
      where therapists.id = therapist_translations.therapist_id
        and therapists.active = true
    )
  );

drop policy if exists "Dashboard staff can select active therapist translations" on public.therapist_translations;
create policy "Dashboard staff can select active therapist translations"
  on public.therapist_translations
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'therapist')
    and exists (
      select 1
      from public.therapists
      where therapists.id = therapist_translations.therapist_id
        and therapists.active = true
    )
  );

drop policy if exists "Admin users can insert therapist translations" on public.therapist_translations;
create policy "Admin users can insert therapist translations"
  on public.therapist_translations
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can update therapist translations" on public.therapist_translations;
create policy "Admin users can update therapist translations"
  on public.therapist_translations
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

with translation_rows(display_name, locale, localized_name, public_title) as (
  values
    ('Ekaterina', 'sr', 'Ekaterina', 'Masažni terapeut'),
    ('Ekaterina', 'ru', 'Екатерина', 'Массажист'),
    ('Ekaterina', 'en', 'Ekaterina', 'Massage therapist'),
    ('Sergey', 'sr', 'Sergej', 'Masažni terapeut'),
    ('Sergey', 'ru', 'Сергей', 'Массажист'),
    ('Sergey', 'en', 'Sergey', 'Massage therapist')
)
insert into public.therapist_translations (
  therapist_id,
  locale,
  display_name,
  public_title
)
select
  therapists.id,
  translation_rows.locale,
  translation_rows.localized_name,
  translation_rows.public_title
from translation_rows
join public.therapists on therapists.display_name = translation_rows.display_name
on conflict (therapist_id, locale) do update
  set display_name = excluded.display_name,
      public_title = excluded.public_title;

-- Real service catalog with localized translations.
-- The 6-treatment course remains a normal bookable service for the MVP.

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

alter table public.services
  add column if not exists category text not null default 'body',
  add column if not exists bookable_online boolean not null default true,
  add column if not exists sort_order int not null default 0,
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'services_category_check'
      and conrelid = 'public.services'::regclass
  ) then
    alter table public.services
      add constraint services_category_check
      check (category in ('face', 'body'));
  end if;
end;
$$;

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
  before update on public.services
  for each row
  execute function private.set_updated_at();

create table if not exists public.service_translations (
  service_id uuid not null references public.services(id) on delete cascade,
  locale text not null check (locale in ('sr', 'ru', 'en')),
  name text not null,
  short_description text not null,
  description text,
  primary key (service_id, locale)
);

create index if not exists services_public_catalog_idx
  on public.services(active, bookable_online, category, sort_order);

create index if not exists service_translations_locale_idx
  on public.service_translations(locale);

alter table public.services enable row level security;
alter table public.service_translations enable row level security;

revoke all on table public.services from anon, authenticated;
revoke all on table public.service_translations from anon, authenticated;

grant select on table public.services to anon, authenticated;
grant select on table public.service_translations to anon, authenticated;
grant insert, update on table public.services to authenticated;
grant insert, update on table public.service_translations to authenticated;

drop policy if exists "Anon users can select online services" on public.services;
create policy "Anon users can select online services"
  on public.services
  for select
  to anon
  using (active = true and bookable_online = true);

drop policy if exists "Dashboard staff can select active services" on public.services;
create policy "Dashboard staff can select active services"
  on public.services
  for select
  to authenticated
  using (
    active = true
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'therapist')
  );

drop policy if exists "Admin users can insert services" on public.services;
create policy "Admin users can insert services"
  on public.services
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can update services" on public.services;
create policy "Admin users can update services"
  on public.services
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Anon users can select online service translations" on public.service_translations;
create policy "Anon users can select online service translations"
  on public.service_translations
  for select
  to anon
  using (
    exists (
      select 1
      from public.services
      where services.id = service_translations.service_id
        and services.active = true
        and services.bookable_online = true
    )
  );

drop policy if exists "Dashboard staff can select active service translations" on public.service_translations;
create policy "Dashboard staff can select active service translations"
  on public.service_translations
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'therapist')
    and exists (
      select 1
      from public.services
      where services.id = service_translations.service_id
        and services.active = true
    )
  );

drop policy if exists "Admin users can insert service translations" on public.service_translations;
create policy "Admin users can insert service translations"
  on public.service_translations
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can update service translations" on public.service_translations;
create policy "Admin users can update service translations"
  on public.service_translations
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

with service_rows(slug, category, duration_minutes, price_rsd, active, bookable_online, sort_order) as (
  values
    ('face-massage', 'face', 60, 2500, true, true, 10),
    ('face-massage-serum-lamp', 'face', 90, 3000, true, true, 20),
    ('facial-microcurrents', 'face', 45, 3000, true, true, 30),
    ('face-course-6-treatments', 'face', 60, 15000, true, true, 40),
    ('relaxing-aroma-massage', 'body', 60, 3500, true, true, 50),
    ('sports-anti-cellulite-lymphatic-60', 'body', 60, 4000, true, true, 60),
    ('sports-anti-cellulite-lymphatic-90', 'body', 90, 5000, true, true, 70),
    ('full-body-sports-massage-120', 'body', 120, 6000, true, true, 80),
    ('taping-application', 'body', 30, 500, true, true, 90)
),
upserted_services as (
  insert into public.services (
    slug,
    category,
    duration_minutes,
    price_rsd,
    active,
    bookable_online,
    sort_order
  )
  select
    slug,
    category,
    duration_minutes,
    price_rsd,
    active,
    bookable_online,
    sort_order
  from service_rows
  on conflict (slug) do update
    set category = excluded.category,
        duration_minutes = excluded.duration_minutes,
        price_rsd = excluded.price_rsd,
        active = excluded.active,
        bookable_online = excluded.bookable_online,
        sort_order = excluded.sort_order,
        updated_at = now()
  returning id, slug
),
translation_rows(slug, locale, name, short_description) as (
  values
    ('face-massage', 'ru', 'Массаж лица', 'Расслабляющий массаж лица, шеи и зоны декольте для свежести, снятия напряжения и мягкого лифтинг-эффекта.'),
    ('face-massage', 'sr', 'Masaža lica', 'Opuštajuća masaža lica, vrata i dekoltea za svežinu, oslobađanje napetosti i blagi lifting efekat.'),
    ('face-massage', 'en', 'Face Massage', 'A relaxing massage for the face, neck and décolleté to refresh the skin, release tension and create a soft lifting effect.'),
    ('face-massage-serum-lamp', 'ru', 'Массаж лица + сыворотка + лампа', 'Уходовая процедура с массажем лица, активной сывороткой и LED-лампой для более сияющего и ухоженного вида кожи.'),
    ('face-massage-serum-lamp', 'sr', 'Masaža lica + serum + lampa', 'Nega lica sa masažom, aktivnim serumom i LED lampom za blistaviji i negovaniji izgled kože.'),
    ('face-massage-serum-lamp', 'en', 'Face Massage + Serum + Lamp', 'A facial care ritual with massage, active serum and LED lamp for a more radiant and well-groomed skin appearance.'),
    ('facial-microcurrents', 'ru', 'Микротоки лица', 'Аппаратная процедура для тонуса кожи лица, мягкого лифтинг-эффекта и более свежего внешнего вида.'),
    ('facial-microcurrents', 'sr', 'Mikrostrujna terapija lica', 'Aparatna procedura za tonus kože lica, blagi lifting efekat i svežiji izgled.'),
    ('facial-microcurrents', 'en', 'Facial Microcurrents', 'A device-based facial treatment designed to support skin tone, a soft lifting effect and a fresher appearance.'),
    ('face-course-6-treatments', 'ru', 'Курс 6 процедур', 'Комплексный курс из 6 процедур: 3 массажа лица и 3 процедуры микротоков. Даты следующих визитов назначаются индивидуально.'),
    ('face-course-6-treatments', 'sr', 'Kurs od 6 tretmana', 'Kombinovani kurs od 6 tretmana: 3 masaže lica i 3 mikrostrujne procedure. Termini narednih dolazaka dogovaraju se individualno.'),
    ('face-course-6-treatments', 'en', 'Course of 6 Treatments', 'A combined course of 6 treatments: 3 face massages and 3 microcurrent sessions. Future appointment dates are arranged individually.'),
    ('relaxing-aroma-massage', 'ru', 'Релакс / аромамассаж', 'Мягкий расслабляющий массаж с акцентом на снятие стресса, восстановление спокойствия и общее ощущение легкости.'),
    ('relaxing-aroma-massage', 'sr', 'Relax / aroma masaža', 'Blaga opuštajuća masaža usmerena na smanjenje stresa, vraćanje mira i osećaj lakoće u telu.'),
    ('relaxing-aroma-massage', 'en', 'Relaxing / Aroma Massage', 'A gentle relaxing massage focused on stress relief, calmness and a lighter feeling in the body.'),
    ('sports-anti-cellulite-lymphatic-60', 'ru', 'Спортивный / антицеллюлитный / лимфодренажный массаж — 60 мин', 'Интенсивный массаж по выбранному направлению: спортивный, антицеллюлитный или лимфодренажный. Подходит для работы с тонусом и напряжением тела.'),
    ('sports-anti-cellulite-lymphatic-60', 'sr', 'Sportska / anticelulit / limfna drenaža masaža — 60 min', 'Intenzivna masaža po izabranom tipu: sportska, anticelulit ili limfna drenaža. Pogodna za rad na tonusu i napetosti tela.'),
    ('sports-anti-cellulite-lymphatic-60', 'en', 'Sports / Anti-cellulite / Lymphatic Drainage Massage — 60 min', 'An intensive massage based on the selected focus: sports, anti-cellulite or lymphatic drainage. Suitable for body tone and tension work.'),
    ('sports-anti-cellulite-lymphatic-90', 'ru', 'Спортивный / антицеллюлитный / лимфодренажный массаж — 90 мин', 'Увеличенная по времени процедура для более глубокой и детальной проработки тела по выбранному направлению.'),
    ('sports-anti-cellulite-lymphatic-90', 'sr', 'Sportska / anticelulit / limfna drenaža masaža — 90 min', 'Produženi tretman za dublji i detaljniji rad na telu prema izabranom tipu masaže.'),
    ('sports-anti-cellulite-lymphatic-90', 'en', 'Sports / Anti-cellulite / Lymphatic Drainage Massage — 90 min', 'An extended session for deeper and more detailed body work based on the selected massage focus.'),
    ('full-body-sports-massage-120', 'ru', 'Спортивный массаж всего тела', 'Двухчасовой спортивный массаж всего тела для глубокой проработки мышц, восстановления и снятия накопленного напряжения.'),
    ('full-body-sports-massage-120', 'sr', 'Sportska masaža celog tela', 'Dvočasovna sportska masaža celog tela za dubinski rad na mišićima, oporavak i oslobađanje nakupljene napetosti.'),
    ('full-body-sports-massage-120', 'en', 'Full Body Sports Massage', 'A two-hour full body sports massage for deep muscle work, recovery and release of accumulated tension.'),
    ('taping-application', 'ru', 'Тейпирование', 'Одна аппликация тейпа для поддержки выбранной зоны тела, снижения дискомфорта и помощи в восстановлении после нагрузки.'),
    ('taping-application', 'sr', 'Tejping', 'Jedna aplikacija tejpa za podršku izabranoj zoni tela, smanjenje nelagodnosti i pomoć u oporavku nakon opterećenja.'),
    ('taping-application', 'en', 'Taping', 'One tape application to support a selected body area, reduce discomfort and assist recovery after physical load.')
)
insert into public.service_translations (
  service_id,
  locale,
  name,
  short_description
)
select
  services.id,
  translation_rows.locale,
  translation_rows.name,
  translation_rows.short_description
from translation_rows
join upserted_services as services using (slug)
on conflict (service_id, locale) do update
  set name = excluded.name,
      short_description = excluded.short_description;

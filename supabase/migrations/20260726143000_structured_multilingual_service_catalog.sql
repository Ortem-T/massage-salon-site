-- Structured multilingual service catalog categories and beauty service expansion.
-- Booking rows keep service snapshots only; category remains derived from services.

alter table public.services
  add column if not exists show_duration_publicly boolean not null default true;

alter table public.services
  drop constraint if exists services_category_check;

update public.services
set category = case
    when category = 'face' then 'face_care'
    when category = 'body' then 'massage'
    else category
  end,
  updated_at = now()
where category in ('face', 'body');

update public.services
set category = 'face_care',
    updated_at = now()
where slug in (
  'face-massage',
  'face-massage-serum-lamp',
  'facial-microcurrents',
  'face-course-6-treatments'
);

update public.services
set category = 'massage',
    updated_at = now()
where slug in (
  'relax-aroma-massage',
  'relaxing-aroma-massage',
  'anti-cellulite-massage-60',
  'anti-cellulite-massage-90',
  'lymphatic-drainage-massage-60',
  'lymphatic-drainage-massage-90',
  'womens-sports-massage',
  'mens-sports-massage',
  'womens-full-body-sports-massage',
  'mens-full-body-sports-massage',
  'sports-anti-cellulite-lymphatic-60',
  'sports-anti-cellulite-lymphatic-90',
  'full-body-sports-massage-120',
  'device-lymphatic-drainage-one-zone',
  'device-lymphatic-drainage-course-12',
  'taping-application'
);

alter table public.services
  add constraint services_category_check
  check (category in ('massage', 'face_care', 'brows_lashes', 'permanent_makeup'));

update public.services
set active = false,
    bookable_online = false,
    updated_at = now()
where slug in (
  'anti-cellulite-massage-90',
  'womens-full-body-sports-massage-120'
);

with translation_rows(slug, locale, name, short_description) as (
  values
    ('face-course-6-treatments', 'sr', 'Kurs mikrostruja (6 tretmana)', 'Kurs mikrostrujnih tretmana za tonus, svežinu i ujednačeniji izgled kože lica.'),
    ('face-course-6-treatments', 'ru', 'Курс микротоков (6 процедур)', 'Курс микротоковых процедур для тонуса, свежести и более ровного вида кожи лица.'),
    ('face-course-6-treatments', 'en', 'Microcurrent course (6 sessions)', 'A course of microcurrent treatments for facial tone, freshness and a more balanced skin appearance.')
),
target_services as (
  select id, slug
  from public.services
  where slug in (select slug from translation_rows)
)
insert into public.service_translations (
  service_id,
  locale,
  name,
  short_description
)
select target_services.id, translation_rows.locale, translation_rows.name, translation_rows.short_description
from translation_rows
join target_services using (slug)
on conflict (service_id, locale) do update
  set name = excluded.name,
      short_description = excluded.short_description;

with service_rows(slug, category, duration_minutes, show_duration_publicly, price_rsd, active, bookable_online, sort_order) as (
  values
    ('lash-lamination-tinting', 'brows_lashes', 120, false, 2500, true, false, 310),
    ('brow-lamination-tinting', 'brows_lashes', 120, false, 2000, true, false, 320),
    ('brow-lash-lamination', 'brows_lashes', 120, false, 3500, true, false, 330),
    ('brow-shaping-tweezers', 'brows_lashes', 120, false, 600, true, false, 340),
    ('brow-tinting', 'brows_lashes', 120, false, 600, true, false, 350),
    ('lash-tinting', 'brows_lashes', 120, false, 600, true, false, 360),
    ('powder-brows-permanent-makeup-initial', 'permanent_makeup', 120, false, 10000, true, false, 410),
    ('powder-brows-permanent-makeup-correction', 'permanent_makeup', 120, false, 5000, true, false, 420),
    ('powder-brows-permanent-makeup-refresh', 'permanent_makeup', 120, false, 7000, true, false, 430),
    ('lip-permanent-makeup-initial', 'permanent_makeup', 120, false, 10000, true, false, 440),
    ('lip-permanent-makeup-correction', 'permanent_makeup', 120, false, 5000, true, false, 450),
    ('lip-permanent-makeup-refresh', 'permanent_makeup', 120, false, 7000, true, false, 460),
    ('lash-line-permanent-makeup-initial', 'permanent_makeup', 120, false, 6000, true, false, 470),
    ('lash-line-permanent-makeup-correction', 'permanent_makeup', 120, false, 3000, true, false, 480),
    ('lash-line-permanent-makeup-refresh', 'permanent_makeup', 120, false, 4000, true, false, 490)
)
insert into public.services (
  slug,
  category,
  duration_minutes,
  show_duration_publicly,
  price_rsd,
  active,
  bookable_online,
  sort_order
)
select
  slug,
  category,
  duration_minutes,
  show_duration_publicly,
  price_rsd,
  active,
  bookable_online,
  sort_order
from service_rows
on conflict (slug) do update
  set category = excluded.category,
      duration_minutes = excluded.duration_minutes,
      show_duration_publicly = excluded.show_duration_publicly,
      price_rsd = excluded.price_rsd,
      active = excluded.active,
      bookable_online = excluded.bookable_online,
      sort_order = excluded.sort_order,
      updated_at = now();

with translation_rows(slug, locale, name, short_description, description) as (
  values
    ('lash-lamination-tinting', 'sr', 'Laminacija trepavica sa bojenjem', 'Nežan tretman za naglašene, uredne i tamnije trepavice bez svakodnevnog uvijanja.', null),
    ('lash-lamination-tinting', 'ru', 'Ламинирование ресниц с окрашиванием', 'Деликатная процедура для выразительных, аккуратных и более темных ресниц без ежедневного завивания.', null),
    ('lash-lamination-tinting', 'en', 'Lash lamination with tinting', 'A gentle treatment for lifted, neat and darker lashes without daily curling.', null),
    ('brow-lamination-tinting', 'sr', 'Laminacija obrva sa bojenjem', 'Uredne, negovane obrve sa mekšim oblikom, bojenjem i prirodnim završetkom.', null),
    ('brow-lamination-tinting', 'ru', 'Ламинирование бровей с окрашиванием', 'Аккуратные ухоженные брови с мягкой формой, окрашиванием и естественным финишем.', null),
    ('brow-lamination-tinting', 'en', 'Brow lamination with tinting', 'Neat, polished brows with soft shaping, tinting and a natural finish.', null),
    ('brow-lash-lamination', 'sr', 'Laminacija obrva i trepavica', 'Kompletan tretman za skladniji pogled: laminacija obrva i trepavica u jednom dolasku.', null),
    ('brow-lash-lamination', 'ru', 'Ламинирование бровей и ресниц', 'Комплексная процедура для гармоничного взгляда: ламинирование бровей и ресниц за один визит.', null),
    ('brow-lash-lamination', 'en', 'Brow and lash lamination', 'A complete treatment for a softer, balanced look: brow and lash lamination in one visit.', null),
    ('brow-shaping-tweezers', 'sr', 'Oblikovanje obrva pincetom', 'Precizno oblikovanje obrva pincetom za čist i prirodan rezultat.', null),
    ('brow-shaping-tweezers', 'ru', 'Коррекция бровей пинцетом', 'Точная коррекция бровей пинцетом для чистой формы и естественного результата.', null),
    ('brow-shaping-tweezers', 'en', 'Brow shaping with tweezers', 'Precise tweezer shaping for clean brows and a natural result.', null),
    ('brow-tinting', 'sr', 'Bojenje obrva', 'Blago bojenje za izraženiji oblik obrva i uredan svakodnevni izgled.', null),
    ('brow-tinting', 'ru', 'Окрашивание бровей', 'Мягкое окрашивание для более выразительной формы бровей и аккуратного ежедневного вида.', null),
    ('brow-tinting', 'en', 'Brow tinting', 'Soft tinting for more defined brows and a polished everyday look.', null),
    ('lash-tinting', 'sr', 'Bojenje trepavica', 'Bojenje trepavica za tamniji, naglašeniji izgled bez maskare.', null),
    ('lash-tinting', 'ru', 'Окрашивание ресниц', 'Окрашивание ресниц для более темного и выразительного вида без туши.', null),
    ('lash-tinting', 'en', 'Lash tinting', 'Lash tinting for a darker, more defined look without mascara.', null),
    ('powder-brows-permanent-makeup-initial', 'sr', 'Obrve — tehnika puder senčenja', 'Početni tretman obrva tehnikom puder senčenja za meko definisan i prirodan izgled.', 'Korekcija i refresh planiraju se prema stanju pigmenta i individualnom planu.'),
    ('powder-brows-permanent-makeup-initial', 'ru', 'Брови (в технике пудровое напыление)', 'Первичная процедура для мягко оформленных бровей в технике пудрового напыления.', 'Коррекция и рефреш подбираются по состоянию пигмента и индивидуальному плану.'),
    ('powder-brows-permanent-makeup-initial', 'en', 'Brows — powder shading technique', 'Initial brow treatment using the powder shading technique for a softly defined, natural look.', 'Correction and refresh timing are planned according to pigment condition and individual needs.'),
    ('powder-brows-permanent-makeup-correction', 'sr', 'Obrve — korekcija puder senčenja', 'Korekcija obrva nakon početnog tretmana tehnikom puder senčenja.', null),
    ('powder-brows-permanent-makeup-correction', 'ru', 'Брови (в технике пудровое напыление) — коррекция', 'Коррекция бровей после первичной процедуры в технике пудрового напыления.', null),
    ('powder-brows-permanent-makeup-correction', 'en', 'Brows — powder shading technique — correction', 'Brow correction after the initial powder shading treatment.', null),
    ('powder-brows-permanent-makeup-refresh', 'sr', 'Obrve — refresh puder senčenja', 'Refresh obrva za obnovu boje i urednog izgleda tehnikom puder senčenja.', null),
    ('powder-brows-permanent-makeup-refresh', 'ru', 'Брови (в технике пудровое напыление) — рефреш', 'Рефреш бровей для обновления цвета и аккуратного вида в технике пудрового напыления.', null),
    ('powder-brows-permanent-makeup-refresh', 'en', 'Brows — powder shading technique — refresh', 'Brow refresh to restore color and a polished look using the powder shading technique.', null),
    ('lip-permanent-makeup-initial', 'sr', 'Usne — permanentni make-up', 'Početni tretman permanentnog make-upa usana za nežniji ton i definisaniju konturu.', 'Korekcija i osvežavanje zakazuju se prema stanju pigmenta i individualnom planu.'),
    ('lip-permanent-makeup-initial', 'ru', 'Губы — перманентный макияж', 'Первичная процедура перманентного макияжа губ для мягкого тона и более четкого контура.', 'Коррекция и обновление подбираются по состоянию пигмента и индивидуальному плану.'),
    ('lip-permanent-makeup-initial', 'en', 'Lips — permanent makeup', 'Initial lip permanent makeup for softer color and more defined contours.', 'Correction and refresh timing are planned according to pigment condition and individual needs.'),
    ('lip-permanent-makeup-correction', 'sr', 'Usne — korekcija', 'Korekcija permanentnog make-upa usana nakon početnog tretmana.', null),
    ('lip-permanent-makeup-correction', 'ru', 'Губы — коррекция', 'Коррекция перманентного макияжа губ после первичной процедуры.', null),
    ('lip-permanent-makeup-correction', 'en', 'Lips — correction', 'Lip permanent makeup correction after the initial treatment.', null),
    ('lip-permanent-makeup-refresh', 'sr', 'Usne — osvežavanje', 'Osvežavanje permanentnog make-upa usana za obnovu tona i urednog izgleda.', null),
    ('lip-permanent-makeup-refresh', 'ru', 'Губы — обновление', 'Обновление перманентного макияжа губ для восстановления тона и аккуратного вида.', null),
    ('lip-permanent-makeup-refresh', 'en', 'Lips — refresh', 'Lip permanent makeup refresh to restore tone and a polished look.', null),
    ('lash-line-permanent-makeup-initial', 'sr', 'Permanentni make-up međutrepavičnog prostora — prvi tretman', 'Početni tretman međutrepavičnog prostora za suptilno naglašen pogled uz rad samo između trepavica.', 'Korekcija i refresh planiraju se prema stanju pigmenta i individualnom planu.'),
    ('lash-line-permanent-makeup-initial', 'ru', 'Перманентный макияж межресничного пространства', 'Первичная процедура для деликатного акцента по межресничному пространству без выхода за естественную линию ресниц.', 'Коррекция и рефреш подбираются по состоянию пигмента и индивидуальному плану.'),
    ('lash-line-permanent-makeup-initial', 'en', 'Interlash-space permanent makeup — initial treatment', 'Initial interlash-space treatment for subtle definition, working only between the lashes.', 'Correction and refresh timing are planned according to pigment condition and individual needs.'),
    ('lash-line-permanent-makeup-correction', 'sr', 'Permanentni make-up međutrepavičnog prostora — korekcija', 'Korekcija međutrepavičnog prostora nakon početnog tretmana.', null),
    ('lash-line-permanent-makeup-correction', 'ru', 'Перманентный макияж межресничного пространства — коррекция', 'Коррекция межресничного пространства после первичной процедуры.', null),
    ('lash-line-permanent-makeup-correction', 'en', 'Interlash-space permanent makeup — correction', 'Interlash-space correction after the initial treatment.', null),
    ('lash-line-permanent-makeup-refresh', 'sr', 'Permanentni make-up međutrepavičnog prostora — refresh', 'Refresh međutrepavičnog prostora za obnovu jasnoće i urednog izgleda.', null),
    ('lash-line-permanent-makeup-refresh', 'ru', 'Перманентный макияж межресничного пространства — рефреш', 'Рефреш межресничного пространства для обновления четкости и аккуратного вида.', null),
    ('lash-line-permanent-makeup-refresh', 'en', 'Interlash-space permanent makeup — refresh', 'Interlash-space refresh to restore definition and a polished look.', null)
),
target_services as (
  select id, slug
  from public.services
  where slug in (select slug from translation_rows)
)
insert into public.service_translations (
  service_id,
  locale,
  name,
  short_description,
  description
)
select
  target_services.id,
  translation_rows.locale,
  translation_rows.name,
  translation_rows.short_description,
  translation_rows.description
from translation_rows
join target_services using (slug)
on conflict (service_id, locale) do update
  set name = excluded.name,
      short_description = excluded.short_description,
      description = excluded.description;

-- Correct current service catalog records while preserving existing IDs,
-- therapist assignments, booking history and legacy snapshots.

update public.services
set category = 'massage',
    duration_minutes = 90,
    price_rsd = 5000,
    active = true,
    bookable_online = true,
    show_duration_publicly = true,
    updated_at = now()
where slug = 'womens-full-body-sports-massage';

with translation_rows(slug, locale, name, short_description, description) as (
  values
    ('womens-full-body-sports-massage', 'sr', 'Sportska masaža celog tela za žene', 'Sportska masaža celog tela prilagođena ženama, za rad sa mišićnom napetošću, oporavak i osećaj lakoće.', null),
    ('womens-full-body-sports-massage', 'ru', 'Женский спортивный массаж всего тела', 'Спортивный массаж всего тела для женщин: работа с мышечным напряжением, восстановлением после нагрузки и ощущением легкости.', null),
    ('womens-full-body-sports-massage', 'en', 'Women''s full-body sports massage', 'A full-body sports massage tailored for women, focused on muscle tension, recovery and a lighter feeling in the body.', null),

    ('powder-brows-permanent-makeup-initial', 'sr', 'Obrve — tehnika puder senčenja', 'Početni tretman obrva tehnikom puder senčenja za meko definisan i prirodan izgled.', 'Korekcija i refresh planiraju se prema stanju pigmenta i individualnom planu.'),
    ('powder-brows-permanent-makeup-initial', 'ru', 'Брови (в технике пудровое напыление)', 'Первичная процедура для мягко оформленных бровей в технике пудрового напыления.', 'Коррекция и рефреш подбираются по состоянию пигмента и индивидуальному плану.'),
    ('powder-brows-permanent-makeup-initial', 'en', 'Brows — powder shading technique', 'Initial brow treatment using the powder shading technique for a softly defined, natural look.', 'Correction and refresh timing are planned according to pigment condition and individual needs.'),
    ('powder-brows-permanent-makeup-correction', 'sr', 'Obrve — korekcija puder senčenja', 'Korekcija obrva nakon početnog tretmana tehnikom puder senčenja.', null),
    ('powder-brows-permanent-makeup-correction', 'ru', 'Брови (в технике пудровое напыление) — коррекция', 'Коррекция бровей после первичной процедуры в технике пудрового напыления.', null),
    ('powder-brows-permanent-makeup-correction', 'en', 'Brows — powder shading technique — correction', 'Brow correction after the initial powder shading treatment.', null),
    ('powder-brows-permanent-makeup-refresh', 'sr', 'Obrve — refresh puder senčenja', 'Refresh obrva za obnovu boje i urednog izgleda tehnikom puder senčenja.', null),
    ('powder-brows-permanent-makeup-refresh', 'ru', 'Брови (в технике пудровое напыление) — рефреш', 'Рефреш бровей для обновления цвета и аккуратного вида в технике пудрового напыления.', null),
    ('powder-brows-permanent-makeup-refresh', 'en', 'Brows — powder shading technique — refresh', 'Brow refresh to restore color and a polished look using the powder shading technique.', null),

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

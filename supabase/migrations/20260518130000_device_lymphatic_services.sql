-- Device-based lymphatic drainage body services.
-- The 12-treatment course is treated as a regular first-appointment booking for the MVP.

with service_rows(slug, category, duration_minutes, price_rsd, active, bookable_online, sort_order) as (
  values
    ('device-lymphatic-drainage-one-zone', 'body', 30, 1500, true, true, 95),
    ('device-lymphatic-drainage-course-12', 'body', 30, 15000, true, true, 96)
)
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
      updated_at = now();

with translation_rows(slug, locale, name, short_description, description) as (
  values
    (
      'device-lymphatic-drainage-one-zone',
      'ru',
      'Аппаратный лимфодренаж — одна зона',
      'Процедура на микротоковом аппарате для мягкой работы с ощущением отечности, тяжести и усталости в выбранной зоне тела.',
      'Для более выраженного и устойчивого эффекта обычно рекомендуется курс от 12 процедур.'
    ),
    (
      'device-lymphatic-drainage-one-zone',
      'sr',
      'Aparatna limfna drenaža — jedna zona',
      'Tretman mikrotalasnim aparatom za nežan rad sa osećajem otoka, težine i umora u izabranoj zoni tela.',
      'Za izraženiji i dugotrajniji efekat obično se preporučuje kurs od najmanje 12 tretmana.'
    ),
    (
      'device-lymphatic-drainage-one-zone',
      'en',
      'Device Lymphatic Drainage — One Zone',
      'A microcurrent device treatment for gentle work with the feeling of puffiness, heaviness and fatigue in a selected body area.',
      'For a more noticeable and lasting effect, a course of at least 12 treatments is usually recommended.'
    ),
    (
      'device-lymphatic-drainage-course-12',
      'ru',
      'Аппаратный лимфодренаж — курс 12 процедур',
      'Курс из 12 процедур на микротоковом аппарате для регулярной мягкой работы с ощущением отечности, тяжести и усталости в теле.',
      'Курс оформляется как обычная запись на первую процедуру. Следующие даты админ или специалист назначит вручную.'
    ),
    (
      'device-lymphatic-drainage-course-12',
      'sr',
      'Aparatna limfna drenaža — kurs od 12 tretmana',
      'Kurs od 12 tretmana mikrotalasnim aparatom za redovan i nežan rad sa osećajem otoka, težine i umora u telu.',
      'Kurs se zakazuje kao običan termin za prvi tretman. Naredne termine administrator ili stručnjak dogovara ručno.'
    ),
    (
      'device-lymphatic-drainage-course-12',
      'en',
      'Device Lymphatic Drainage — Course of 12 Treatments',
      'A course of 12 microcurrent device treatments for regular gentle work with the feeling of puffiness, heaviness and body fatigue.',
      'The course is booked as a regular appointment for the first treatment. The following dates are scheduled manually by the admin or specialist.'
    )
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

with allowed(display_name, slug) as (
  values
    ('Sergey', 'device-lymphatic-drainage-one-zone'),
    ('Ekaterina', 'device-lymphatic-drainage-one-zone'),
    ('Sergey', 'device-lymphatic-drainage-course-12'),
    ('Ekaterina', 'device-lymphatic-drainage-course-12')
),
allowed_ids as (
  select therapists.id as therapist_id, services.id as service_id
  from allowed
  join public.therapists on therapists.display_name = allowed.display_name
  join public.services on services.slug = allowed.slug
)
insert into public.therapist_services (
  therapist_id,
  service_id,
  active
)
select therapist_id, service_id, true
from allowed_ids
on conflict (therapist_id, service_id) do update
  set active = true;

-- Update Serbian wording for microcurrent treatments.
-- "Mikrostrujna" better describes microcurrent treatment than "mikrotalasna".

with translation_rows(slug, locale, name, short_description) as (
  values
    (
      'facial-microcurrents',
      'sr',
      'Mikrostrujna terapija lica',
      'Aparatna procedura za tonus kože lica, blagi lifting efekat i svežiji izgled.'
    ),
    (
      'face-course-6-treatments',
      'sr',
      'Kurs od 6 tretmana',
      'Kombinovani kurs od 6 tretmana: 3 masaže lica i 3 mikrostrujne procedure. Termini narednih dolazaka dogovaraju se individualno.'
    ),
    (
      'device-lymphatic-drainage-one-zone',
      'sr',
      'Aparatna limfna drenaža — jedna zona',
      'Tretman mikrostrujnim aparatom za nežan rad sa osećajem otoka, težine i umora u izabranoj zoni tela.'
    ),
    (
      'device-lymphatic-drainage-course-12',
      'sr',
      'Aparatna limfna drenaža — kurs od 12 tretmana',
      'Kurs od 12 tretmana mikrostrujnim aparatom za redovan i nežan rad sa osećajem otoka, težine i umora u telu.'
    )
),
target_services as (
  select id, slug
  from public.services
  where slug in (
    'facial-microcurrents',
    'face-course-6-treatments',
    'device-lymphatic-drainage-one-zone',
    'device-lymphatic-drainage-course-12'
  )
)
insert into public.service_translations (
  service_id,
  locale,
  name,
  short_description
)
select
  target_services.id,
  translation_rows.locale,
  translation_rows.name,
  translation_rows.short_description
from translation_rows
join target_services using (slug)
on conflict (service_id, locale) do update
  set name = excluded.name,
      short_description = excluded.short_description;

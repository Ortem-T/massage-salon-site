-- Rename the taping service while keeping the stable slug and service restrictions unchanged.

with translation_rows(slug, locale, name, short_description) as (
  values
    (
      'taping-application',
      'ru',
      'Тейпирование',
      'Одна аппликация тейпа для поддержки выбранной зоны тела, снижения дискомфорта и помощи в восстановлении после нагрузки.'
    ),
    (
      'taping-application',
      'sr',
      'Tejping',
      'Jedna aplikacija tejpa za podršku izabranoj zoni tela, smanjenje nelagodnosti i pomoć u oporavku nakon opterećenja.'
    ),
    (
      'taping-application',
      'en',
      'Taping',
      'One tape application to support a selected body area, reduce discomfort and assist recovery after physical load.'
    )
),
target_services as (
  select id, slug
  from public.services
  where slug = 'taping-application'
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

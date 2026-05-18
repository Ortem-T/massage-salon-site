-- Updated body service catalog and therapist-service eligibility.
-- Historical bookings are preserved: deprecated service rows are deactivated, not deleted.

create table if not exists public.therapist_services (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint therapist_services_unique unique (therapist_id, service_id)
);

create index if not exists therapist_services_service_active_idx
  on public.therapist_services(service_id, active);

create index if not exists therapist_services_therapist_active_idx
  on public.therapist_services(therapist_id, active);

alter table public.therapist_services enable row level security;

revoke all on table public.therapist_services from anon, authenticated;
grant select on table public.therapist_services to anon, authenticated;
grant insert, update, delete on table public.therapist_services to authenticated;

revoke select on table public.therapists from anon;
grant select (id, display_name, active) on table public.therapists to anon;
grant select on table public.therapists to authenticated;

drop policy if exists "Anon users can select active therapist services" on public.therapist_services;
create policy "Anon users can select active therapist services"
  on public.therapist_services
  for select
  to anon
  using (
    active = true
    and exists (
      select 1
      from public.therapists
      where therapists.id = therapist_services.therapist_id
        and therapists.active = true
    )
    and exists (
      select 1
      from public.services
      where services.id = therapist_services.service_id
        and services.active = true
        and services.bookable_online = true
    )
  );

drop policy if exists "Dashboard staff can select active therapist services" on public.therapist_services;
create policy "Dashboard staff can select active therapist services"
  on public.therapist_services
  for select
  to authenticated
  using (
    active = true
    and (select auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'therapist')
    and exists (
      select 1
      from public.therapists
      where therapists.id = therapist_services.therapist_id
        and therapists.active = true
    )
    and exists (
      select 1
      from public.services
      where services.id = therapist_services.service_id
        and services.active = true
    )
  );

drop policy if exists "Admin users can insert therapist services" on public.therapist_services;
create policy "Admin users can insert therapist services"
  on public.therapist_services
  for insert
  to authenticated
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can update therapist services" on public.therapist_services;
create policy "Admin users can update therapist services"
  on public.therapist_services
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can delete therapist services" on public.therapist_services;
create policy "Admin users can delete therapist services"
  on public.therapist_services
  for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

update public.services
set active = false,
    bookable_online = false,
    updated_at = now()
where slug in (
  'relaxing-aroma-massage',
  'sports-anti-cellulite-lymphatic-60',
  'sports-anti-cellulite-lymphatic-90',
  'full-body-sports-massage-120'
);

with service_rows(slug, category, duration_minutes, price_rsd, active, bookable_online, sort_order) as (
  values
    ('relax-aroma-massage', 'body', 60, 3500, true, true, 50),
    ('anti-cellulite-massage-60', 'body', 60, 4000, true, true, 60),
    ('anti-cellulite-massage-90', 'body', 90, 5000, true, true, 70),
    ('lymphatic-drainage-massage-60', 'body', 60, 4000, true, true, 80),
    ('lymphatic-drainage-massage-90', 'body', 90, 5000, true, true, 90),
    ('womens-sports-massage', 'body', 60, 4000, true, true, 100),
    ('mens-sports-massage', 'body', 60, 4000, true, true, 110),
    ('womens-full-body-sports-massage', 'body', 120, 6000, true, true, 120),
    ('mens-full-body-sports-massage', 'body', 120, 6000, true, true, 130),
    ('taping-application', 'body', 30, 500, true, true, 140)
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

with translation_rows(slug, locale, name, short_description) as (
  values
    ('relax-aroma-massage', 'ru', 'Релакс / аромамассаж', 'Мягкая расслабляющая процедура с натуральными маслами и нежными ароматами для отдыха, снятия напряжения и ощущения легкости.'),
    ('relax-aroma-massage', 'sr', 'Relax / aroma masaža', 'Blaga opuštajuća masaža sa prirodnim uljima i nežnim mirisima za odmor, smanjenje napetosti i osećaj lakoće.'),
    ('relax-aroma-massage', 'en', 'Relax / Aroma Massage', 'A gentle relaxing treatment with natural oils and soft aromas for rest, tension relief and a lighter feeling in the body.'),
    ('anti-cellulite-massage-60', 'ru', 'Антицеллюлитный массаж — 60 мин', 'Интенсивная процедура для работы с тонусом кожи и ощущением плотности тканей. Подбирается индивидуально по интенсивности и зонам.'),
    ('anti-cellulite-massage-60', 'sr', 'Anticelulit masaža — 60 min', 'Intenzivan tretman za rad na tonusu kože i osećaju čvrstine tkiva. Intenzitet i zone rada prilagođavaju se individualno.'),
    ('anti-cellulite-massage-60', 'en', 'Anti-cellulite Massage — 60 min', 'An intensive treatment focused on skin tone and tissue firmness. Intensity and focus areas are tailored individually.'),
    ('anti-cellulite-massage-90', 'ru', 'Антицеллюлитный массаж — 90 мин', 'Увеличенная по времени процедура для более детальной работы с выбранными зонами, тонусом кожи и ощущением плотности тканей.'),
    ('anti-cellulite-massage-90', 'sr', 'Anticelulit masaža — 90 min', 'Produženi tretman za detaljniji rad na izabranim zonama, tonusu kože i osećaju čvrstine tkiva.'),
    ('anti-cellulite-massage-90', 'en', 'Anti-cellulite Massage — 90 min', 'An extended treatment for more detailed work on selected areas, skin tone and tissue firmness.'),
    ('lymphatic-drainage-massage-60', 'ru', 'Лимфодренажный массаж — 60 мин', 'Мягкая ритмичная процедура, направленная на ощущение легкости, расслабления и бережную работу с отечностью.'),
    ('lymphatic-drainage-massage-60', 'sr', 'Limfna drenažna masaža — 60 min', 'Blag ritmičan tretman usmeren na osećaj lakoće, opuštanja i nežan rad sa zadržavanjem tečnosti.'),
    ('lymphatic-drainage-massage-60', 'en', 'Lymphatic Drainage Massage — 60 min', 'A gentle rhythmic treatment focused on lightness, relaxation and delicate work with fluid retention.'),
    ('lymphatic-drainage-massage-90', 'ru', 'Лимфодренажный массаж — 90 мин', 'Продолжительная мягкая процедура для более спокойной и детальной работы с ощущением отечности, тяжести и усталости в теле.'),
    ('lymphatic-drainage-massage-90', 'sr', 'Limfna drenažna masaža — 90 min', 'Produženi blag tretman za mirniji i detaljniji rad sa osećajem otoka, težine i umora u telu.'),
    ('lymphatic-drainage-massage-90', 'en', 'Lymphatic Drainage Massage — 90 min', 'An extended gentle treatment for calmer and more detailed work with the feeling of puffiness, heaviness and body fatigue.'),
    ('womens-sports-massage', 'ru', 'Спортивный женский массаж', 'Активная процедура для мышечного тонуса, восстановления после нагрузки и снятия накопленного напряжения с учетом женской анатомии и комфорта.'),
    ('womens-sports-massage', 'sr', 'Ženska sportska masaža', 'Aktivan tretman za mišićni tonus, oporavak nakon opterećenja i oslobađanje napetosti, uz pažnju na žensku anatomiju i komfor.'),
    ('womens-sports-massage', 'en', 'Women''s Sports Massage', 'An active treatment for muscle tone, recovery after physical load and tension relief, with attention to women''s anatomy and comfort.'),
    ('mens-sports-massage', 'ru', 'Спортивный мужской массаж', 'Интенсивная процедура для глубокой проработки мышц, восстановления после нагрузки и снятия напряжения.'),
    ('mens-sports-massage', 'sr', 'Muška sportska masaža', 'Intenzivan tretman za dublji rad na mišićima, oporavak nakon opterećenja i smanjenje napetosti.'),
    ('mens-sports-massage', 'en', 'Men''s Sports Massage', 'An intensive treatment for deeper muscle work, recovery after physical load and tension relief.'),
    ('womens-full-body-sports-massage', 'ru', 'Спортивный женский массаж всего тела', 'Двухчасовая процедура для комплексной проработки всего тела, восстановления после нагрузки и снятия общего мышечного напряжения.'),
    ('womens-full-body-sports-massage', 'sr', 'Ženska sportska masaža celog tela', 'Dvočasovni tretman za celoviti rad na telu, oporavak nakon opterećenja i smanjenje opšte mišićne napetosti.'),
    ('womens-full-body-sports-massage', 'en', 'Women''s Full Body Sports Massage', 'A two-hour full body treatment for comprehensive muscle work, recovery after physical load and release of overall tension.'),
    ('mens-full-body-sports-massage', 'ru', 'Спортивный мужской массаж всего тела', 'Двухчасовая интенсивная процедура для глубокой проработки всего тела, восстановления и снятия накопленного напряжения.'),
    ('mens-full-body-sports-massage', 'sr', 'Muška sportska masaža celog tela', 'Dvočasovni intenzivan tretman za dubinski rad na celom telu, oporavak i oslobađanje nakupljene napetosti.'),
    ('mens-full-body-sports-massage', 'en', 'Men''s Full Body Sports Massage', 'A two-hour intensive full body treatment for deep muscle work, recovery and release of accumulated tension.'),
    ('taping-application', 'ru', 'Тейпирование — 1 аппликация', 'Одна аппликация тейпа для поддержки выбранной зоны тела, снижения дискомфорта и помощи в восстановлении после нагрузки.'),
    ('taping-application', 'sr', 'Tejping — 1 aplikacija', 'Jedna aplikacija tejpa za podršku izabranoj zoni tela, smanjenje nelagodnosti i pomoć u oporavku nakon opterećenja.'),
    ('taping-application', 'en', 'Taping — 1 Application', 'One tape application to support a selected body area, reduce discomfort and assist recovery after physical load.')
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

with allowed(display_name, slug) as (
  values
    ('Ekaterina', 'face-massage'),
    ('Ekaterina', 'face-massage-serum-lamp'),
    ('Ekaterina', 'facial-microcurrents'),
    ('Ekaterina', 'face-course-6-treatments'),
    ('Sergey', 'relax-aroma-massage'),
    ('Ekaterina', 'relax-aroma-massage'),
    ('Sergey', 'anti-cellulite-massage-60'),
    ('Ekaterina', 'anti-cellulite-massage-60'),
    ('Sergey', 'anti-cellulite-massage-90'),
    ('Ekaterina', 'anti-cellulite-massage-90'),
    ('Sergey', 'lymphatic-drainage-massage-60'),
    ('Sergey', 'lymphatic-drainage-massage-90'),
    ('Ekaterina', 'womens-sports-massage'),
    ('Sergey', 'mens-sports-massage'),
    ('Ekaterina', 'womens-full-body-sports-massage'),
    ('Sergey', 'mens-full-body-sports-massage'),
    ('Sergey', 'taping-application')
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

with managed_service_ids as (
  select id
  from public.services
  where slug in (
    'face-massage',
    'face-massage-serum-lamp',
    'facial-microcurrents',
    'face-course-6-treatments',
    'relax-aroma-massage',
    'anti-cellulite-massage-60',
    'anti-cellulite-massage-90',
    'lymphatic-drainage-massage-60',
    'lymphatic-drainage-massage-90',
    'womens-sports-massage',
    'mens-sports-massage',
    'womens-full-body-sports-massage',
    'mens-full-body-sports-massage',
    'taping-application'
  )
),
allowed(display_name, slug) as (
  values
    ('Ekaterina', 'face-massage'),
    ('Ekaterina', 'face-massage-serum-lamp'),
    ('Ekaterina', 'facial-microcurrents'),
    ('Ekaterina', 'face-course-6-treatments'),
    ('Sergey', 'relax-aroma-massage'),
    ('Ekaterina', 'relax-aroma-massage'),
    ('Sergey', 'anti-cellulite-massage-60'),
    ('Ekaterina', 'anti-cellulite-massage-60'),
    ('Sergey', 'anti-cellulite-massage-90'),
    ('Ekaterina', 'anti-cellulite-massage-90'),
    ('Sergey', 'lymphatic-drainage-massage-60'),
    ('Sergey', 'lymphatic-drainage-massage-90'),
    ('Ekaterina', 'womens-sports-massage'),
    ('Sergey', 'mens-sports-massage'),
    ('Ekaterina', 'womens-full-body-sports-massage'),
    ('Sergey', 'mens-full-body-sports-massage'),
    ('Sergey', 'taping-application')
),
allowed_ids as (
  select therapists.id as therapist_id, services.id as service_id
  from allowed
  join public.therapists on therapists.display_name = allowed.display_name
  join public.services on services.slug = allowed.slug
)
update public.therapist_services
set active = false
where service_id in (select id from managed_service_ids)
  and not exists (
    select 1
    from allowed_ids
    where allowed_ids.therapist_id = therapist_services.therapist_id
      and allowed_ids.service_id = therapist_services.service_id
  );

comment on table public.therapist_services
  is 'Active many-to-many eligibility between therapists and services. Used by public booking and dashboard booking validation.';

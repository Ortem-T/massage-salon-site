-- Expand lymphatic drainage therapist eligibility.
-- Source of truth remains public.therapist_services; service names, prices, durations,
-- descriptions, and other therapist-service restrictions are intentionally unchanged.

do $$
declare
  missing_services text;
  missing_therapists text;
begin
  select string_agg(expected.slug, ', ' order by expected.slug)
  into missing_services
  from (
    values
      ('lymphatic-drainage-massage-60'),
      ('lymphatic-drainage-massage-90')
  ) as expected(slug)
  left join public.services on services.slug = expected.slug
  where services.id is null;

  if missing_services is not null then
    raise exception 'Missing lymphatic drainage services: %', missing_services;
  end if;

  select string_agg(expected.display_name, ', ' order by expected.display_name)
  into missing_therapists
  from (
    values
      ('Ekaterina'),
      ('Sergey')
  ) as expected(display_name)
  left join public.therapists on therapists.display_name = expected.display_name
  where therapists.id is null;

  if missing_therapists is not null then
    raise exception 'Missing therapists for lymphatic drainage eligibility: %', missing_therapists;
  end if;
end;
$$;

with target_services as (
  select id
  from public.services
  where slug in (
    'lymphatic-drainage-massage-60',
    'lymphatic-drainage-massage-90'
  )
),
target_therapists as (
  select id
  from public.therapists
  where display_name in ('Ekaterina', 'Sergey')
),
target_relations as (
  select
    target_therapists.id as therapist_id,
    target_services.id as service_id
  from target_therapists
  cross join target_services
)
insert into public.therapist_services (
  therapist_id,
  service_id,
  active
)
select
  therapist_id,
  service_id,
  true
from target_relations
on conflict (therapist_id, service_id) do update
  set active = true;

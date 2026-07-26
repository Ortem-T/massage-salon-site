-- Enable brow/lash and permanent makeup services for Ekaterina.
-- These services become public booking options only when the therapist-service assignment exists.

with beauty_service_slugs(slug) as (
  values
    ('lash-lamination-tinting'),
    ('brow-lamination-tinting'),
    ('brow-lash-lamination'),
    ('brow-shaping-tweezers'),
    ('brow-tinting'),
    ('lash-tinting'),
    ('powder-brows-permanent-makeup-initial'),
    ('powder-brows-permanent-makeup-correction'),
    ('powder-brows-permanent-makeup-refresh'),
    ('lip-permanent-makeup-initial'),
    ('lip-permanent-makeup-correction'),
    ('lip-permanent-makeup-refresh'),
    ('lash-line-permanent-makeup-initial'),
    ('lash-line-permanent-makeup-correction'),
    ('lash-line-permanent-makeup-refresh')
),
ekaterina as (
  select id
  from public.therapists
  where display_name = 'Ekaterina'
    and active = true
  limit 1
),
enabled_services as (
  update public.services
  set active = true,
      bookable_online = true,
      updated_at = now()
  where slug in (select slug from beauty_service_slugs)
    and exists (select 1 from ekaterina)
  returning id
)
insert into public.therapist_services (
  therapist_id,
  service_id,
  active
)
select ekaterina.id, enabled_services.id, true
from ekaterina
cross join enabled_services
on conflict (therapist_id, service_id) do update
  set active = true;

-- Extend schedule blocks with room-rental capacity blocks and generated recurrence grouping.

alter table public.schedule_blocks
  add column if not exists rooms_occupied integer not null default 0,
  add column if not exists series_id uuid;

create index if not exists schedule_blocks_series_id_idx
  on public.schedule_blocks(series_id)
  where series_id is not null;

alter table public.schedule_blocks
  drop constraint if exists schedule_blocks_block_scope_check,
  drop constraint if exists schedule_blocks_scope_therapist_check,
  drop constraint if exists schedule_blocks_rooms_occupied_check;

alter table public.schedule_blocks
  add constraint schedule_blocks_block_scope_check
  check (block_scope in ('therapist', 'salon', 'room_rental'));

alter table public.schedule_blocks
  add constraint schedule_blocks_scope_therapist_check
  check (
    (block_scope = 'therapist' and therapist_id is not null and rooms_occupied = 0)
    or (block_scope = 'salon' and therapist_id is null and rooms_occupied = 0)
    or (block_scope = 'room_rental' and therapist_id is null and rooms_occupied >= 1)
  );

alter table public.schedule_blocks
  add constraint schedule_blocks_rooms_occupied_check
  check (rooms_occupied between 0 and 10);

grant select (
  therapist_id,
  block_type,
  block_scope,
  date,
  start_time,
  end_time,
  rooms_occupied
) on table public.schedule_blocks to anon;

drop policy if exists "Therapists can select own schedule blocks" on public.schedule_blocks;
create policy "Therapists can select own schedule blocks"
  on public.schedule_blocks
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and block_scope = 'therapist'
    and rooms_occupied = 0
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

drop policy if exists "Therapists can insert own schedule blocks" on public.schedule_blocks;
create policy "Therapists can insert own schedule blocks"
  on public.schedule_blocks
  for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and created_by = (select auth.uid())
    and block_scope = 'therapist'
    and rooms_occupied = 0
    and series_id is null
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

drop policy if exists "Therapists can update own schedule blocks" on public.schedule_blocks;
create policy "Therapists can update own schedule blocks"
  on public.schedule_blocks
  for update
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and block_scope = 'therapist'
    and rooms_occupied = 0
    and series_id is null
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  )
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and block_scope = 'therapist'
    and rooms_occupied = 0
    and series_id is null
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

drop policy if exists "Therapists can delete own schedule blocks" on public.schedule_blocks;
create policy "Therapists can delete own schedule blocks"
  on public.schedule_blocks
  for delete
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and block_scope = 'therapist'
    and rooms_occupied = 0
    and series_id is null
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

drop view if exists public.public_schedule_block_availability;
create view public.public_schedule_block_availability
with (security_invoker = true)
as
select
  schedule_blocks.date as block_date,
  schedule_blocks.therapist_id,
  schedule_blocks.block_type,
  schedule_blocks.block_scope,
  schedule_blocks.start_time,
  schedule_blocks.end_time,
  schedule_blocks.rooms_occupied
from public.schedule_blocks;

revoke all on table public.public_schedule_block_availability from anon, authenticated;
grant select on table public.public_schedule_block_availability to anon, authenticated;

comment on column public.schedule_blocks.rooms_occupied
  is 'Number of treatment rooms occupied by operational room-rental blocks. Therapist and salon-wide blocks keep this at 0.';

comment on column public.schedule_blocks.series_id
  is 'Lightweight grouping id for generated recurring schedule-block occurrences. Recurrence rules are not stored.';

comment on view public.public_schedule_block_availability
  is 'Safe public schedule block projection for availability calculations. Includes room capacity usage but does not expose internal reasons.';

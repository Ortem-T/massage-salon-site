-- Schedule / availability blocking for dashboard staff.
-- Internal reasons stay private; public availability receives only blocked interval fields.

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid references public.therapists(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  block_type text not null check (block_type in ('full_day', 'time_range')),
  block_scope text not null default 'therapist' check (block_scope in ('therapist', 'salon')),
  date date not null,
  start_time time,
  end_time time,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_blocks_full_day_time_check check (
    (block_type = 'full_day' and start_time is null and end_time is null)
    or (block_type = 'time_range' and start_time is not null and end_time is not null and end_time > start_time)
  ),
  constraint schedule_blocks_scope_therapist_check check (
    (block_scope = 'therapist' and therapist_id is not null)
    or (block_scope = 'salon' and therapist_id is null)
  ),
  constraint schedule_blocks_workday_time_check check (
    block_type = 'full_day'
    or (start_time >= time '10:00' and end_time <= time '19:00')
  )
);

create index if not exists schedule_blocks_date_idx on public.schedule_blocks(date);
create index if not exists schedule_blocks_therapist_date_idx on public.schedule_blocks(therapist_id, date);
create index if not exists schedule_blocks_scope_date_idx on public.schedule_blocks(block_scope, date);
create index if not exists schedule_blocks_created_by_idx on public.schedule_blocks(created_by);

drop trigger if exists set_schedule_blocks_updated_at on public.schedule_blocks;
create trigger set_schedule_blocks_updated_at
  before update on public.schedule_blocks
  for each row
  execute function private.set_updated_at();

alter table public.schedule_blocks enable row level security;

revoke all on table public.schedule_blocks from anon, authenticated;
grant select, insert, update, delete on table public.schedule_blocks to authenticated;
grant select (
  therapist_id,
  block_type,
  block_scope,
  date,
  start_time,
  end_time
) on table public.schedule_blocks to anon;

drop policy if exists "Admin users can select schedule blocks" on public.schedule_blocks;
create policy "Admin users can select schedule blocks"
  on public.schedule_blocks
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can insert schedule blocks" on public.schedule_blocks;
create policy "Admin users can insert schedule blocks"
  on public.schedule_blocks
  for insert
  to authenticated
  with check (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    and created_by = (select auth.uid())
  );

drop policy if exists "Admin users can update schedule blocks" on public.schedule_blocks;
create policy "Admin users can update schedule blocks"
  on public.schedule_blocks
  for update
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admin users can delete schedule blocks" on public.schedule_blocks;
create policy "Admin users can delete schedule blocks"
  on public.schedule_blocks
  for delete
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Therapists can select own schedule blocks" on public.schedule_blocks;
create policy "Therapists can select own schedule blocks"
  on public.schedule_blocks
  for select
  to authenticated
  using (
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'therapist'
    and block_scope = 'therapist'
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
    and therapist_id in (
      select id
      from public.therapists
      where profile_id = (select auth.uid())
        and active = true
    )
  );

drop policy if exists "Anon users can select schedule block availability" on public.schedule_blocks;
create policy "Anon users can select schedule block availability"
  on public.schedule_blocks
  for select
  to anon
  using (true);

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
  schedule_blocks.end_time
from public.schedule_blocks;

revoke all on table public.public_schedule_block_availability from anon, authenticated;
grant select on table public.public_schedule_block_availability to anon, authenticated;

comment on table public.schedule_blocks
  is 'Internal dashboard schedule and availability blocks. Reason is private staff-only context.';

comment on view public.public_schedule_block_availability
  is 'Safe public schedule block projection for availability calculations. Does not expose internal reasons.';

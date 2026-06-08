-- Trusted maintenance role bypass for booking update trigger,
-- plus booking availability support for 19:00 as the latest start time.

create or replace function private.enforce_therapist_booking_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  trusted_database_roles constant text[] := array['postgres', 'supabase_admin', 'service_role'];
  dashboard_role text;
begin
  -- Supabase Dashboard / SQL Editor maintenance does not always carry
  -- an app_metadata.role JWT claim. These database roles are trusted
  -- infrastructure roles only: hosted Studio/SQL Editor uses postgres,
  -- older/self-hosted Studio may use supabase_admin, and service_role is
  -- reserved for trusted server-side maintenance. This is not a frontend
  -- bypass and does not grant anon/authenticated users extra privileges.
  if current_user = any(trusted_database_roles)
    or current_role = any(trusted_database_roles)
    or session_user = any(trusted_database_roles)
  then
    return new;
  end if;

  dashboard_role := auth.jwt() -> 'app_metadata' ->> 'role';

  if dashboard_role = 'admin' then
    return new;
  end if;

  if dashboard_role = 'therapist' then
    if new.id is distinct from old.id
      or new.created_at is distinct from old.created_at
      or new.service is distinct from old.service
      or new.specialist is distinct from old.specialist
      or new.preferred_date is distinct from old.preferred_date
      or new.preferred_time is distinct from old.preferred_time
      or new.duration_minutes is distinct from old.duration_minutes
      or new.client_name is distinct from old.client_name
      or new.client_phone is distinct from old.client_phone
      or new.client_comment is distinct from old.client_comment
      or new.locale is distinct from old.locale
      or new.source is distinct from old.source
      or new.source_channel is distinct from old.source_channel
      or new.client_id is distinct from old.client_id
      or new.therapist_id is distinct from old.therapist_id
      or new.promotion_id is distinct from old.promotion_id
      or new.promotion_snapshot_title is distinct from old.promotion_snapshot_title
      or new.promotion_snapshot_description is distinct from old.promotion_snapshot_description
    then
      raise exception 'Therapists can only update booking status and internal notes.';
    end if;

    if new.status is distinct from old.status
      and new.status not in ('confirmed'::public.booking_status, 'cancelled'::public.booking_status, 'completed'::public.booking_status)
    then
      raise exception 'Therapists can only set booking status to confirmed, cancelled, or completed.';
    end if;

    return new;
  end if;

  raise exception 'Only dashboard staff can update bookings.';
end;
$$;

comment on function private.enforce_therapist_booking_update()
  is 'Allows trusted DB maintenance roles before JWT dashboard-role checks, then enforces admin/therapist booking update restrictions for app users.';

alter table public.schedule_blocks
  drop constraint if exists schedule_blocks_workday_time_check;

alter table public.schedule_blocks
  add constraint schedule_blocks_workday_time_check check (
    block_type = 'full_day'
    or (
      start_time >= time '10:00'
      and start_time <= time '19:00'
      and end_time <= time '19:30'
    )
  );

comment on constraint schedule_blocks_workday_time_check on public.schedule_blocks
  is 'Time-range blocks may end after the last booking start so staff can block the 19:00 start slot.';


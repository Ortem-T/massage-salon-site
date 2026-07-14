-- Add optional server-side manual suggestions to personalized rebooking tokens.
-- Public links remain opaque: /{locale}?rebook=<token>.

alter table public.client_rebooking_tokens
  add column if not exists suggestion_mode text not null default 'automatic',
  add column if not exists suggested_service_id uuid null references public.services(id),
  add column if not exists suggested_therapist_id uuid null references public.therapists(id),
  add column if not exists suggested_date date null,
  add column if not exists suggested_time time null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_rebooking_tokens_suggestion_mode_check'
      and conrelid = 'public.client_rebooking_tokens'::regclass
  ) then
    alter table public.client_rebooking_tokens
      add constraint client_rebooking_tokens_suggestion_mode_check
      check (suggestion_mode in ('automatic', 'manual'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'client_rebooking_tokens_manual_suggestion_check'
      and conrelid = 'public.client_rebooking_tokens'::regclass
  ) then
    alter table public.client_rebooking_tokens
      add constraint client_rebooking_tokens_manual_suggestion_check
      check (
        suggestion_mode = 'automatic'
        or (
          suggested_service_id is not null
          and suggested_therapist_id is not null
          and suggested_date is not null
          and suggested_time is not null
        )
      );
  end if;
end $$;

create index if not exists client_rebooking_tokens_manual_suggestion_idx
  on public.client_rebooking_tokens(suggestion_mode, suggested_date)
  where suggestion_mode = 'manual';

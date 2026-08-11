create table if not exists public.therapist_calendar_tokens (
  id uuid primary key default gen_random_uuid(),
  therapist_id uuid not null references public.therapists(id) on delete cascade,
  token_hash text not null unique,
  provider text not null default 'sredime',
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  constraint therapist_calendar_tokens_provider_check check (provider in ('sredime')),
  constraint therapist_calendar_tokens_hash_length_check check (char_length(token_hash) >= 64),
  constraint therapist_calendar_tokens_revoked_state_check check (
    (active = true and revoked_at is null)
    or active = false
  )
);

create unique index if not exists therapist_calendar_tokens_one_active_provider_idx
  on public.therapist_calendar_tokens(therapist_id, provider)
  where active = true and revoked_at is null;

create index if not exists therapist_calendar_tokens_lookup_idx
  on public.therapist_calendar_tokens(provider, token_hash)
  where active = true and revoked_at is null;

create index if not exists therapist_calendar_tokens_therapist_idx
  on public.therapist_calendar_tokens(therapist_id, provider);

drop trigger if exists set_therapist_calendar_tokens_updated_at on public.therapist_calendar_tokens;
create trigger set_therapist_calendar_tokens_updated_at
  before update on public.therapist_calendar_tokens
  for each row
  execute function private.set_updated_at();

alter table public.therapist_calendar_tokens enable row level security;

revoke all on table public.therapist_calendar_tokens from anon, authenticated;
grant select, insert, update on table public.therapist_calendar_tokens to authenticated;

drop policy if exists "Admin users can manage therapist calendar tokens" on public.therapist_calendar_tokens;
create policy "Admin users can manage therapist calendar tokens"
  on public.therapist_calendar_tokens
  for all
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

comment on table public.therapist_calendar_tokens
  is 'Hash-only private ICS/iCal token registry for external calendar integrations such as SrediMe.';

comment on column public.therapist_calendar_tokens.token_hash
  is 'SHA-256 hash of the opaque calendar URL token. The raw token is only shown to an admin when generated.';

comment on column public.therapist_calendar_tokens.last_used_at
  is 'Updated by the server-side ICS resolver when an external calendar fetch succeeds.';

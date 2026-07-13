-- Secure personalized rebooking links.
-- Raw tokens are never stored; only SHA-256 token hashes are persisted.

create table if not exists public.client_rebooking_tokens (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  use_count integer not null default 0 check (use_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_rebooking_tokens_client_id_idx
  on public.client_rebooking_tokens(client_id);

create index if not exists client_rebooking_tokens_active_client_idx
  on public.client_rebooking_tokens(client_id, expires_at)
  where revoked_at is null;

drop trigger if exists set_client_rebooking_tokens_updated_at on public.client_rebooking_tokens;
create trigger set_client_rebooking_tokens_updated_at
  before update on public.client_rebooking_tokens
  for each row
  execute function private.set_updated_at();

alter table public.client_rebooking_tokens enable row level security;

revoke all on table public.client_rebooking_tokens from anon, authenticated;
grant select (
  id,
  client_id,
  expires_at,
  revoked_at,
  last_used_at,
  created_by,
  use_count,
  created_at,
  updated_at
) on table public.client_rebooking_tokens to authenticated;

drop policy if exists "Admin users can select rebooking token metadata" on public.client_rebooking_tokens;
create policy "Admin users can select rebooking token metadata"
  on public.client_rebooking_tokens
  for select
  to authenticated
  using ((select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create or replace function public.create_client_rebooking_token(
  p_client_id uuid,
  p_token_hash text,
  p_expires_at timestamptz
)
returns table (
  token_id uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if p_token_hash is null or length(p_token_hash) < 64 or p_expires_at <= now() then
    raise exception 'Invalid token input' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.clients
    where id = p_client_id
  ) then
    raise exception 'Client not found' using errcode = '22023';
  end if;

  update public.client_rebooking_tokens as token
  set revoked_at = now(),
      updated_at = now()
  where token.client_id = p_client_id
    and token.revoked_at is null
    and token.expires_at > now();

  return query
  insert into public.client_rebooking_tokens (
    client_id,
    token_hash,
    expires_at,
    created_by
  )
  values (
    p_client_id,
    p_token_hash,
    p_expires_at,
    (select auth.uid())
  )
  returning
    client_rebooking_tokens.id,
    client_rebooking_tokens.expires_at,
    client_rebooking_tokens.revoked_at,
    client_rebooking_tokens.last_used_at,
    client_rebooking_tokens.use_count;
end;
$$;

create or replace function public.revoke_client_rebooking_token(p_client_id uuid)
returns table (
  token_id uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  last_used_at timestamptz,
  use_count integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select auth.jwt() -> 'app_metadata' ->> 'role') <> 'admin' then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
  update public.client_rebooking_tokens as token
  set revoked_at = coalesce(token.revoked_at, now()),
      updated_at = now()
  where token.client_id = p_client_id
    and token.revoked_at is null
    and token.expires_at > now()
  returning
    token.id,
    token.expires_at,
    token.revoked_at,
    token.last_used_at,
    token.use_count;
end;
$$;

create or replace function public.resolve_client_rebooking_token(p_token_hash text)
returns table (
  name text,
  phone text,
  preferred_locale text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  token_record public.client_rebooking_tokens%rowtype;
  client_record record;
begin
  if p_token_hash is null or length(p_token_hash) < 64 then
    return;
  end if;

  select *
  into token_record
  from public.client_rebooking_tokens
  where token_hash = p_token_hash
    and revoked_at is null
    and expires_at > now()
  limit 1
  for update;

  if not found then
    return;
  end if;

  select clients.name, clients.phone, clients.locale
  into client_record
  from public.clients
  where clients.id = token_record.client_id
    and clients.phone is not null
    and length(btrim(clients.name)) >= 2
    and length(btrim(clients.phone)) >= 6;

  if not found then
    return;
  end if;

  update public.client_rebooking_tokens
  set last_used_at = now(),
      use_count = use_count + 1,
      updated_at = now()
  where id = token_record.id;

  return query
  select
    client_record.name::text,
    client_record.phone::text,
    client_record.locale::text;
end;
$$;

revoke all on function public.create_client_rebooking_token(uuid, text, timestamptz) from public;
revoke all on function public.revoke_client_rebooking_token(uuid) from public;
revoke all on function public.resolve_client_rebooking_token(text) from public;

grant execute on function public.create_client_rebooking_token(uuid, text, timestamptz) to authenticated;
grant execute on function public.revoke_client_rebooking_token(uuid) to authenticated;
grant execute on function public.resolve_client_rebooking_token(text) to anon;

comment on table public.client_rebooking_tokens
  is 'Hashed personalized rebooking magic-link tokens. Raw tokens are returned only once by trusted server actions and are never stored.';

comment on function public.resolve_client_rebooking_token(text)
  is 'Public minimal resolver for hashed rebooking tokens. Returns only client name, phone, and preferred locale when valid.';

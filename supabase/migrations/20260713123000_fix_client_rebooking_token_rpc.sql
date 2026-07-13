-- Fix ambiguous PL/pgSQL references in rebooking token RPCs.
-- The original functions return columns named revoked_at/expires_at, so table columns
-- must be qualified inside UPDATE predicates and expressions.

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

revoke all on function public.create_client_rebooking_token(uuid, text, timestamptz) from public;
revoke all on function public.revoke_client_rebooking_token(uuid) from public;

grant execute on function public.create_client_rebooking_token(uuid, text, timestamptz) to authenticated;
grant execute on function public.revoke_client_rebooking_token(uuid) to authenticated;

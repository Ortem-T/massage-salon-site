import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { siteUrl } from "@/config/seo";
import { isLocale, type Locale } from "@/i18n/config";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { DashboardForbiddenError } from "@/lib/dashboard/bookings";
import { getSuggestedRebookingForClient, type SuggestedRebooking } from "@/lib/rebooking/suggestions";
import { createSupabaseAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RebookingTokenStatus = "active" | "expired" | "revoked";

export type RebookingTokenMetadata = {
  id: string;
  status: RebookingTokenStatus;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  useCount: number;
};

export type RebookingPrefill = {
  name: string;
  phone: string;
  preferredLocale: Locale | null;
  suggestedBooking: SuggestedRebooking | null;
};

const rebookingTokenBytes = 32;
const rebookingTokenExpiryDays = 180;
const rebookingTokenPattern = /^[A-Za-z0-9_-]{32,160}$/;

function assertAdmin(user: DashboardUser) {
  if (user.role !== "admin") {
    throw new DashboardForbiddenError();
  }
}

export function isRebookingTokenFormat(value: string) {
  return rebookingTokenPattern.test(value);
}

export function hashRebookingToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function createRawRebookingToken() {
  return randomBytes(rebookingTokenBytes).toString("base64url");
}

function getExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + rebookingTokenExpiryDays);
  return expiresAt;
}

function getPublicOrigin() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || siteUrl;

  try {
    return new URL(configured).origin;
  } catch {
    return siteUrl;
  }
}

export function buildRebookingUrl(locale: Locale, token: string) {
  const url = new URL(`/${locale}`, getPublicOrigin());
  url.searchParams.set("rebook", token);
  return url.toString();
}

export function toRebookingTokenMetadata(row: {
  token_id?: string;
  id?: string;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  use_count: number;
}): RebookingTokenMetadata {
  const status: RebookingTokenStatus = row.revoked_at
    ? "revoked"
    : new Date(row.expires_at).getTime() <= Date.now()
      ? "expired"
      : "active";

  return {
    id: row.token_id ?? row.id ?? "",
    status,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
    useCount: row.use_count
  };
}

export async function createClientRebookingLink(user: DashboardUser, input: { clientId: string; locale: Locale }) {
  assertAdmin(user);

  const rawToken = createRawRebookingToken();
  const tokenHash = hashRebookingToken(rawToken);
  const expiresAt = getExpiryDate().toISOString();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_client_rebooking_token", {
    p_client_id: input.clientId,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt
  });

  if (error || !data?.[0]) {
    throw new Error(error?.message ?? "Rebooking token could not be created.");
  }

  return {
    url: buildRebookingUrl(input.locale, rawToken),
    token: toRebookingTokenMetadata(data[0])
  };
}

export async function revokeClientRebookingLink(user: DashboardUser, clientId: string) {
  assertAdmin(user);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("revoke_client_rebooking_token", {
    p_client_id: clientId
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ? toRebookingTokenMetadata(data[0]) : null;
}

export async function resolveClientRebookingToken(rawToken: string): Promise<RebookingPrefill | null> {
  if (!isRebookingTokenFormat(rawToken)) {
    return null;
  }

  if (hasSupabaseAdminEnv()) {
    return resolveClientRebookingTokenWithAdmin(rawToken);
  }

  return resolveClientRebookingTokenWithPublicRpc(rawToken);
}

async function resolveClientRebookingTokenWithAdmin(rawToken: string): Promise<RebookingPrefill | null> {
  const supabase = createSupabaseAdminClient();
  const { data: token, error: tokenError } = await supabase
    .from("client_rebooking_tokens")
    .select("id, client_id, use_count")
    .eq("token_hash", hashRebookingToken(rawToken))
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (tokenError || !token) {
    return null;
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("name, phone, locale")
    .eq("id", token.client_id)
    .maybeSingle();

  if (
    clientError ||
    !client?.phone ||
    client.name.trim().length < 2 ||
    client.phone.trim().length < 6
  ) {
    return null;
  }

  const suggestedBooking = await getSuggestedRebookingForClient(supabase, token.client_id);

  await supabase
    .from("client_rebooking_tokens")
    .update({
      last_used_at: new Date().toISOString(),
      use_count: token.use_count + 1
    })
    .eq("id", token.id);

  return {
    name: client.name,
    phone: client.phone,
    preferredLocale: client.locale && isLocale(client.locale) ? client.locale : null,
    suggestedBooking
  };
}

async function resolveClientRebookingTokenWithPublicRpc(rawToken: string): Promise<RebookingPrefill | null> {
  const supabase = createSupabasePublicClient();
  const { data, error } = await supabase.rpc("resolve_client_rebooking_token", {
    p_token_hash: hashRebookingToken(rawToken)
  });

  if (error || !data?.[0]) {
    return null;
  }

  const row = data[0];

  return {
    name: row.name,
    phone: row.phone,
    preferredLocale: row.preferred_locale && isLocale(row.preferred_locale) ? row.preferred_locale : null,
    suggestedBooking: null
  };
}

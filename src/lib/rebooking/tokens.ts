import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { siteUrl } from "@/config/seo";
import { isLocale, type Locale } from "@/i18n/config";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { DashboardForbiddenError } from "@/lib/dashboard/bookings";
import {
  getSuggestedRebookingForClient,
  resolveStoredManualRebookingSuggestion,
  type SuggestedRebooking
} from "@/lib/rebooking/suggestions";
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

export type StoredRebookingSuggestion =
  | {
      mode: "automatic";
    }
  | {
      mode: "manual";
      serviceId: string;
      therapistId: string;
      date: string;
      time: string;
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
  url.hash = "booking";
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

async function createClientRebookingLinkWithAdmin(input: {
  clientId: string;
  locale: Locale;
  createdBy: string | null;
  suggestion?: StoredRebookingSuggestion;
}) {
  const rawToken = createRawRebookingToken();
  const tokenHash = hashRebookingToken(rawToken);
  const expiresAt = getExpiryDate().toISOString();
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", input.clientId)
    .maybeSingle();

  if (clientError || !client) {
    throw new Error("Client not found.");
  }

  const { error: revokeError } = await supabase
    .from("client_rebooking_tokens")
    .update({
      revoked_at: now,
      updated_at: now
    })
    .eq("client_id", input.clientId)
    .is("revoked_at", null)
    .gt("expires_at", now);

  if (revokeError) {
    throw new Error(revokeError.message);
  }

  const suggestion = input.suggestion ?? { mode: "automatic" as const };
  const { data, error } = await supabase
    .from("client_rebooking_tokens")
    .insert({
      client_id: input.clientId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      created_by: input.createdBy,
      suggestion_mode: suggestion.mode,
      suggested_service_id: suggestion.mode === "manual" ? suggestion.serviceId : null,
      suggested_therapist_id: suggestion.mode === "manual" ? suggestion.therapistId : null,
      suggested_date: suggestion.mode === "manual" ? suggestion.date : null,
      suggested_time: suggestion.mode === "manual" ? suggestion.time : null
    })
    .select("id, expires_at, revoked_at, last_used_at, use_count")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Rebooking token could not be created.");
  }

  return {
    url: buildRebookingUrl(input.locale, rawToken),
    token: toRebookingTokenMetadata(data)
  };
}

export async function createClientRebookingLink(
  user: DashboardUser,
  input: { clientId: string; locale: Locale; suggestion?: StoredRebookingSuggestion }
) {
  assertAdmin(user);

  if (input.suggestion?.mode === "manual") {
    return createClientRebookingLinkWithAdmin({
      clientId: input.clientId,
      locale: input.locale,
      createdBy: user.id,
      suggestion: input.suggestion
    });
  }

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

export async function createClientRebookingLinkForAuthorizedBooking(input: {
  clientId: string;
  locale: Locale;
  createdBy: string;
  suggestion?: StoredRebookingSuggestion;
}) {
  return createClientRebookingLinkWithAdmin(input);
}

export async function revokeClientRebookingLinkForAuthorizedBooking(clientId: string) {
  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("client_rebooking_tokens")
    .update({
      revoked_at: now,
      updated_at: now
    })
    .eq("client_id", clientId)
    .is("revoked_at", null)
    .gt("expires_at", now)
    .select("id, expires_at, revoked_at, last_used_at, use_count")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? toRebookingTokenMetadata(data) : null;
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
    .select("id, client_id, use_count, suggestion_mode, suggested_service_id, suggested_therapist_id, suggested_date, suggested_time")
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

  const suggestedBooking = token.suggestion_mode === "manual"
    ? await resolveStoredManualRebookingSuggestion(supabase, {
        serviceId: token.suggested_service_id,
        therapistId: token.suggested_therapist_id,
        date: token.suggested_date,
        time: token.suggested_time
      })
    : await getSuggestedRebookingForClient(supabase, token.client_id);

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

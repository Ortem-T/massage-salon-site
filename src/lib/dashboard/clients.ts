import { type Locale } from "@/i18n/config";
import {
  contactValueRequired,
  normalizeContactPhone,
  normalizePrimaryContactValue,
  type BookingClient,
  type ClientContactChannel
} from "@/lib/clients/contact";
import { clientContactColumns, toBookingClient } from "@/lib/clients/server";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { DashboardForbiddenError } from "@/lib/dashboard/bookings";
import { type ManualBookingSourceChannel } from "@/lib/dashboard/constants";
import { toRebookingTokenMetadata, type RebookingTokenMetadata } from "@/lib/rebooking/tokens";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardClientBooking = {
  id: string;
  preferredDate: string;
  preferredTime: string;
  service: string;
  specialist: string;
  status: BookingStatus;
  source: string;
  sourceChannel: ManualBookingSourceChannel | null;
  durationMinutes: number | null;
  clientComment: string | null;
  internalNotes: string | null;
};

export type DashboardClient = BookingClient & {
  createdAt: string;
  updatedAt: string;
  bookings: DashboardClientBooking[];
  bookingsCount: number;
  lastBookingDate: string | null;
  latestService: string | null;
  rebookingToken: RebookingTokenMetadata | null;
};

export type SaveClientInput = {
  id?: string | null;
  name: string;
  phone?: string | null;
  instagramUsername?: string | null;
  telegramUsername?: string | null;
  whatsappPhone?: string | null;
  viberPhone?: string | null;
  primaryContactChannel: ClientContactChannel;
  primaryContactValue?: string | null;
  locale?: Locale | "" | null;
  notes?: string | null;
};

type ClientRow = Parameters<typeof toBookingClient>[0] & {
  created_at: string;
  updated_at: string;
};

type ClientBookingRow = {
  id: string;
  preferred_date: string;
  preferred_time: string;
  service: string;
  specialist: string;
  status: BookingStatus;
  source: string;
  source_channel: ManualBookingSourceChannel | null;
  duration_minutes: number | null;
  client_comment: string | null;
  client_phone: string;
  client_contact_channel: ClientContactChannel | null;
  client_contact_value: string | null;
  internal_notes: string | null;
  client_id: string | null;
};

type RebookingTokenRow = {
  id: string;
  client_id: string;
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
};

const clientColumnsWithTimestamps = `${clientContactColumns}, created_at, updated_at`;
const bookingColumnsWithContacts =
  "id, preferred_date, preferred_time, service, specialist, status, source, source_channel, duration_minutes, client_comment, client_phone, client_contact_channel, client_contact_value, internal_notes, client_id";
const legacyBookingColumns =
  "id, preferred_date, preferred_time, service, specialist, status, source, source_channel, client_phone, internal_notes, client_id";

function assertAdmin(user: DashboardUser) {
  if (user.role !== "admin") {
    throw new DashboardForbiddenError();
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function normalizeUsername(value: string | null | undefined, channel: "instagram" | "telegram") {
  return normalizePrimaryContactValue(channel, value);
}

function toDashboardClient(
  row: ClientRow,
  bookings: DashboardClientBooking[],
  rebookingToken: RebookingTokenMetadata | null
): DashboardClient {
  const base = toBookingClient(row);
  const sortedBookings = [...bookings].sort((a, b) => {
    const dateCompare = b.preferredDate.localeCompare(a.preferredDate);
    return dateCompare === 0 ? b.preferredTime.localeCompare(a.preferredTime) : dateCompare;
  });

  return {
    ...base,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    bookings: sortedBookings,
    bookingsCount: sortedBookings.length,
    lastBookingDate: sortedBookings[0]?.preferredDate ?? null,
    latestService: sortedBookings[0]?.service ?? null,
    rebookingToken
  };
}

function toDashboardClientBooking(row: ClientBookingRow): DashboardClientBooking {
  return {
    id: row.id,
    preferredDate: row.preferred_date,
    preferredTime: row.preferred_time,
    service: row.service,
    specialist: row.specialist,
    status: row.status,
    source: row.source,
    sourceChannel: row.source_channel,
    durationMinutes: row.duration_minutes ?? null,
    clientComment: row.client_comment ?? null,
    internalNotes: row.internal_notes
  };
}

function normalizeMatchValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function addMatchValue(values: Set<string>, value: string | null | undefined) {
  const normalized = normalizeMatchValue(value);

  if (!normalized) {
    return;
  }

  values.add(normalized);

  if (normalized.startsWith("@")) {
    values.add(normalized.slice(1));
  } else {
    values.add(`@${normalized}`);
  }
}

function getClientMatchValues(client: ClientRow) {
  const values = new Set<string>();

  addMatchValue(values, client.phone);
  addMatchValue(values, client.instagram_username);
  addMatchValue(values, client.telegram_username);
  addMatchValue(values, client.whatsapp_phone);
  addMatchValue(values, client.viber_phone);
  addMatchValue(values, client.primary_contact_value);

  return values;
}

function bookingMatchesClient(client: ClientRow, booking: ClientBookingRow) {
  if (booking.client_id) {
    return booking.client_id === client.id;
  }

  const clientValues = getClientMatchValues(client);

  if (clientValues.size === 0) {
    return false;
  }

  const bookingValues = new Set<string>();
  addMatchValue(bookingValues, booking.client_phone);
  addMatchValue(bookingValues, booking.client_contact_value);

  for (const value of bookingValues) {
    if (clientValues.has(value)) {
      return true;
    }
  }

  return false;
}

function getLatestRebookingToken(clientId: string, tokens: RebookingTokenRow[]) {
  const clientTokens = tokens
    .filter((token) => token.client_id === clientId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    clientTokens.find((token) => !token.revoked_at && new Date(token.expires_at).getTime() > Date.now()) ??
    clientTokens[0] ??
    null
  );
}

function validateClientInput(input: SaveClientInput) {
  const name = input.name.trim();
  const primaryContactValue = normalizePrimaryContactValue(input.primaryContactChannel, input.primaryContactValue);

  if (name.length < 2) {
    throw new Error("Client name is required.");
  }

  if (contactValueRequired(input.primaryContactChannel) && !primaryContactValue) {
    throw new Error("Client contact value is required.");
  }

  const phone = normalizeContactPhone(input.phone) || null;
  const instagramUsername = normalizeUsername(input.instagramUsername, "instagram");
  const telegramUsername = normalizeUsername(input.telegramUsername, "telegram");
  const whatsappPhone = normalizeContactPhone(input.whatsappPhone) || null;
  const viberPhone = normalizeContactPhone(input.viberPhone) || null;

  return {
    name,
    phone: input.primaryContactChannel === "phone" ? primaryContactValue : phone,
    instagram_username: input.primaryContactChannel === "instagram" ? primaryContactValue : instagramUsername,
    telegram_username: input.primaryContactChannel === "telegram" ? primaryContactValue : telegramUsername,
    whatsapp_phone: input.primaryContactChannel === "whatsapp" ? primaryContactValue : whatsappPhone,
    viber_phone: input.primaryContactChannel === "viber" ? primaryContactValue : viberPhone,
    primary_contact_channel: input.primaryContactChannel,
    primary_contact_value: primaryContactValue,
    locale: input.locale || null,
    notes: normalizeOptionalText(input.notes)
  };
}

export async function getClientsForDashboard(user: DashboardUser) {
  assertAdmin(user);

  const supabase = await createSupabaseServerClient();
  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select(clientColumnsWithTimestamps)
    .order("updated_at", { ascending: false })
    .limit(500);

  if (clientsError) {
    return { clients: [], error: true };
  }

  const clientRows = (clients ?? []) as ClientRow[];
  const clientIds = clientRows.map((client) => client.id);

  if (clientIds.length === 0) {
    return { clients: [], error: false };
  }

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(bookingColumnsWithContacts)
    .order("preferred_date", { ascending: false })
    .order("preferred_time", { ascending: false })
    .limit(1000);

  const { data: legacyBookings, error: legacyBookingsError } = bookingsError
    ? await supabase
        .from("bookings")
        .select(legacyBookingColumns)
        .order("preferred_date", { ascending: false })
        .order("preferred_time", { ascending: false })
        .limit(1000)
    : { data: null, error: null };
  const bookingRows = bookingsError
    ? legacyBookingsError
      ? []
      : ((legacyBookings ?? []) as ClientBookingRow[])
    : ((bookings ?? []) as ClientBookingRow[]);
  const { data: tokenRows } = await supabase
    .from("client_rebooking_tokens")
    .select("id, client_id, expires_at, revoked_at, last_used_at, use_count, created_at")
    .in("client_id", clientIds)
    .order("created_at", { ascending: false });
  const rebookingTokens = (tokenRows ?? []) as RebookingTokenRow[];

  return {
    clients: clientRows.map((client) =>
      toDashboardClient(
        client,
        bookingRows
          .filter((booking) => bookingMatchesClient(client, booking))
          .map(toDashboardClientBooking),
        (() => {
          const token = getLatestRebookingToken(client.id, rebookingTokens);
          return token ? toRebookingTokenMetadata(token) : null;
        })()
      )
    ),
    error: Boolean(bookingsError && legacyBookingsError)
  };
}

export async function saveClient(user: DashboardUser, input: SaveClientInput) {
  assertAdmin(user);

  const normalized = validateClientInput(input);
  const supabase = await createSupabaseServerClient();
  const result = input.id
    ? await supabase
        .from("clients")
        .update(normalized)
        .eq("id", input.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("clients")
        .insert(normalized)
        .select("id")
        .maybeSingle();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Client could not be saved.");
  }
}

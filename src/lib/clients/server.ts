import "server-only";

import { type Locale } from "@/i18n/config";
import {
  normalizeClientContact,
  normalizeContactPhone,
  normalizePrimaryContactValue,
  type BookingClient,
  type ClientContactChannel
} from "@/lib/clients/contact";
import { type Database } from "@/lib/supabase/database.types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FindOrCreateClientForBookingInput = {
  name: string;
  contactChannel: ClientContactChannel;
  contactValue?: string | null;
  phone?: string | null;
  locale?: Locale | null;
  notes?: string | null;
};

type ClientRow = {
  id: string;
  name: string;
  phone: string | null;
  instagram_username?: string | null;
  telegram_username?: string | null;
  whatsapp_phone?: string | null;
  viber_phone?: string | null;
  primary_contact_channel?: ClientContactChannel | null;
  primary_contact_value?: string | null;
  locale?: Locale | null;
  notes?: string | null;
};

function normalizeOptionalText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

export function toBookingClient(row: ClientRow): BookingClient {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    instagramUsername: row.instagram_username ?? null,
    telegramUsername: row.telegram_username ?? null,
    whatsappPhone: row.whatsapp_phone ?? null,
    viberPhone: row.viber_phone ?? null,
    primaryContactChannel: row.primary_contact_channel ?? null,
    primaryContactValue: row.primary_contact_value ?? null,
    locale: row.locale ?? null,
    notes: row.notes ?? null
  };
}

export const clientContactColumns =
  "id, name, phone, instagram_username, telegram_username, whatsapp_phone, viber_phone, primary_contact_channel, primary_contact_value, locale, notes";

export const legacyClientColumns = "id, name, phone, locale, notes";

async function maybeFindClientByColumn(column: string, value: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("clients").select(clientContactColumns).eq(column, value).limit(1).maybeSingle();

  if (error) {
    return null;
  }

  return data ? toBookingClient(data as ClientRow) : null;
}

async function maybeFindClientByPrimaryContact(channel: ClientContactChannel, value: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .select(clientContactColumns)
    .eq("primary_contact_channel", channel)
    .eq("primary_contact_value", value)
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data ? toBookingClient(data as ClientRow) : null;
}

export async function findExistingClientForBooking(input: FindOrCreateClientForBookingInput) {
  const contact = normalizeClientContact({
    channel: input.contactChannel,
    value: input.contactValue,
    phone: input.phone
  });
  const explicitPhone = normalizeContactPhone(input.phone);

  if (explicitPhone) {
    const byPhone =
      (await maybeFindClientByColumn("phone", explicitPhone)) ??
      (await maybeFindClientByColumn("whatsapp_phone", explicitPhone)) ??
      (await maybeFindClientByColumn("viber_phone", explicitPhone));

    if (byPhone) {
      return byPhone;
    }
  }

  if (input.contactChannel === "instagram" && contact.value) {
    return (await maybeFindClientByColumn("instagram_username", contact.value)) ?? null;
  }

  if (input.contactChannel === "telegram" && contact.value) {
    return (await maybeFindClientByColumn("telegram_username", contact.value)) ?? null;
  }

  if (input.contactChannel === "whatsapp" && contact.value) {
    return (await maybeFindClientByColumn("whatsapp_phone", contact.value)) ?? (await maybeFindClientByColumn("phone", contact.value));
  }

  if (input.contactChannel === "viber" && contact.value) {
    return (await maybeFindClientByColumn("viber_phone", contact.value)) ?? (await maybeFindClientByColumn("phone", contact.value));
  }

  if (input.contactChannel === "phone" && contact.value) {
    return (await maybeFindClientByColumn("phone", contact.value)) ?? null;
  }

  if (input.contactChannel === "other" && contact.value) {
    return maybeFindClientByPrimaryContact(input.contactChannel, contact.value);
  }

  return null;
}

type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];

function getClientInsertPayload(input: FindOrCreateClientForBookingInput): ClientInsert {
  const contact = normalizeClientContact({
    channel: input.contactChannel,
    value: input.contactValue,
    phone: input.phone
  });
  const name = input.name.trim();
  const payload: ClientInsert = {
    name,
    phone: input.contactChannel === "phone" ? contact.value : contact.phone,
    instagram_username: input.contactChannel === "instagram" ? contact.value : null,
    telegram_username: input.contactChannel === "telegram" ? contact.value : null,
    whatsapp_phone: input.contactChannel === "whatsapp" ? contact.value : null,
    viber_phone: input.contactChannel === "viber" ? contact.value : null,
    primary_contact_channel: contact.channel,
    primary_contact_value: contact.value,
    locale: input.locale ?? null,
    notes: normalizeOptionalText(input.notes)
  };

  if (input.contactChannel === "whatsapp" || input.contactChannel === "viber") {
    payload.phone = contact.phone;
  }

  return payload;
}

export async function findOrCreateClientForBooking(input: FindOrCreateClientForBookingInput) {
  const existingClient = await findExistingClientForBooking(input);

  if (existingClient) {
    return existingClient;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(getClientInsertPayload(input))
    .select(clientContactColumns)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Client could not be created.");
  }

  return toBookingClient(data as ClientRow);
}

export function getClientPrimaryContact(client: BookingClient) {
  const channel = client.primaryContactChannel;
  const value =
    client.primaryContactValue ??
    client.phone ??
    client.whatsappPhone ??
    client.viberPhone ??
    client.instagramUsername ??
    client.telegramUsername ??
    null;

  if (channel) {
    return {
      channel,
      value: channel === "walk_in" ? null : normalizePrimaryContactValue(channel, value)
    };
  }

  if (client.phone) {
    return { channel: "phone" as const, value: client.phone };
  }

  if (client.whatsappPhone) {
    return { channel: "whatsapp" as const, value: client.whatsappPhone };
  }

  if (client.viberPhone) {
    return { channel: "viber" as const, value: client.viberPhone };
  }

  if (client.instagramUsername) {
    return { channel: "instagram" as const, value: client.instagramUsername };
  }

  if (client.telegramUsername) {
    return { channel: "telegram" as const, value: client.telegramUsername };
  }

  return { channel: "walk_in" as const, value: null };
}

import { manualBookingSourceChannels, type ManualBookingSourceChannel } from "@/lib/dashboard/constants";
import { type Locale } from "@/i18n/config";

export type ClientContactChannel = ManualBookingSourceChannel;

export type BookingClient = {
  id: string;
  name: string;
  phone: string | null;
  instagramUsername: string | null;
  telegramUsername: string | null;
  whatsappPhone: string | null;
  viberPhone: string | null;
  primaryContactChannel: ClientContactChannel | null;
  primaryContactValue: string | null;
  locale: Locale | null;
  notes: string | null;
};

export type NormalizedClientContact = {
  channel: ClientContactChannel;
  value: string | null;
  phone: string | null;
  legacyPhoneSnapshot: string;
};

export function isClientContactChannel(channel: unknown): channel is ClientContactChannel {
  return typeof channel === "string" && manualBookingSourceChannels.includes(channel as ClientContactChannel);
}

export function contactValueRequired(channel: ClientContactChannel) {
  return channel !== "walk_in";
}

export function normalizeContactUsername(value: string) {
  const trimmed = value.trim().replace(/\s+/g, "");

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`;
}

export function normalizeContactPhone(value: string | null | undefined) {
  return value?.trim() ? value.trim() : "";
}

export function normalizePrimaryContactValue(channel: ClientContactChannel, value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed || channel === "walk_in") {
    return null;
  }

  if (channel === "instagram" || channel === "telegram") {
    return normalizeContactUsername(trimmed);
  }

  return trimmed;
}

export function normalizeClientContact(input: {
  channel: ClientContactChannel;
  value?: string | null;
  phone?: string | null;
}): NormalizedClientContact {
  const value = normalizePrimaryContactValue(input.channel, input.value);
  const phone = normalizeContactPhone(input.phone);
  const channelPhone = input.channel === "phone" || input.channel === "whatsapp" || input.channel === "viber" ? value : null;
  const resolvedPhone = channelPhone || phone || null;

  return {
    channel: input.channel,
    value,
    phone: resolvedPhone,
    legacyPhoneSnapshot: channelPhone ?? phone
  };
}

export function getClientContactLabel(
  channel: ClientContactChannel | null | undefined,
  value: string | null | undefined,
  labels: Record<ClientContactChannel, string>,
  emptyLabel: string
) {
  if (!channel) {
    return emptyLabel;
  }

  if (channel === "walk_in") {
    return labels.walk_in;
  }

  return value?.trim() ? `${labels[channel]}: ${value.trim()}` : labels[channel];
}

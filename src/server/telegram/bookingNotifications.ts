import "server-only";

import { type Locale } from "@/i18n/config";
import { type BookingStatus } from "@/lib/booking/booking-schema";
import { type ManualBookingSourceChannel } from "@/lib/dashboard/constants";
import { sendTelegramMessage } from "@/server/telegram/sendTelegramMessage";

type TelegramBookingSource = "website" | "dashboard" | string;

export type TelegramBookingDetails = {
  service: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes?: number | null;
  clientName: string;
  clientPhone: string;
  clientContactChannel?: ManualBookingSourceChannel | null;
  clientContactValue?: string | null;
  clientLocale: Locale;
  source: TelegramBookingSource;
  sourceChannel?: ManualBookingSourceChannel | null;
  therapistName?: string | null;
  clientComment?: string | null;
  internalNotes?: string | null;
  status?: BookingStatus;
  promotionTitle?: string | null;
};

type NotifyBookingStatusChangeInput = {
  booking: TelegramBookingDetails;
  oldStatus: BookingStatus;
  newStatus: BookingStatus;
  changedBy?: string | null;
};

type NotifyTherapistAssignmentChangeInput = {
  booking: TelegramBookingDetails;
  previousTherapistName?: string | null;
  nextTherapistName?: string | null;
};

const statusLabels = {
  pending: "Ожидает подтверждения",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
  completed: "Завершена"
} satisfies Record<BookingStatus, string>;

const sourceLabels = {
  website: "Сайт",
  dashboard: "Dashboard"
} satisfies Record<"website" | "dashboard", string>;

const channelLabels = {
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  telegram: "Telegram",
  viber: "Viber",
  phone: "Телефон",
  walk_in: "Пришёл лично",
  other: "Другое"
} satisfies Record<ManualBookingSourceChannel, string>;

const localeLabels = {
  sr: "Сербский",
  ru: "Русский",
  en: "Английский"
} satisfies Record<Locale, string>;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatValue(value: string | number | null | undefined, fallback = "Не указано") {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.toString().trim() ? value.toString().trim() : fallback;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function formatDuration(durationMinutes: number | null | undefined) {
  return durationMinutes ? `${durationMinutes} мин` : null;
}

function formatSource(source: TelegramBookingSource) {
  return source === "website" || source === "dashboard" ? sourceLabels[source] : formatValue(source);
}

function formatSourceChannel(channel: ManualBookingSourceChannel | null | undefined) {
  return channel ? channelLabels[channel] : null;
}

function formatClientContact(booking: TelegramBookingDetails) {
  if (booking.clientContactChannel) {
    if (booking.clientContactChannel === "walk_in") {
      return "Пришёл лично: контакт не указан";
    }

    return `${channelLabels[booking.clientContactChannel]}: ${formatValue(booking.clientContactValue)}`;
  }

  return formatValue(booking.clientPhone);
}

function formatTherapist(name: string | null | undefined) {
  return formatValue(name, "Не назначен");
}

function line(label: string, value: string | number | null | undefined, fallback?: string) {
  return `<b>${escapeHtml(label)}:</b> ${escapeHtml(formatValue(value, fallback))}`;
}

function optionalLine(label: string, value: string | number | null | undefined) {
  return formatValue(value, "") ? line(label, value) : null;
}

function getDashboardDayUrl(date: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!siteUrl) {
    return null;
  }

  try {
    const url = new URL("/ru/dashboard", siteUrl);
    url.searchParams.set("date", date);
    return url.toString();
  } catch (error) {
    console.error("[telegram] NEXT_PUBLIC_SITE_URL is invalid; dashboard button skipped.", error);
    return null;
  }
}

function dashboardButton(date: string) {
  const url = getDashboardDayUrl(date);

  return url
    ? {
        text: "Открыть день в dashboard",
        url
      }
    : null;
}

export async function notifyTelegramNewBooking(booking: TelegramBookingDetails) {
  try {
    const channel = formatSourceChannel(booking.sourceChannel);
    const lines = [
      "<b>Новая запись</b>",
      "",
      line("Услуга", booking.service),
      line("Дата", booking.preferredDate),
      line("Время", formatTime(booking.preferredTime)),
      optionalLine("Длительность", formatDuration(booking.durationMinutes)),
      line("Клиент", booking.clientName),
      line("Контакт", formatClientContact(booking)),
      line("Язык клиента", localeLabels[booking.clientLocale]),
      line("Источник", formatSource(booking.source)),
      channel ? line("Канал", channel) : null,
      optionalLine("Акция", booking.promotionTitle),
      line("Специалист", formatTherapist(booking.therapistName)),
      optionalLine("Комментарий клиента", booking.clientComment),
      booking.source === "dashboard" ? optionalLine("Внутренняя заметка", booking.internalNotes) : null
    ].filter((item): item is string => Boolean(item));

    await sendTelegramMessage({
      text: lines.join("\n"),
      button: dashboardButton(booking.preferredDate)
    });
  } catch (error) {
    console.error("[telegram] new booking notification failed", error);
  }
}

export async function notifyTelegramBookingStatusChange({
  booking,
  oldStatus,
  newStatus,
  changedBy
}: NotifyBookingStatusChangeInput) {
  try {
    const lines = [
      "<b>Статус записи изменён</b>",
      "",
      line("Клиент", booking.clientName),
      line("Услуга", booking.service),
      line("Дата", booking.preferredDate),
      line("Время", formatTime(booking.preferredTime)),
      line("Специалист", formatTherapist(booking.therapistName)),
      line("Старый статус", statusLabels[oldStatus]),
      line("Новый статус", statusLabels[newStatus]),
      optionalLine("Кто изменил", changedBy)
    ].filter((item): item is string => Boolean(item));

    await sendTelegramMessage({
      text: lines.join("\n"),
      button: dashboardButton(booking.preferredDate)
    });
  } catch (error) {
    console.error("[telegram] status change notification failed", error);
  }
}

export async function notifyTelegramTherapistAssignmentChange({
  booking,
  previousTherapistName,
  nextTherapistName
}: NotifyTherapistAssignmentChangeInput) {
  try {
    const hadPreviousTherapist = Boolean(previousTherapistName?.trim());
    const title = hadPreviousTherapist ? "Специалист изменён" : "Специалист назначен";
    const lines = [
      `<b>${title}</b>`,
      "",
      line("Клиент", booking.clientName),
      line("Услуга", booking.service),
      line("Дата", booking.preferredDate),
      line("Время", formatTime(booking.preferredTime)),
      line("Было", formatTherapist(previousTherapistName)),
      line("Стало", formatTherapist(nextTherapistName))
    ];

    await sendTelegramMessage({
      text: lines.join("\n"),
      button: dashboardButton(booking.preferredDate)
    });
  } catch (error) {
    console.error("[telegram] therapist assignment notification failed", error);
  }
}

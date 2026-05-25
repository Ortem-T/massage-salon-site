import { z } from "zod";

import { locales, type Locale } from "@/i18n/config";
import { type BookingFormValues } from "@/lib/booking/booking-schema";

function isValidDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const bookingRequestPayloadSchema = z.object({
  service: z.string().trim().min(1).max(120),
  specialist: z.string().trim().min(1).max(120),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDateValue),
  preferred_time: z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  client_name: z.string().trim().min(2).max(80),
  client_phone: z.string().trim().min(6).max(30),
  client_comment: z.string().trim().max(500).nullable(),
  locale: z.enum(locales),
  source: z.literal("website").default("website"),
  website: z.string().trim().max(120).optional()
});

export type BookingRequestPayload = z.infer<typeof bookingRequestPayloadSchema>;

export function toBookingRequestPayload(values: BookingFormValues & { siteLocale: Locale }): BookingRequestPayload {
  return {
    service: values.service,
    specialist: values.specialist,
    preferred_date: values.preferredDate,
    preferred_time: values.preferredTime,
    client_name: values.clientName.trim(),
    client_phone: values.phoneNumber.trim(),
    client_comment: values.comment?.trim() || null,
    locale: values.siteLocale,
    source: "website",
    website: values.website?.trim() || undefined
  };
}

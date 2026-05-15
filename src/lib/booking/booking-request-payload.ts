import { z } from "zod";

import { locales, type Locale } from "@/i18n/config";
import { type BookingFormValues } from "@/lib/booking/booking-schema";

export const bookingRequestPayloadSchema = z.object({
  service: z.string().trim().min(1).max(120),
  specialist: z.string().trim().min(1).max(120),
  preferred_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferred_time: z.string().trim().min(1).max(20),
  client_name: z.string().trim().min(2).max(120),
  client_phone: z.string().trim().min(6).max(40),
  client_comment: z.string().trim().max(500).nullable(),
  locale: z.enum(locales),
  source: z.literal("website").default("website")
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
    source: "website"
  };
}

import { z } from "zod";

export const bookingStatuses = ["pending", "confirmed", "cancelled", "completed"] as const;
export const bookingLanguages = ["sr", "ru", "en"] as const;

export type BookingStatus = (typeof bookingStatuses)[number];
export type BookingLanguage = (typeof bookingLanguages)[number];

export type BookingValidationMessages = {
  service: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  language: string;
  comment: string;
};

export function createBookingFormSchema(messages: BookingValidationMessages) {
  return z.object({
    service: z.string().min(1, messages.service),
    preferredDate: z.string().min(1, messages.date),
    preferredTime: z.string().min(1, messages.time),
    clientName: z.string().trim().min(2, messages.name),
    phoneNumber: z.string().trim().min(6, messages.phone),
    preferredLanguage: z.enum(bookingLanguages, { message: messages.language }),
    comment: z.string().max(500, messages.comment).optional()
  });
}

export type BookingFormValues = z.infer<ReturnType<typeof createBookingFormSchema>>;

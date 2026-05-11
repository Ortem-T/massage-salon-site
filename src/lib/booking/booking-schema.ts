import { z } from "zod";

export const bookingStatuses = ["pending", "confirmed", "cancelled", "completed"] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

export type BookingValidationMessages = {
  service: string;
  specialist: string;
  date: string;
  datePast: string;
  dateUnavailable: string;
  time: string;
  name: string;
  phone: string;
  comment: string;
};

type BookingFormSchemaOptions = {
  minDate?: string;
  isDateSelectable?: (value: string) => boolean;
};

export function createBookingFormSchema(messages: BookingValidationMessages, options: BookingFormSchemaOptions = {}) {
  return z.object({
    service: z.string().min(1, messages.service),
    specialist: z.string().min(1, messages.specialist),
    preferredDate: z.string().min(1, messages.date).refine(
      (value) => !value || !options.minDate || value >= options.minDate,
      { message: messages.datePast }
    ).refine(
      (value) => !value || !options.isDateSelectable || options.isDateSelectable(value),
      { message: messages.dateUnavailable }
    ),
    preferredTime: z.string().min(1, messages.time),
    clientName: z.string().trim().min(2, messages.name),
    phoneNumber: z.string().trim().min(6, messages.phone),
    comment: z.string().max(500, messages.comment).optional()
  });
}

export type BookingFormValues = z.infer<ReturnType<typeof createBookingFormSchema>>;

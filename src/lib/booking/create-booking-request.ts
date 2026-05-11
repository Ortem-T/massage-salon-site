import { type Locale } from "@/i18n/config";
import { type BookingFormValues, type BookingStatus } from "@/lib/booking/booking-schema";

export type BookingRequestInput = BookingFormValues & {
  siteLocale: Locale;
};

export type BookingRequest = BookingRequestInput & {
  status: BookingStatus;
  createdAt: string;
};

export async function createBookingRequest(values: BookingRequestInput): Promise<BookingRequest> {
  const request: BookingRequest = {
    ...values,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  console.log("Mock booking request", request);

  await new Promise((resolve) => globalThis.setTimeout(resolve, 700));

  return request;
}

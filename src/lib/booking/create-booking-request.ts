import { type Locale } from "@/i18n/config";
import { type BookingFormValues, type BookingStatus } from "@/lib/booking/booking-schema";
import { toBookingRequestPayload, type BookingRequestPayload } from "@/lib/booking/booking-request-payload";

export type BookingRequestInput = BookingFormValues & {
  siteLocale: Locale;
};

export type BookingRequest = BookingRequestPayload & {
  status: BookingStatus;
};

export async function createBookingRequest(values: BookingRequestInput): Promise<BookingRequest> {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toBookingRequestPayload(values))
  });

  if (!response.ok) {
    throw new Error("Booking request could not be created.");
  }

  const data = (await response.json()) as {
    booking: Pick<BookingRequest, "status">;
  };

  return {
    ...toBookingRequestPayload(values),
    ...data.booking
  };
}

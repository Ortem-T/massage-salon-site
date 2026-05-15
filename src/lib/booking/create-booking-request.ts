import { type Locale } from "@/i18n/config";
import { type BookingFormValues, type BookingStatus } from "@/lib/booking/booking-schema";
import { toBookingRequestPayload, type BookingRequestPayload } from "@/lib/booking/booking-request-payload";

export type BookingRequestInput = BookingFormValues & {
  siteLocale: Locale;
};

export type BookingRequest = BookingRequestPayload & {
  status: BookingStatus;
};

export class BookingRequestError extends Error {
  constructor(public readonly code: "slot_unavailable" | "unknown") {
    super("Booking request could not be created.");
    this.name = "BookingRequestError";
  }
}

export async function createBookingRequest(values: BookingRequestInput): Promise<BookingRequest> {
  const response = await fetch("/api/bookings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(toBookingRequestPayload(values))
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null) as { code?: string } | null;

    throw new BookingRequestError(data?.code === "slot_unavailable" ? "slot_unavailable" : "unknown");
  }

  const data = (await response.json()) as {
    booking: Pick<BookingRequest, "status">;
  };

  return {
    ...toBookingRequestPayload(values),
    ...data.booking
  };
}

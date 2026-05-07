import { type BookingFormValues, type BookingStatus } from "@/lib/booking/booking-schema";

export type BookingRequest = BookingFormValues & {
  status: BookingStatus;
  createdAt: string;
};

export async function createBookingRequest(values: BookingFormValues): Promise<BookingRequest> {
  const request: BookingRequest = {
    ...values,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  console.log("Mock booking request", request);

  await new Promise((resolve) => globalThis.setTimeout(resolve, 700));

  return request;
}

import { createBookingFormSchema, type BookingValidationMessages } from "@/lib/booking/booking-schema";

export type StoredBookingClient = {
  version: 1;
  name: string;
  phone: string;
  savedAt: string;
};

export const returningBookingClientStorageKey = "raine.booking.client.v1";

function isStoredBookingClient(value: unknown): value is StoredBookingClient {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<StoredBookingClient>;

  return (
    record.version === 1 &&
    typeof record.name === "string" &&
    typeof record.phone === "string" &&
    typeof record.savedAt === "string"
  );
}

export function readStoredBookingClient(messages: BookingValidationMessages) {
  try {
    const stored = window.localStorage.getItem(returningBookingClientStorageKey);

    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);

    if (!isStoredBookingClient(parsed)) {
      window.localStorage.removeItem(returningBookingClientStorageKey);
      return null;
    }

    const validation = createBookingFormSchema(messages).pick({
      clientName: true,
      phoneNumber: true
    });
    const result = validation.safeParse({
      clientName: parsed.name,
      phoneNumber: parsed.phone
    });

    if (!result.success) {
      window.localStorage.removeItem(returningBookingClientStorageKey);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredBookingClient(input: { name: string; phone: string }) {
  try {
    const value: StoredBookingClient = {
      version: 1,
      name: input.name.trim(),
      phone: input.phone.trim(),
      savedAt: new Date().toISOString()
    };

    window.localStorage.setItem(returningBookingClientStorageKey, JSON.stringify(value));
  } catch {
    // Booking should succeed even when browser storage is unavailable.
  }
}

export function clearStoredBookingClient() {
  try {
    window.localStorage.removeItem(returningBookingClientStorageKey);
  } catch {
    // Clearing is best-effort; private browsing modes may block storage.
  }
}

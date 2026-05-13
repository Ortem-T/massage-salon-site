export const manualBookingSourceChannels = [
  "instagram",
  "whatsapp",
  "telegram",
  "viber",
  "phone",
  "walk_in",
  "other"
] as const;

export type ManualBookingSourceChannel = (typeof manualBookingSourceChannels)[number];

export const manualBookingCreateStatuses = ["pending", "confirmed"] as const;

import { type Locale } from "@/i18n/config";

export const googleReviewUrl = "https://g.page/r/CbG6AlmShVWTEBM/review";

export const salonAddress = "Braće Popović 3g, 3. sprat, stan 13";

export const salonLandmark = "pet shop „Premium Pet“";

export const salonNotificationAddress: Record<Locale, string> = {
  sr: salonAddress,
  ru: "Braće Popović 3g, 3 этаж, квартира 13",
  en: "Braće Popović 3g, 3rd floor, apartment 13"
};

export const salonNotificationLandmark: Record<Locale, string> = {
  sr: salonLandmark,
  ru: "зоомагазин Premium Pet",
  en: "Premium Pet shop"
};

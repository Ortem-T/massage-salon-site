export const locales = ["sr", "ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "sr";

export const preferredLocaleCookieName = "raine-preferred-locale";

export const localeLabels: Record<Locale, string> = {
  sr: "SR",
  ru: "RU",
  en: "EN"
};

export const localeNames: Record<Locale, string> = {
  sr: "Srpski",
  ru: "Русский",
  en: "English"
};

export function isLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}

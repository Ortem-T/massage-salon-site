import { contactConfig } from "@/config/contacts";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

export const productionSiteUrl = "https://raine.rs";
export const siteUrl = productionSiteUrl;
export const siteName = "Raine";

export const openGraphLocales = {
  sr: "sr_RS",
  ru: "ru_RU",
  en: "en_US"
} satisfies Record<Locale, string>;

export const languageNames = {
  sr: "Serbian",
  ru: "Russian",
  en: "English"
} satisfies Record<Locale, string>;

export function getLocalizedUrl(locale: Locale) {
  return `${siteUrl}/${locale}`;
}

export function getLocalizedUrls() {
  return Object.fromEntries(locales.map((locale) => [locale, getLocalizedUrl(locale)])) as Record<Locale, string>;
}

export function getDefaultLocalizedUrl() {
  return getLocalizedUrl(defaultLocale);
}

export function getLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["HealthAndBeautyBusiness", "LocalBusiness"],
    "@id": `${siteUrl}/#localbusiness`,
    name: siteName,
    url: siteUrl,
    image: `${siteUrl}/images/spa-hero.png`,
    logo: `${siteUrl}/images/raine-logo-ui.png`,
    description: "Premium massage salon in Novi Sad with body and face treatments.",
    priceRange: "RSD",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Braće Popović 3g, stan 13",
      addressLocality: "Novi Sad",
      addressCountry: "RS"
    },
    areaServed: {
      "@type": "City",
      name: "Novi Sad"
    },
    openingHours: "Mo-Su 10:00-19:00",
    hasMap: contactConfig.googleMapsUrl,
    sameAs: [contactConfig.instagramUrl, contactConfig.telegramUrl],
    availableLanguage: locales.map((locale) => ({
      "@type": "Language",
      name: languageNames[locale]
    }))
  };
}

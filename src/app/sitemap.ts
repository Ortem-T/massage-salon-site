import type { MetadataRoute } from "next";

import { defaultLocale, locales } from "@/i18n/config";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://raine-spa.rs";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(locales.map((locale) => [locale, `${siteUrl}/${locale}`]));

  return locales.map((locale) => ({
    url: `${siteUrl}/${locale}`,
    lastModified: new Date(),
    alternates: {
      languages: {
        ...languages,
        "x-default": `${siteUrl}/${defaultLocale}`
      }
    }
  }));
}

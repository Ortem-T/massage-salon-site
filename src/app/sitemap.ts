import type { MetadataRoute } from "next";

import { getDefaultLocalizedUrl, getLocalizedUrl, getLocalizedUrls } from "@/config/seo";
import { locales } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = getLocalizedUrls();

  return locales.map((locale) => ({
    url: getLocalizedUrl(locale),
    lastModified: new Date(),
    alternates: {
      languages: {
        ...languages,
        "x-default": getDefaultLocalizedUrl()
      }
    }
  }));
}

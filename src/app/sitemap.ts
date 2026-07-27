import type { MetadataRoute } from "next";

import { getDefaultLocalizedUrl, getLocalizedUrl, getLocalizedUrls } from "@/config/seo";
import { locales } from "@/i18n/config";
import { serviceCategories } from "@/lib/services/categories";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages = getLocalizedUrls();

  const homePages = locales.map((locale) => ({
    url: getLocalizedUrl(locale),
    lastModified: new Date(),
    alternates: {
      languages: {
        ...languages,
        "x-default": getDefaultLocalizedUrl()
      }
    }
  }));

  const serviceCategoryPages = serviceCategories.flatMap((category) => {
    const path = `/services/${category}`;
    const categoryLanguages = getLocalizedUrls(path);

    return locales.map((locale) => ({
      url: getLocalizedUrl(locale, path),
      lastModified: new Date(),
      alternates: {
        languages: {
          ...categoryLanguages,
          "x-default": getDefaultLocalizedUrl(path)
        }
      }
    }));
  });

  return [...homePages, ...serviceCategoryPages];
}

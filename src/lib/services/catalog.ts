import { defaultLocale, type Locale } from "@/i18n/config";
import { createSupabasePublicClient } from "@/lib/supabase/client";

export const serviceCategories = ["face", "body"] as const;

export type ServiceCategory = (typeof serviceCategories)[number];

export type ServiceCatalogItem = {
  id: string;
  slug: string;
  category: ServiceCategory;
  durationMinutes: number;
  priceRsd: number | null;
  active: boolean;
  bookableOnline: boolean;
  sortOrder: number;
  allowedTherapistIds: string[];
  name: string;
  shortDescription: string;
  description: string | null;
};

type ServiceRow = {
  id: string;
  slug: string;
  category: string | null;
  duration_minutes: number;
  price_rsd: number | null;
  active: boolean;
  bookable_online?: boolean | null;
  sort_order?: number | null;
};

type ServiceTranslationRow = {
  service_id: string;
  locale: Locale;
  name: string;
  short_description: string;
  description: string | null;
};

type TherapistServiceRow = {
  therapist_id: string;
  service_id: string;
  active: boolean;
};

type ServiceCatalogOptions = {
  bookableOnlineOnly?: boolean;
};

const fallbackLocales = {
  sr: ["sr", "en", "ru"],
  ru: ["ru", "sr", "en"],
  en: ["en", "sr", "ru"]
} satisfies Record<Locale, Locale[]>;

function isServiceCategory(value: string | null): value is ServiceCategory {
  return serviceCategories.includes(value as ServiceCategory);
}

function humanizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTranslation(
  serviceId: string,
  locale: Locale,
  translationsByServiceId: Map<string, ServiceTranslationRow[]>,
  slug: string
) {
  const translations = translationsByServiceId.get(serviceId) ?? [];
  const localeOrder = Array.from(new Set([locale, ...fallbackLocales[locale], defaultLocale]));
  const translation = localeOrder
    .map((fallbackLocale) => translations.find((item) => item.locale === fallbackLocale))
    .find(Boolean);

  return {
    name: translation?.name ?? humanizeSlug(slug),
    shortDescription: translation?.short_description ?? "",
    description: translation?.description ?? null
  };
}

export function formatServiceDuration(durationMinutes: number, unit: string) {
  return `${durationMinutes} ${unit}`;
}

export function formatServicePrice(priceRsd: number | null, locale: Locale) {
  if (priceRsd === null) {
    return "";
  }

  const numberLocale = locale === "sr" ? "sr-Latn-RS" : locale === "ru" ? "ru-RU" : "en-GB";

  return `${new Intl.NumberFormat(numberLocale).format(priceRsd)} RSD`;
}

export function getAllowedTherapistIdsForService(serviceCatalog: ServiceCatalogItem[], serviceSlug: string) {
  return serviceCatalog.find((service) => service.slug === serviceSlug)?.allowedTherapistIds ?? [];
}

export function isTherapistAllowedForService(
  serviceCatalog: ServiceCatalogItem[],
  serviceSlug: string,
  therapistId: string | null | undefined
) {
  if (!therapistId) {
    return false;
  }

  return getAllowedTherapistIdsForService(serviceCatalog, serviceSlug).includes(therapistId);
}

export async function getServiceCatalog(
  locale: Locale,
  options: ServiceCatalogOptions = {}
): Promise<ServiceCatalogItem[]> {
  try {
    const supabase = createSupabasePublicClient();
    const query = supabase
      .from("services")
      .select("id, slug, category, duration_minutes, price_rsd, active, bookable_online, sort_order")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("slug", { ascending: true });

    if (options.bookableOnlineOnly ?? true) {
      query.eq("bookable_online", true);
    }

    const { data: services, error: servicesError } = await query;

    if (servicesError || !services?.length) {
      return [];
    }

    const serviceRows = services as ServiceRow[];
    const serviceIds = serviceRows.map((service) => service.id);
    const translationLocales = Array.from(new Set([locale, ...fallbackLocales[locale], defaultLocale]));
    const { data: translations, error: translationsError } = await supabase
      .from("service_translations")
      .select("service_id, locale, name, short_description, description")
      .in("service_id", serviceIds)
      .in("locale", translationLocales);

    const translationsByServiceId = new Map<string, ServiceTranslationRow[]>();

    if (!translationsError) {
      (translations as ServiceTranslationRow[] | null)?.forEach((translation) => {
        const existing = translationsByServiceId.get(translation.service_id) ?? [];
        existing.push(translation);
        translationsByServiceId.set(translation.service_id, existing);
      });
    }

    const { data: therapistServices, error: therapistServicesError } = await supabase
      .from("therapist_services")
      .select("therapist_id, service_id, active")
      .in("service_id", serviceIds)
      .eq("active", true);
    const allowedTherapistsByServiceId = new Map<string, string[]>();

    if (!therapistServicesError) {
      (therapistServices as TherapistServiceRow[] | null)?.forEach((relationship) => {
        const existing = allowedTherapistsByServiceId.get(relationship.service_id) ?? [];
        existing.push(relationship.therapist_id);
        allowedTherapistsByServiceId.set(relationship.service_id, existing);
      });
    }

    return serviceRows.flatMap((service) => {
      if (!isServiceCategory(service.category)) {
        return [];
      }

      const translation = getTranslation(service.id, locale, translationsByServiceId, service.slug);

      return [
        {
          id: service.id,
          slug: service.slug,
          category: service.category,
          durationMinutes: service.duration_minutes,
          priceRsd: service.price_rsd,
          active: service.active,
          bookableOnline: service.bookable_online ?? true,
          sortOrder: service.sort_order ?? 0,
          allowedTherapistIds: allowedTherapistsByServiceId.get(service.id) ?? [],
          ...translation
        }
      ];
    });
  } catch {
    return [];
  }
}

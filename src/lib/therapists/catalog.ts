import { defaultLocale, type Locale } from "@/i18n/config";
import { createSupabasePublicClient } from "@/lib/supabase/client";

export type TherapistCatalogItem = {
  id: string;
  displayName: string;
  publicTitle: string | null;
};

type TherapistRow = {
  id: string;
  display_name: string;
  active: boolean;
};

type TherapistTranslationRow = {
  therapist_id: string;
  locale: Locale;
  display_name: string;
  public_title: string | null;
};

const fallbackLocales = {
  sr: ["sr", "en", "ru"],
  ru: ["ru", "sr", "en"],
  en: ["en", "sr", "ru"]
} satisfies Record<Locale, Locale[]>;

function getTranslation(
  therapist: TherapistRow,
  locale: Locale,
  translationsByTherapistId: Map<string, TherapistTranslationRow[]>
) {
  const translations = translationsByTherapistId.get(therapist.id) ?? [];
  const localeOrder = Array.from(new Set([locale, ...fallbackLocales[locale], defaultLocale]));
  const translation = localeOrder
    .map((fallbackLocale) => translations.find((item) => item.locale === fallbackLocale))
    .find(Boolean);

  return {
    displayName: translation?.display_name ?? therapist.display_name,
    publicTitle: translation?.public_title ?? null
  };
}

export async function getTherapistCatalog(locale: Locale): Promise<TherapistCatalogItem[]> {
  try {
    const supabase = createSupabasePublicClient();
    const { data: therapists, error: therapistsError } = await supabase
      .from("therapists")
      .select("id, display_name, active")
      .eq("active", true)
      .order("display_name", { ascending: true });

    if (therapistsError || !therapists?.length) {
      return [];
    }

    const therapistRows = therapists as TherapistRow[];
    const therapistIds = therapistRows.map((therapist) => therapist.id);
    const translationLocales = Array.from(new Set([locale, ...fallbackLocales[locale], defaultLocale]));
    const { data: translations, error: translationsError } = await supabase
      .from("therapist_translations")
      .select("therapist_id, locale, display_name, public_title")
      .in("therapist_id", therapistIds)
      .in("locale", translationLocales);

    const translationsByTherapistId = new Map<string, TherapistTranslationRow[]>();

    if (!translationsError) {
      (translations as TherapistTranslationRow[] | null)?.forEach((translation) => {
        const existing = translationsByTherapistId.get(translation.therapist_id) ?? [];
        existing.push(translation);
        translationsByTherapistId.set(translation.therapist_id, existing);
      });
    }

    return therapistRows.map((therapist) => ({
      id: therapist.id,
      ...getTranslation(therapist, locale, translationsByTherapistId)
    }));
  } catch {
    return [];
  }
}

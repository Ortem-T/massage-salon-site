import { defaultLocale, type Locale } from "@/i18n/config";
import { createSupabasePublicClient } from "@/lib/supabase/client";

export const promotionPlacements = ["booking_section_card"] as const;

export type PromotionPlacement = (typeof promotionPlacements)[number];

export type ActivePromotion = {
  id: string;
  placement: PromotionPlacement;
  badge: string | null;
  title: string;
  description: string;
  telegramTitle: string;
};

type PromotionRow = {
  id: string;
  placement: PromotionPlacement;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type PromotionTranslationRow = {
  promotion_id: string;
  locale: Locale;
  badge: string | null;
  title: string;
  description: string;
};

const fallbackLocales = {
  sr: ["sr", "ru", "en"],
  ru: ["ru", "sr", "en"],
  en: ["en", "sr", "ru"]
} satisfies Record<Locale, Locale[]>;

function isPromotionPlacement(value: string): value is PromotionPlacement {
  return promotionPlacements.includes(value as PromotionPlacement);
}

function isActiveNow(promotion: PromotionRow, now = new Date()) {
  const startsAt = promotion.starts_at ? new Date(promotion.starts_at) : null;
  const endsAt = promotion.ends_at ? new Date(promotion.ends_at) : null;

  return (
    promotion.active &&
    (!startsAt || startsAt <= now) &&
    (!endsAt || endsAt >= now)
  );
}

function pickTranslation(
  promotionId: string,
  locale: Locale,
  translations: PromotionTranslationRow[]
) {
  const localeOrder = Array.from(new Set([locale, ...fallbackLocales[locale], defaultLocale]));

  return localeOrder
    .map((fallbackLocale) =>
      translations.find((translation) => translation.promotion_id === promotionId && translation.locale === fallbackLocale)
    )
    .find(Boolean);
}

export async function getActivePromotionForPlacement(
  locale: Locale,
  placement: PromotionPlacement = "booking_section_card"
): Promise<ActivePromotion | null> {
  try {
    const supabase = createSupabasePublicClient();
    const { data: promotions, error: promotionsError } = await supabase
      .from("promotions")
      .select("id, placement, active, starts_at, ends_at, created_at, updated_at")
      .eq("placement", placement)
      .eq("active", true)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5);

    if (promotionsError || !promotions?.length) {
      return null;
    }

    const activePromotion = ((promotions ?? []) as PromotionRow[]).find(
      (promotion) => isPromotionPlacement(promotion.placement) && isActiveNow(promotion)
    );

    if (!activePromotion) {
      return null;
    }

    const translationLocales = Array.from(new Set([locale, ...fallbackLocales[locale], defaultLocale]));
    const { data: translations, error: translationsError } = await supabase
      .from("promotion_translations")
      .select("promotion_id, locale, badge, title, description")
      .eq("promotion_id", activePromotion.id)
      .in("locale", translationLocales);

    if (translationsError) {
      return null;
    }

    const translationRows = (translations ?? []) as PromotionTranslationRow[];
    const selectedTranslation = pickTranslation(activePromotion.id, locale, translationRows);
    const russianTranslation = translationRows.find((translation) => translation.locale === "ru");

    if (!selectedTranslation) {
      return null;
    }

    return {
      id: activePromotion.id,
      placement: activePromotion.placement,
      badge: selectedTranslation.badge,
      title: selectedTranslation.title,
      description: selectedTranslation.description,
      telegramTitle: russianTranslation?.title ?? selectedTranslation.title
    };
  } catch {
    return null;
  }
}

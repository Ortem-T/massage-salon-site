import { type Locale, locales } from "@/i18n/config";
import { DashboardForbiddenError } from "@/lib/dashboard/bookings";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { type PromotionPlacement } from "@/lib/promotions/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type DashboardPromotionTranslation = {
  locale: Locale;
  badge: string | null;
  title: string;
  description: string;
};

export type DashboardPromotion = {
  id: string;
  active: boolean;
  placement: PromotionPlacement;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  translations: DashboardPromotionTranslation[];
};

export type PromotionTranslationInput = {
  badge?: string | null;
  title: string;
  description: string;
};

export type SavePromotionInput = {
  id?: string | null;
  active: boolean;
  placement: PromotionPlacement;
  startsAt?: string | null;
  endsAt?: string | null;
  translations: Record<Locale, PromotionTranslationInput>;
};

type PromotionRow = {
  id: string;
  active: boolean;
  placement: PromotionPlacement;
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

function assertAdmin(user: DashboardUser) {
  if (user.role !== "admin") {
    throw new DashboardForbiddenError();
  }
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ? value.trim() : null;
}

function normalizeDateTime(value: string | null | undefined) {
  return value?.trim() ? new Date(value).toISOString() : null;
}

function toDashboardPromotion(row: PromotionRow, translations: PromotionTranslationRow[]): DashboardPromotion {
  return {
    id: row.id,
    active: row.active,
    placement: row.placement,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    translations: translations.map((translation) => ({
      locale: translation.locale,
      badge: translation.badge,
      title: translation.title,
      description: translation.description
    }))
  };
}

function validatePromotionInput(input: SavePromotionInput) {
  if (input.placement !== "booking_section_card") {
    throw new Error("Invalid promotion placement.");
  }

  for (const locale of locales) {
    const translation = input.translations[locale];

    if (!translation?.title.trim() || !translation.description.trim()) {
      throw new Error("Promotion translations are required.");
    }
  }

  const startsAt = normalizeDateTime(input.startsAt);
  const endsAt = normalizeDateTime(input.endsAt);

  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("Promotion start date must be before end date.");
  }

  return {
    active: Boolean(input.active),
    placement: input.placement,
    startsAt,
    endsAt,
    translations: locales.map((locale) => ({
      locale,
      badge: normalizeText(input.translations[locale].badge),
      title: input.translations[locale].title.trim(),
      description: input.translations[locale].description.trim()
    }))
  };
}

export async function getPromotionsForDashboard(user: DashboardUser) {
  assertAdmin(user);

  const supabase = await createSupabaseServerClient();
  const { data: promotions, error: promotionsError } = await supabase
    .from("promotions")
    .select("id, active, placement, starts_at, ends_at, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (promotionsError) {
    return { promotions: [], error: true };
  }

  const promotionRows = (promotions ?? []) as PromotionRow[];
  const promotionIds = promotionRows.map((promotion) => promotion.id);

  if (promotionIds.length === 0) {
    return { promotions: [], error: false };
  }

  const { data: translations, error: translationsError } = await supabase
    .from("promotion_translations")
    .select("promotion_id, locale, badge, title, description")
    .in("promotion_id", promotionIds);

  const translationRows = translationsError ? [] : ((translations ?? []) as PromotionTranslationRow[]);

  return {
    promotions: promotionRows.map((promotion) =>
      toDashboardPromotion(
        promotion,
        translationRows.filter((translation) => translation.promotion_id === promotion.id)
      )
    ),
    error: Boolean(translationsError)
  };
}

export async function savePromotion(user: DashboardUser, input: SavePromotionInput) {
  assertAdmin(user);

  const normalized = validatePromotionInput(input);
  const supabase = await createSupabaseServerClient();
  const promotionPayload = {
    active: normalized.active,
    placement: normalized.placement,
    starts_at: normalized.startsAt,
    ends_at: normalized.endsAt
  };
  const result = input.id
    ? await supabase
        .from("promotions")
        .update(promotionPayload)
        .eq("id", input.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("promotions")
        .insert(promotionPayload)
        .select("id")
        .maybeSingle();

  if (result.error || !result.data) {
    throw new Error(result.error?.message ?? "Promotion could not be saved.");
  }

  const promotionId = result.data.id;
  const { error: translationsError } = await supabase.from("promotion_translations").upsert(
    normalized.translations.map((translation) => ({
      promotion_id: promotionId,
      locale: translation.locale,
      badge: translation.badge,
      title: translation.title,
      description: translation.description
    })),
    { onConflict: "promotion_id,locale" }
  );

  if (translationsError) {
    throw new Error(translationsError.message);
  }
}

export async function setPromotionActive(user: DashboardUser, id: string, active: boolean) {
  assertAdmin(user);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("promotions")
    .update({ active })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message ?? "Promotion could not be updated.");
  }
}

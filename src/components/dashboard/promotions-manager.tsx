"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { locales, type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import {
  savePromotionAction,
  setPromotionActiveAction,
  type DashboardActionResult
} from "@/lib/dashboard/actions";
import { type DashboardPromotion, type SavePromotionInput } from "@/lib/dashboard/promotions";
import { type PromotionPlacement } from "@/lib/promotions/public";
import { cn } from "@/lib/utils";

type PromotionFormTranslation = {
  badge: string;
  title: string;
  description: string;
};

type PromotionFormState = {
  id: string | null;
  active: boolean;
  placement: PromotionPlacement;
  startsAt: string;
  endsAt: string;
  translations: Record<Locale, PromotionFormTranslation>;
};

type PromotionsManagerProps = {
  dataError: boolean;
  dictionary: Dictionary;
  locale: Locale;
  promotions: DashboardPromotion[];
};

function toDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 16);
}

function emptyTranslations(): Record<Locale, PromotionFormTranslation> {
  return {
    sr: { badge: "", title: "", description: "" },
    ru: { badge: "", title: "", description: "" },
    en: { badge: "", title: "", description: "" }
  };
}

function getPromotionTranslation(promotion: DashboardPromotion, locale: Locale) {
  return (
    promotion.translations.find((translation) => translation.locale === locale) ??
    promotion.translations.find((translation) => translation.locale === "sr") ??
    promotion.translations.find((translation) => translation.locale === "ru") ??
    promotion.translations[0]
  );
}

function toFormState(promotion?: DashboardPromotion | null): PromotionFormState {
  if (!promotion) {
    return {
      id: null,
      active: false,
      placement: "booking_section_card",
      startsAt: "",
      endsAt: "",
      translations: emptyTranslations()
    };
  }

  const translations = emptyTranslations();

  promotion.translations.forEach((translation) => {
    translations[translation.locale] = {
      badge: translation.badge ?? "",
      title: translation.title,
      description: translation.description
    };
  });

  return {
    id: promotion.id,
    active: promotion.active,
    placement: promotion.placement,
    startsAt: toDateTimeLocal(promotion.startsAt),
    endsAt: toDateTimeLocal(promotion.endsAt),
    translations
  };
}

function toActionMessage(result: DashboardActionResult, dictionary: Dictionary) {
  if (result.ok) {
    return dictionary.dashboard.promotions.messages.saved;
  }

  return result.reason === "forbidden"
    ? dictionary.dashboard.promotions.forbidden
    : dictionary.dashboard.promotions.messages.error;
}

export function PromotionsManager({ dataError, dictionary, locale, promotions }: PromotionsManagerProps) {
  const copy = dictionary.dashboard.promotions;
  const [form, setForm] = useState<PromotionFormState>(() => toFormState(promotions[0]));
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedPromotionId = form.id;
  const selectedTranslation = form.translations[locale];
  const listItems = useMemo(
    () =>
      promotions.map((promotion) => ({
        promotion,
        translation: getPromotionTranslation(promotion, locale)
      })),
    [locale, promotions]
  );

  function updateField<K extends keyof PromotionFormState>(field: K, value: PromotionFormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  function updateTranslation(localeKey: Locale, field: keyof PromotionFormTranslation, value: string) {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [localeKey]: {
          ...current.translations[localeKey],
          [field]: value
        }
      }
    }));
  }

  function startCreate() {
    setForm(toFormState(null));
    setMessage(null);
  }

  function editPromotion(promotion: DashboardPromotion) {
    setForm(toFormState(promotion));
    setMessage(null);
  }

  function savePromotion() {
    const payload: SavePromotionInput = {
      id: form.id,
      active: form.active,
      placement: form.placement,
      startsAt: form.startsAt || null,
      endsAt: form.endsAt || null,
      translations: form.translations
    };

    setMessage(null);
    startTransition(async () => {
      setMessage(toActionMessage(await savePromotionAction(locale, payload), dictionary));
    });
  }

  function togglePromotion(promotion: DashboardPromotion) {
    setMessage(null);
    startTransition(async () => {
      const result = await setPromotionActiveAction(locale, {
        id: promotion.id,
        active: !promotion.active
      });

      if (result.ok) {
        setMessage(promotion.active ? copy.messages.disabled : copy.messages.enabled);
        return;
      }

      setMessage(toActionMessage(result, dictionary));
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/82 p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{copy.eyebrow}</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold leading-tight text-primary">{copy.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
          </div>
          <Button type="button" onClick={startCreate}>{copy.create}</Button>
        </div>
        {dataError ? (
          <p className="mt-5 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm leading-6 text-foreground">
            {copy.messages.error}
          </p>
        ) : null}
        {message ? (
          <p className="mt-5 rounded-2xl border border-primary/15 bg-secondary/60 px-4 py-3 text-sm font-semibold text-primary">
            {message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5">
          <h2 className="text-lg font-semibold text-primary">{copy.listTitle}</h2>
          <div className="mt-4 space-y-3">
            {listItems.length > 0 ? (
              listItems.map(({ promotion, translation }) => (
                <article
                  key={promotion.id}
                  className={cn(
                    "rounded-2xl border border-border/70 bg-background/50 p-4",
                    selectedPromotionId === promotion.id && "border-primary/30 bg-secondary/45"
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                        {promotion.active ? copy.active : copy.inactive}
                      </p>
                      <h3 className="mt-2 text-base font-semibold text-primary">{translation?.title ?? copy.untitled}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {copy.placementLabels[promotion.placement]}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => editPromotion(promotion)}>
                        {copy.edit}
                      </Button>
                      <Button type="button" variant="secondary" size="sm" onClick={() => togglePromotion(promotion)}>
                        {promotion.active ? copy.disable : copy.enable}
                      </Button>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border/80 p-5 text-sm leading-6 text-muted-foreground">
                {copy.noPromotions}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                {form.id ? copy.edit : copy.create}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-primary">{copy.formTitle}</h2>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-primary">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateField("active", event.target.checked)}
                className="size-4 accent-primary"
              />
              {copy.active}
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <label htmlFor="promotion-placement" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {copy.fields.placement}
              </label>
              <Select
                id="promotion-placement"
                value={form.placement}
                onChange={(event) => updateField("placement", event.target.value as PromotionPlacement)}
              >
                <option value="booking_section_card">{copy.placementLabels.booking_section_card}</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="promotion-start" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {copy.fields.startsAt}
              </label>
              <Input
                id="promotion-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => updateField("startsAt", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="promotion-end" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {copy.fields.endsAt}
              </label>
              <Input
                id="promotion-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(event) => updateField("endsAt", event.target.value)}
              />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {locales.map((localeKey) => (
              <fieldset key={localeKey} className="rounded-2xl border border-border/70 bg-background/45 p-4">
                <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                  {localeKey.toUpperCase()}
                </legend>
                <div className="mt-3 grid gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.fields.badge}
                      <Input
                        className="mt-2"
                        value={form.translations[localeKey].badge}
                        onChange={(event) => updateTranslation(localeKey, "badge", event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.fields.title}
                      <Input
                        className="mt-2"
                        required
                        value={form.translations[localeKey].title}
                        onChange={(event) => updateTranslation(localeKey, "title", event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {copy.fields.description}
                      <Textarea
                        className="mt-2"
                        required
                        value={form.translations[localeKey].description}
                        onChange={(event) => updateTranslation(localeKey, "description", event.target.value)}
                      />
                    </label>
                  </div>
                </div>
              </fieldset>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-primary/12 bg-secondary/45 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">{copy.preview}</p>
            <div className="mt-4 rounded-xl border border-border/70 bg-background/72 p-5">
              <div className="mb-4 h-px w-16 bg-accent/55" />
              {selectedTranslation.badge ? (
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {selectedTranslation.badge}
                </p>
              ) : null}
              <p className="font-serif text-3xl leading-[0.96] text-primary">
                {selectedTranslation.title || copy.previewTitleFallback}
              </p>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                {selectedTranslation.description || copy.previewDescriptionFallback}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="button" onClick={savePromotion} disabled={isPending}>
              {isPending ? copy.saving : copy.save}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

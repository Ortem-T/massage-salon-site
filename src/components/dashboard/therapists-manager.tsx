"use client";

import { CalendarCheck2, Clipboard, ExternalLink, RefreshCw, ShieldCheck, Unlink } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  generateSredimeCalendarLinkAction,
  revokeSredimeCalendarLinkAction
} from "@/lib/dashboard/actions";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import {
  type SredimeCalendarTokenMetadata,
  type SredimeTherapistCalendar
} from "@/lib/integrations/sredime/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TherapistsManagerProps = {
  calendars: SredimeTherapistCalendar[];
  dataError: boolean;
  dictionary: Dictionary;
  locale: Locale;
};

type CalendarState = {
  calendarUrl?: string;
  token: SredimeCalendarTokenMetadata | null;
};

const dateLocales = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-US"
} satisfies Record<Locale, string>;

function formatDateTime(value: string | null, locale: Locale, fallback: string) {
  if (!value) {
    return fallback;
  }

  return new Intl.DateTimeFormat(dateLocales[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Belgrade"
  }).format(new Date(value));
}

export function TherapistsManager({ calendars, dataError, dictionary, locale }: TherapistsManagerProps) {
  const page = dictionary.dashboard.pages.therapists;
  const copy = dictionary.dashboard.therapistsManagement;
  const [statesByTherapist, setStatesByTherapist] = useState<Record<string, CalendarState>>(() =>
    Object.fromEntries(calendars.map((calendar) => [calendar.therapistId, { token: calendar.token }]))
  );
  const [pendingTherapistId, setPendingTherapistId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectedCount = useMemo(
    () => Object.values(statesByTherapist).filter((state) => state.token?.status === "active").length,
    [statesByTherapist]
  );

  function updateTherapistState(therapistId: string, nextState: CalendarState) {
    setStatesByTherapist((current) => ({
      ...current,
      [therapistId]: nextState
    }));
  }

  function generateLink(therapistId: string) {
    setMessage(null);
    setPendingTherapistId(therapistId);

    startTransition(async () => {
      const result = await generateSredimeCalendarLinkAction(locale, { therapistId });

      if (result.ok) {
        updateTherapistState(therapistId, {
          calendarUrl: result.calendarUrl,
          token: result.token
        });
        setMessage(copy.messages.generated);
      } else {
        setMessage(copy.messages.error);
      }

      setPendingTherapistId(null);
    });
  }

  function revokeLink(therapistId: string) {
    setMessage(null);
    setPendingTherapistId(therapistId);

    startTransition(async () => {
      const result = await revokeSredimeCalendarLinkAction(locale, { therapistId });

      if (result.ok) {
        updateTherapistState(therapistId, {
          token: result.token
        });
        setMessage(copy.messages.revoked);
      } else {
        setMessage(copy.messages.error);
      }

      setPendingTherapistId(null);
    });
  }

  async function copyLink(calendarUrl: string) {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setMessage(copy.actions.copied);
    } catch {
      setMessage(copy.messages.copyFailed);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/72 p-5 shadow-soft sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {page.eyebrow}
        </p>
        <div className="mt-3 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px] lg:items-end">
          <div className="max-w-3xl">
            <h1 className="font-serif text-4xl font-medium leading-tight text-primary sm:text-5xl">
              {page.title}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{page.body}</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
            <p className="text-sm text-muted-foreground">SrediMe</p>
            <p className="mt-1 text-3xl font-semibold text-primary">
              {connectedCount}/{calendars.length}
            </p>
          </div>
        </div>
      </section>

      {dataError ? (
        <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm font-semibold text-primary">
          {copy.dataError}
        </div>
      ) : null}

      {message ? (
        <div className="rounded-2xl border border-primary/15 bg-primary/10 p-4 text-sm font-semibold text-primary">
          {message}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          {calendars.map((calendar) => {
            const state = statesByTherapist[calendar.therapistId] ?? { token: calendar.token };
            const token = state.token;
            const isActive = token?.status === "active";
            const isWorking = isPending && pendingTherapistId === calendar.therapistId;
            const calendarUrl = state.calendarUrl;

            return (
              <article
                key={calendar.therapistId}
                className="rounded-3xl border border-border/70 bg-background/62 p-5 shadow-soft transition hover:border-primary/18 hover:bg-card/72"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-2xl font-semibold text-primary">{calendar.displayName}</h2>
                      {!calendar.active ? (
                        <span className="rounded-full border border-border/70 bg-secondary/60 px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {copy.inactive}
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                          isActive
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border/70 bg-secondary/55 text-muted-foreground"
                        )}
                      >
                        <CalendarCheck2 aria-hidden className="size-3.5" />
                        {isActive ? copy.active : copy.notConnected}
                      </span>
                    </div>

                    <dl className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      <div>
                        <dt className="font-semibold text-primary">{copy.createdAt}</dt>
                        <dd>{formatDateTime(token?.createdAt ?? null, locale, "—")}</dd>
                      </div>
                      <div>
                        <dt className="font-semibold text-primary">{copy.lastUsedAt}</dt>
                        <dd>{formatDateTime(token?.lastUsedAt ?? null, locale, copy.neverUsed)}</dd>
                      </div>
                    </dl>

                    {isActive && !calendarUrl ? (
                      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
                        {copy.linkHidden}
                      </p>
                    ) : null}

                    {calendarUrl ? (
                      <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
                        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {copy.generatedUrlLabel}
                        </label>
                        <p className="mt-2 break-all text-sm font-semibold text-primary">{calendarUrl}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[320px] lg:justify-end">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => generateLink(calendar.therapistId)}
                      disabled={isWorking || !calendar.active}
                    >
                      <RefreshCw aria-hidden />
                      {isWorking ? copy.actions.working : isActive ? copy.actions.regenerate : copy.actions.generate}
                    </Button>
                    {calendarUrl ? (
                      <>
                        <Button type="button" size="sm" variant="outline" onClick={() => copyLink(calendarUrl)}>
                          <Clipboard aria-hidden />
                          {copy.actions.copy}
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <a href={calendarUrl} target="_blank" rel="noreferrer">
                            <ExternalLink aria-hidden />
                            {copy.actions.open}
                          </a>
                        </Button>
                      </>
                    ) : null}
                    {isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:text-primary"
                        onClick={() => revokeLink(calendar.therapistId)}
                        disabled={isWorking}
                      >
                        <Unlink aria-hidden />
                        {copy.actions.revoke}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border/70 bg-card/70 p-5 shadow-soft">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck aria-hidden className="size-5" />
              <h2 className="text-xl font-semibold">{copy.sectionTitle}</h2>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.helper}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.privacy}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.oneWay}</p>
          </div>

          <div className="rounded-3xl border border-border/70 bg-background/60 p-5">
            <h2 className="text-xl font-semibold text-primary">{copy.setupTitle}</h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              {copy.setupSteps.map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </section>
    </div>
  );
}

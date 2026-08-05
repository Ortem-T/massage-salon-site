"use client";

import { useState, useTransition, type FormEvent } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { type Locale } from "@/i18n/config";
import {
  sendTelegramDailyScheduleTestAction,
  updateTelegramDailyScheduleSettingsAction
} from "@/lib/dashboard/actions";
import { type DashboardTelegramSettings } from "@/lib/dashboard/settings";

type TelegramSettingsCopy = {
  title: string;
  subtitle: string;
  dailySchedule: string;
  sendDailySchedule: string;
  sendTime: string;
  timezoneHelper: string;
  enabled: string;
  disabled: string;
  save: string;
  saving: string;
  sendTestSummary: string;
  sendingTest: string;
  lastSuccessfulSend: string;
  neverSent: string;
  messages: {
    saved: string;
    testSent: string;
    testFailed: string;
    error: string;
  };
};

type ManagementTelegramSettingsFormProps = {
  copy: TelegramSettingsCopy;
  initialSettings: DashboardTelegramSettings;
  locale: Locale;
};

const localeDateFormats = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-US"
} satisfies Record<Locale, string>;

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getDailyScheduleTimeOptions(selectedTime: string) {
  const baseOptions = Array.from({ length: 24 * 4 }, (_, index) => minutesToTime(index * 15));

  if (!selectedTime || baseOptions.includes(selectedTime)) {
    return baseOptions;
  }

  return [...baseOptions, selectedTime].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

export function ManagementTelegramSettingsForm({
  copy,
  initialSettings,
  locale
}: ManagementTelegramSettingsFormProps) {
  const [enabled, setEnabled] = useState(initialSettings.dailyScheduleEnabled);
  const [sendTime, setSendTime] = useState(initialSettings.dailyScheduleTime);
  const [message, setMessage] = useState<string | null>(initialSettings.error ? copy.messages.error : null);
  const [messageTone, setMessageTone] = useState<"success" | "error">(initialSettings.error ? "error" : "success");
  const [isSaving, startSavingTransition] = useTransition();
  const [isTesting, startTestingTransition] = useTransition();
  const isPending = isSaving || isTesting;
  const timeOptions = getDailyScheduleTimeOptions(sendTime);
  const lastSend = (() => {
    if (!initialSettings.lastSuccessfulSendAt) {
      return copy.neverSent;
    }

    try {
      return new Intl.DateTimeFormat(localeDateFormats[locale], {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(initialSettings.lastSuccessfulSendAt));
    } catch {
      return copy.neverSent;
    }
  })();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSavingTransition(async () => {
      const result = await updateTelegramDailyScheduleSettingsAction(locale, { enabled, sendTime });

      if (result.ok) {
        setMessage(copy.messages.saved);
        setMessageTone("success");
        return;
      }

      setMessage(copy.messages.error);
      setMessageTone("error");
    });
  }

  function handleSendTest() {
    startTestingTransition(async () => {
      const result = await sendTelegramDailyScheduleTestAction(locale);

      if (result.ok) {
        setMessage(copy.messages.testSent);
        setMessageTone("success");
        return;
      }

      setMessage(copy.messages.testFailed);
      setMessageTone("error");
    });
  }

  return (
    <section className="rounded-3xl border border-border/70 bg-background/60 p-5 shadow-soft sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {copy.title}
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-primary">{copy.dailySchedule}</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
      </div>

      <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
        <label className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-card/70 p-4">
          <span>
            <span className="block text-sm font-semibold text-primary">{copy.sendDailySchedule}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{enabled ? copy.enabled : copy.disabled}</span>
          </span>
          <input
            checked={enabled}
            className="mt-1 size-5 accent-primary"
            disabled={isPending}
            onChange={(event) => setEnabled(event.target.checked)}
            type="checkbox"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="group block">
            <span className="text-sm font-semibold text-primary">{copy.sendTime}</span>
            <span className="relative mt-2 block">
              <Select
                aria-label={copy.sendTime}
                disabled={isPending}
                onChange={(event) => setSendTime(event.target.value)}
                required
                value={sendTime}
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </Select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
            </span>
          </label>
          <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-semibold text-muted-foreground">
            {initialSettings.dailyScheduleTimezone}
          </div>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">{copy.timezoneHelper}</p>

        <div className="rounded-2xl border border-border/70 bg-card/70 p-4">
          <p className="text-sm text-muted-foreground">{copy.lastSuccessfulSend}</p>
          <p className="mt-1 text-sm font-semibold text-primary">{lastSend}</p>
        </div>

        {message ? (
          <p
            aria-live="polite"
            className={messageTone === "error" ? "text-sm font-semibold text-accent" : "text-sm font-semibold text-primary"}
          >
            {message}
          </p>
        ) : null}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button disabled={isPending} onClick={handleSendTest} type="button" variant="outline">
            {isTesting ? copy.sendingTest : copy.sendTestSummary}
          </Button>
          <Button disabled={isPending} type="submit">
            {isSaving ? copy.saving : copy.save}
          </Button>
        </div>
      </form>
    </section>
  );
}

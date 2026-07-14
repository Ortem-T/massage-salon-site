"use client";

import { useEffect, useMemo, useState } from "react";

import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { getTodayValue, isBookingDateSelectable, parseDateValue, toDateValue } from "@/lib/booking/booking-availability";
import { defaultBookingAvailability } from "@/lib/booking/booking-options";
import {
  generateBookingRebookingLinkAction,
  generateClientRebookingLinkAction,
  revokeBookingRebookingLinkAction,
  revokeClientRebookingLinkAction
} from "@/lib/dashboard/actions";
import {
  generateClientNotificationMessage,
  type ClientNotificationLanguage,
  type ClientNotificationType
} from "@/lib/dashboard/client-notifications";
import { type DashboardClientBooking } from "@/lib/dashboard/clients";
import { type RebookingTokenMetadata } from "@/lib/rebooking/tokens";
import { type ServiceCatalogItem } from "@/lib/services/catalog";

export type NotificationGeneratorBooking = DashboardClientBooking & {
  locale?: Locale | null;
};

type ClientNotificationGeneratorProps = {
  mode: "client";
  clientId: string;
  clientName: string;
  clientLocale: Locale | null;
  dictionary: Dictionary;
  locale: Locale;
  serviceCatalog: ServiceCatalogItem[];
  localizedServiceNames: Record<Locale, Record<string, string>>;
  bookings: NotificationGeneratorBooking[];
  rebookingToken: RebookingTokenMetadata | null;
};

type BookingNotificationGeneratorProps = {
  mode: "booking";
  booking: NotificationGeneratorBooking;
  clientId: string | null;
  clientName: string;
  clientLocale?: Locale | null;
  dictionary: Dictionary;
  locale: Locale;
  serviceCatalog: ServiceCatalogItem[];
  localizedServiceNames: Record<Locale, Record<string, string>>;
};

type NotificationGeneratorProps = ClientNotificationGeneratorProps | BookingNotificationGeneratorProps;

type AvailabilityDay = {
  available: boolean;
  availableTimeSlots: string[];
};

type AvailabilityResponse = {
  days: Record<string, AvailabilityDay>;
};

const notificationTypes: readonly ClientNotificationType[] = [
  "booking_confirmation",
  "appointment_reminder",
  "rebooking",
  "google_review"
];
const bookingRequiredTypes = new Set<ClientNotificationType>(["booking_confirmation", "appointment_reminder"]);
const dateLocales: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-GB"
};

function getDefaultLanguage(
  bookingLocale: string | null | undefined,
  clientLocale: string | null | undefined,
  dashboardLocale: Locale
): ClientNotificationLanguage {
  if (bookingLocale && isLocale(bookingLocale)) {
    return bookingLocale;
  }

  if (clientLocale && isLocale(clientLocale)) {
    return clientLocale;
  }

  return dashboardLocale ?? "sr";
}

function getBelgradeDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Belgrade",
    year: "numeric"
  }).formatToParts(date);

  return new Map(parts.map((part) => [part.type, part.value]));
}

function getBelgradeNowKey() {
  const values = getBelgradeDateParts();

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}T${values.get("hour")}:${values.get("minute")}`;
}

function getBelgradeDateKey() {
  const values = getBelgradeDateParts();

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function isFutureBooking(booking: NotificationGeneratorBooking) {
  return `${booking.preferredDate}T${booking.preferredTime}` >= getBelgradeNowKey();
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(dateLocales[locale], {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Belgrade",
    year: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function findDefaultBooking(bookings: NotificationGeneratorBooking[]) {
  const futureBookings = bookings
    .filter(isFutureBooking)
    .sort((a, b) => `${a.preferredDate}T${a.preferredTime}`.localeCompare(`${b.preferredDate}T${b.preferredTime}`));

  return (
    futureBookings.find((booking) => booking.status === "confirmed") ??
    futureBookings.find((booking) => booking.status === "pending") ??
    null
  );
}

function hasBookingMessageData(booking: NotificationGeneratorBooking | null) {
  return Boolean(booking?.preferredDate && booking.preferredTime && booking.service);
}

function addDaysValue(value: string, days: number) {
  const date = parseDateValue(value) ?? new Date();
  date.setDate(date.getDate() + days);

  return toDateValue(date);
}

function findRebookingTemplateBooking(bookings: NotificationGeneratorBooking[]) {
  const pastBookings = bookings
    .filter((booking) => `${booking.preferredDate}T${booking.preferredTime}` < getBelgradeNowKey())
    .sort((a, b) => `${b.preferredDate}T${b.preferredTime}`.localeCompare(`${a.preferredDate}T${a.preferredTime}`));

  return (
    pastBookings.find((booking) => booking.status === "completed") ??
    pastBookings.find((booking) => booking.status === "confirmed") ??
    null
  );
}

export function NotificationGenerator(props: NotificationGeneratorProps) {
  const copy = props.dictionary.dashboard.clients.notifications;
  const clientsCopy = props.dictionary.dashboard.clients;
  const statusLabels = props.dictionary.booking.statuses;
  const isBookingMode = props.mode === "booking";
  const clientBookings = props.mode === "client" ? props.bookings : null;
  const bookingContextBooking = props.mode === "booking" ? props.booking : null;
  const initialTokenStatus = props.mode === "client" ? props.rebookingToken : null;
  const identityKey = props.mode === "client" ? props.clientId : props.booking.id;
  const serviceBySlug = useMemo(
    () => new Map(props.serviceCatalog.map((service) => [service.slug, service])),
    [props.serviceCatalog]
  );
  const sourceBookings = useMemo(
    () => (bookingContextBooking ? [bookingContextBooking] : (clientBookings ?? [])),
    [bookingContextBooking, clientBookings]
  );
  const eligibleBookings = useMemo(
    () =>
      props.mode === "client"
        ? sourceBookings
            .filter((booking) => isFutureBooking(booking) && (booking.status === "confirmed" || booking.status === "pending"))
            .sort((a, b) => `${a.preferredDate}T${a.preferredTime}`.localeCompare(`${b.preferredDate}T${b.preferredTime}`))
        : sourceBookings,
    [props.mode, sourceBookings]
  );
  const defaultBooking = props.mode === "client" ? findDefaultBooking(props.bookings) : props.booking;
  const defaultLanguage = getDefaultLanguage(
    props.mode === "booking" ? props.booking.locale : null,
    props.clientLocale,
    props.locale
  );
  const [messageLanguage, setMessageLanguage] = useState<ClientNotificationLanguage>(() => defaultLanguage);
  const [messageType, setMessageType] = useState<ClientNotificationType>("booking_confirmation");
  const [selectedBookingId, setSelectedBookingId] = useState(defaultBooking?.id ?? "");
  const [preview, setPreview] = useState("");
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<RebookingTokenMetadata | null>(initialTokenStatus);
  const [latestRebookingUrl, setLatestRebookingUrl] = useState<string | null>(null);
  const [isTokenPending, setIsTokenPending] = useState(false);
  const [isAutomaticSuggestion, setIsAutomaticSuggestion] = useState(true);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [manualAvailableTimeSlots, setManualAvailableTimeSlots] = useState<string[]>([]);
  const [isManualAvailabilityLoading, setIsManualAvailabilityLoading] = useState(false);
  const [manualAvailabilityError, setManualAvailabilityError] = useState(false);
  const manualMinDate = useMemo(() => getTodayValue(), []);
  const manualMaxDate = useMemo(
    () => addDaysValue(manualMinDate, defaultBookingAvailability.maxAdvanceBookingDays),
    [manualMinDate]
  );
  const requiresBooking = bookingRequiredTypes.has(messageType);
  const selectedBooking = isBookingMode
    ? props.booking
    : eligibleBookings.find((booking) => booking.id === selectedBookingId) ?? null;
  const hasLinkedClient = Boolean(props.clientId);
  const rebookingTemplateBooking = isBookingMode ? props.booking : findRebookingTemplateBooking(props.bookings);
  const manualServiceSlug = rebookingTemplateBooking?.service ?? "";
  const manualTherapistId = rebookingTemplateBooking?.therapistId ?? "";
  const canUseManualSuggestion = Boolean(hasLinkedClient && manualServiceSlug && manualTherapistId);
  const isManualSuggestionSelected = messageType === "rebooking" && !isAutomaticSuggestion;
  const manualCanLoadAvailability = Boolean(isManualSuggestionSelected && canUseManualSuggestion && manualDate);
  const hasMessageData = !requiresBooking || hasBookingMessageData(selectedBooking);
  const hasValidManualSuggestion =
    !isManualSuggestionSelected || Boolean(manualDate && manualTime && manualAvailableTimeSlots.includes(manualTime));
  const canGenerate = hasMessageData && (messageType !== "rebooking" || (hasLinkedClient && hasValidManualSuggestion));
  const instanceId = `${props.mode}-${props.mode === "client" ? props.clientId : props.booking.id}`;

  useEffect(() => {
    setMessageLanguage(defaultLanguage);
    setMessageType("booking_confirmation");
    setSelectedBookingId(defaultBooking?.id ?? "");
    setPreview("");
    setCopyMessage(null);
    setTokenStatus(initialTokenStatus);
    setLatestRebookingUrl(null);
    setIsAutomaticSuggestion(true);
    setManualDate("");
    setManualTime("");
    setManualAvailableTimeSlots([]);
    setManualAvailabilityError(false);
  }, [defaultBooking?.id, defaultLanguage, identityKey, initialTokenStatus, props.mode]);

  useEffect(() => {
    if (isBookingMode || !requiresBooking || selectedBookingId) {
      return;
    }

    setSelectedBookingId(findDefaultBooking(sourceBookings)?.id ?? "");
  }, [isBookingMode, requiresBooking, selectedBookingId, sourceBookings]);

  useEffect(() => {
    if (messageType === "rebooking") {
      return;
    }

    setIsAutomaticSuggestion(true);
    setManualDate("");
    setManualTime("");
    setManualAvailableTimeSlots([]);
    setManualAvailabilityError(false);
    setLatestRebookingUrl(null);
  }, [messageType]);

  useEffect(() => {
    if (!manualCanLoadAvailability) {
      setManualAvailableTimeSlots([]);
      setIsManualAvailabilityLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      therapistId: manualTherapistId,
      serviceSlug: manualServiceSlug,
      startDate: manualDate,
      endDate: manualDate
    });

    setIsManualAvailabilityLoading(true);
    setManualAvailabilityError(false);

    fetch(`/api/booking-availability?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Rebooking availability could not be loaded.");
        }

        return (await response.json()) as AvailabilityResponse;
      })
      .then((data) => {
        setManualAvailableTimeSlots(data.days[manualDate]?.availableTimeSlots ?? []);
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setManualAvailableTimeSlots([]);
        setManualAvailabilityError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsManualAvailabilityLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [manualCanLoadAvailability, manualDate, manualServiceSlug, manualTherapistId]);

  useEffect(() => {
    if (manualTime && !manualAvailableTimeSlots.includes(manualTime)) {
      setManualTime("");
    }
  }, [manualAvailableTimeSlots, manualTime]);

  function getServiceName(booking: NotificationGeneratorBooking) {
    return serviceBySlug.get(booking.service)?.name ?? booking.service;
  }

  function getMessageServiceName(booking: NotificationGeneratorBooking) {
    return props.localizedServiceNames[messageLanguage]?.[booking.service] ?? getServiceName(booking);
  }

  function getDurationMinutes(booking: NotificationGeneratorBooking) {
    return booking.durationMinutes ?? serviceBySlug.get(booking.service)?.durationMinutes ?? 60;
  }

  function getBookingLabel(booking: NotificationGeneratorBooking) {
    return [
      formatDate(booking.preferredDate, props.locale),
      booking.preferredTime,
      getServiceName(booking),
      booking.specialist,
      statusLabels[booking.status]
    ]
      .filter(Boolean)
      .join(" · ");
  }

  async function copyText(value: string) {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage(copy.copyFailed);
      return false;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(copy.copied);
      return true;
    } catch {
      setCopyMessage(copy.copyFailed);
      return false;
    }
  }

  function getTokenStatusLabel(token: RebookingTokenMetadata | null) {
    if (!token) {
      return copy.tokenStatus.none;
    }

    return copy.tokenStatus[token.status];
  }

  function formatTokenDate(value: string | null) {
    if (!value) {
      return clientsCopy.notSet;
    }

    return new Intl.DateTimeFormat(dateLocales[props.locale], {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Belgrade",
      year: "numeric"
    }).format(new Date(value));
  }

  async function createRebookingLink() {
    if (!props.clientId) {
      setCopyMessage(copy.linkedClientRequired);
      return null;
    }

    setIsTokenPending(true);
    setCopyMessage(null);

    try {
      const suggestionInput = isAutomaticSuggestion
        ? { suggestionMode: "automatic" as const }
        : {
            suggestionMode: "manual" as const,
            manualSuggestion: {
              date: manualDate,
              time: manualTime
            }
          };
      const result = props.mode === "client"
        ? await generateClientRebookingLinkAction(props.locale, {
            clientId: props.clientId,
            messageLocale: messageLanguage,
            ...suggestionInput
          })
        : await generateBookingRebookingLinkAction(props.locale, {
            bookingId: props.booking.id,
            messageLocale: messageLanguage,
            ...suggestionInput
          });

      if (!result.ok || !result.rebookingUrl) {
        const reason = result.ok ? null : result.reason;
        setCopyMessage(
          reason === "missing_client"
            ? copy.linkedClientRequired
            : reason === "manual_required"
              ? copy.manualRequired
              : reason === "manual_unavailable"
                ? copy.manualUnavailable
                : reason === "slot_unavailable"
                  ? copy.slotUnavailable
                  : copy.tokenMessages.error
        );
        return null;
      }

      setTokenStatus(result.token);
      setLatestRebookingUrl(result.rebookingUrl);
      setCopyMessage(copy.tokenMessages.generated);
      return result.rebookingUrl;
    } finally {
      setIsTokenPending(false);
    }
  }

  async function revokeRebookingLink() {
    if (!props.clientId) {
      setCopyMessage(copy.linkedClientRequired);
      return;
    }

    setIsTokenPending(true);
    setCopyMessage(null);

    try {
      const result = props.mode === "client"
        ? await revokeClientRebookingLinkAction(props.locale, {
            clientId: props.clientId
          })
        : await revokeBookingRebookingLinkAction(props.locale, {
            bookingId: props.booking.id
          });

      if (!result.ok) {
        setCopyMessage(result.reason === "missing_client" ? copy.linkedClientRequired : copy.tokenMessages.error);
        return;
      }

      setTokenStatus(result.token);
      setLatestRebookingUrl(null);
      setCopyMessage(copy.tokenMessages.revoked);
    } finally {
      setIsTokenPending(false);
    }
  }

  async function generateAndCopy() {
    if (!hasMessageData) {
      setCopyMessage(copy.bookingDataRequired);
      return;
    }

    if (messageType === "rebooking" && !hasLinkedClient) {
      setCopyMessage(copy.linkedClientRequired);
      return;
    }

    if (isManualSuggestionSelected) {
      if (!canUseManualSuggestion) {
        setCopyMessage(copy.manualUnavailable);
        return;
      }

      if (!manualDate || !manualTime) {
        setCopyMessage(copy.manualRequired);
        return;
      }

      if (!manualAvailableTimeSlots.includes(manualTime)) {
        setCopyMessage(copy.slotUnavailable);
        return;
      }
    }

    const rebookingUrl = messageType === "rebooking"
      ? latestRebookingUrl ?? (await createRebookingLink())
      : null;

    if (messageType === "rebooking" && !rebookingUrl) {
      return;
    }

    const nextPreview = generateClientNotificationMessage({
      clientName: props.clientName,
      language: messageLanguage,
      type: messageType,
      rebookingUrl,
      booking: selectedBooking
        ? {
            date: selectedBooking.preferredDate,
            time: selectedBooking.preferredTime,
            serviceName: getMessageServiceName(selectedBooking),
            durationMinutes: getDurationMinutes(selectedBooking),
            hasClientComment: Boolean(selectedBooking.clientComment?.trim()),
            isToday: selectedBooking.preferredDate === getBelgradeDateKey()
          }
        : null
    });

    setPreview(nextPreview);
    await copyText(nextPreview);
  }

  async function copyPreview() {
    if (!preview.trim()) {
      return;
    }

    await copyText(preview);
  }

  return (
    <section className="mt-6 border-t border-border/70 pt-5">
      <div className="rounded-3xl border border-border/70 bg-background/45 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">{copy.eyebrow}</p>
          <h3 className="mt-2 text-lg font-semibold text-primary">{copy.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.subtitle}</p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor={`${instanceId}-notification-language`} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {copy.fields.language}
            </label>
            <Select
              id={`${instanceId}-notification-language`}
              value={messageLanguage}
              onChange={(event) => {
                setMessageLanguage(event.target.value as ClientNotificationLanguage);
                setCopyMessage(null);
              }}
            >
              {locales.map((language) => (
                <option key={language} value={language}>
                  {copy.languages[language]}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor={`${instanceId}-notification-type`} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {copy.fields.type}
            </label>
            <Select
              id={`${instanceId}-notification-type`}
              value={messageType}
              onChange={(event) => {
                setMessageType(event.target.value as ClientNotificationType);
                setLatestRebookingUrl(null);
                setCopyMessage(null);
              }}
            >
              {notificationTypes.map((type) => (
                <option key={type} value={type}>
                  {copy.types[type]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!isBookingMode && requiresBooking ? (
          <div className="mt-3 space-y-2">
            <label htmlFor={`${instanceId}-notification-booking`} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {copy.fields.booking}
            </label>
            <Select
              id={`${instanceId}-notification-booking`}
              value={selectedBookingId}
              onChange={(event) => {
                setSelectedBookingId(event.target.value);
                setCopyMessage(null);
              }}
              disabled={eligibleBookings.length === 0}
            >
              <option value="">{copy.placeholders.booking}</option>
              {eligibleBookings.map((booking) => (
                <option key={booking.id} value={booking.id}>
                  {getBookingLabel(booking)}
                </option>
              ))}
            </Select>
            {eligibleBookings.length === 0 ? (
              <p className="text-sm leading-6 text-muted-foreground">{copy.bookingRequired}</p>
            ) : null}
          </div>
        ) : null}

        {messageType === "rebooking" ? (
          <p className="mt-3 rounded-2xl border border-primary/12 bg-secondary/45 px-4 py-3 text-xs leading-5 text-muted-foreground">
            {hasLinkedClient ? copy.rebookingNote : copy.linkedClientRequired}
          </p>
        ) : null}

        {messageType === "rebooking" ? (
          <div className="mt-4 rounded-2xl border border-border/70 bg-background/50 p-4">
            <label className="flex items-start gap-3 text-sm font-semibold text-primary">
              <input
                type="checkbox"
                className="mt-1 size-4 rounded border-border accent-primary"
                checked={isAutomaticSuggestion}
                onChange={(event) => {
                  setIsAutomaticSuggestion(event.target.checked);
                  setManualDate("");
                  setManualTime("");
                  setManualAvailableTimeSlots([]);
                  setManualAvailabilityError(false);
                  setLatestRebookingUrl(null);
                  setCopyMessage(null);
                }}
              />
              <span>{copy.automaticDateTime}</span>
            </label>

            {!isAutomaticSuggestion ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor={`${instanceId}-manual-date`} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {copy.fields.date}
                  </label>
                  <BookingDatePicker
                    id={`${instanceId}-manual-date`}
                    copy={props.dictionary.booking.calendar}
                    disabled={!canUseManualSuggestion}
                    invalid={Boolean(copyMessage === copy.manualRequired && !manualDate)}
                    isDateSelectable={(value) => isBookingDateSelectable(value, manualMinDate, manualMaxDate)}
                    locale={props.locale}
                    minDate={manualMinDate}
                    value={manualDate}
                    onChange={(value) => {
                      setManualDate(value);
                      setManualTime("");
                      setLatestRebookingUrl(null);
                      setCopyMessage(null);
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor={`${instanceId}-manual-time`} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {copy.fields.time}
                  </label>
                  <Select
                    id={`${instanceId}-manual-time`}
                    disabled={!canUseManualSuggestion || !manualDate || isManualAvailabilityLoading || manualAvailableTimeSlots.length === 0}
                    value={manualTime}
                    onChange={(event) => {
                      setManualTime(event.target.value);
                      setLatestRebookingUrl(null);
                      setCopyMessage(null);
                    }}
                  >
                    <option value="">
                      {!manualDate
                        ? copy.placeholders.timeSelectDateFirst
                        : isManualAvailabilityLoading
                          ? props.dictionary.booking.availability.loadingTimes
                          : manualAvailabilityError || !canUseManualSuggestion
                            ? copy.manualUnavailable
                            : manualAvailableTimeSlots.length === 0
                              ? copy.noAvailableTimes
                              : props.dictionary.booking.fields.time.placeholder}
                    </option>
                    {manualAvailableTimeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Select>
                </div>

                {!canUseManualSuggestion || manualAvailabilityError ? (
                  <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">{copy.manualUnavailable}</p>
                ) : manualDate && !isManualAvailabilityLoading && manualAvailableTimeSlots.length === 0 ? (
                  <p className="text-sm leading-6 text-muted-foreground sm:col-span-2">{copy.noAvailableTimes}</p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {messageType === "rebooking" ? (
          <div className="mt-4 rounded-2xl border border-border/70 bg-card/60 p-4">
            <div className="grid gap-3 text-sm leading-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {copy.tokenManagement.status}
                </p>
                <p className="mt-1 font-semibold text-primary">{getTokenStatusLabel(tokenStatus)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {copy.tokenManagement.expires}
                </p>
                <p className="mt-1 font-semibold text-primary">{formatTokenDate(tokenStatus?.expiresAt ?? null)}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={createRebookingLink} disabled={isTokenPending || !hasLinkedClient}>
                {copy.tokenManagement.generateNew}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={revokeRebookingLink}
                disabled={isTokenPending || !hasLinkedClient || tokenStatus?.status !== "active"}
              >
                {copy.tokenManagement.revoke}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button type="button" onClick={generateAndCopy} disabled={!canGenerate || isTokenPending}>
            {copy.generateAndCopy}
          </Button>
          {preview ? (
            <Button type="button" variant="outline" onClick={copyPreview}>
              {copy.copy}
            </Button>
          ) : null}
        </div>

        {copyMessage ? (
          <p className="mt-3 rounded-2xl border border-primary/12 bg-secondary/55 px-4 py-3 text-sm font-semibold text-primary">
            {copyMessage}
          </p>
        ) : null}

        {preview ? (
          <div className="mt-4 space-y-2">
            <label htmlFor={`${instanceId}-notification-preview`} className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {copy.fields.preview}
            </label>
            <Textarea
              id={`${instanceId}-notification-preview`}
              value={preview}
              onChange={(event) => {
                setPreview(event.target.value);
                setCopyMessage(null);
              }}
              className="min-h-64 font-mono text-sm leading-6"
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

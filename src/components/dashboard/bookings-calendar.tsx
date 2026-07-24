"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition
} from "react";
import { useRouter } from "next/navigation";

import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { NotificationGenerator } from "@/components/dashboard/notification-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { useDashboardRealtimeRefresh } from "@/hooks/use-dashboard-realtime-refresh";
import { getTodayValue, isBookingDateSelectable } from "@/lib/booking/booking-availability";
import { type BookingStatus, bookingStatuses } from "@/lib/booking/booking-schema";
import {
  contactValueRequired,
  getClientContactLabel,
  normalizePrimaryContactValue,
  type BookingClient
} from "@/lib/clients/contact";
import {
  assignTherapistToBookingAction,
  createManualBookingAction,
  type DashboardActionResult,
  updateBookingInternalNotesAction,
  updateBookingStatusAction
} from "@/lib/dashboard/actions";
import { type DashboardRole } from "@/lib/dashboard/auth";
import {
  manualBookingCreateStatuses,
  manualBookingSourceChannels,
  type ManualBookingSourceChannel
} from "@/lib/dashboard/constants";
import { type DashboardBooking, type DashboardScheduleBlock, type DashboardTherapist } from "@/lib/dashboard/bookings";
import { getCalendarMonthGridDays } from "@/lib/calendar/month-grid";
import {
  formatServiceDuration,
  formatServicePrice,
  getAllowedTherapistIdsForService,
  isTherapistAllowedForService,
  type ServiceCatalogItem
} from "@/lib/services/catalog";
import { cn } from "@/lib/utils";

type CalendarView = "day" | "week" | "month";
type StatusFilter = BookingStatus | "all";
type CreateBookingStatus = (typeof manualBookingCreateStatuses)[number];
type ClientMode = "existing" | "new";

type DashboardCalendarBookingEvent = {
  kind: "booking";
  id: string;
  date: string;
  sortTime: string;
  booking: DashboardBooking;
};

type DashboardCalendarScheduleBlockEvent = {
  kind: "schedule_block";
  id: string;
  date: string;
  sortTime: string;
  block: DashboardScheduleBlock;
};

type DashboardCalendarEvent = DashboardCalendarBookingEvent | DashboardCalendarScheduleBlockEvent;

const calendarViews: CalendarView[] = ["day", "week", "month"];

type CalendarDaySummary = {
  bookingCount: number;
  blockCount: number;
  hasBooking: boolean;
  hasPendingBooking: boolean;
  hasScheduleBlock: boolean;
};

type ManualBookingFormState = {
  clientMode: ClientMode;
  selectedClientId: string;
  clientSearch: string;
  service: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes: string;
  clientName: string;
  clientPhone: string;
  clientContactValue: string;
  clientNotes: string;
  clientComment: string;
  internalNotes: string;
  locale: Locale;
  therapistId: string;
  status: CreateBookingStatus;
  sourceChannel: ManualBookingSourceChannel;
};

type ManualBookingFormErrors = Partial<Record<keyof ManualBookingFormState, string>>;

type ManualFieldErrorProps = {
  id?: string;
  message?: string;
};

type CompactCalendarEventButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className: string;
  onClick: () => void;
  onTooltipClose: () => void;
  onTooltipOpen: (target: HTMLElement, content: ReactNode) => void;
  tooltip: ReactNode;
  tooltipId: string;
};

type CalendarTooltipState = {
  content: ReactNode;
  id: string;
  rect: DOMRect;
};

type BookingsCalendarProps = {
  bookings: DashboardBooking[];
  clients: BookingClient[];
  dataError: boolean;
  dictionary: Dictionary;
  initialDate?: string;
  locale: Locale;
  role: DashboardRole;
  scheduleBlocks: DashboardScheduleBlock[];
  serviceCatalog: ServiceCatalogItem[];
  serviceCatalogError: boolean;
  localizedServiceNames: Record<Locale, Record<string, string>>;
  therapists: DashboardTherapist[];
};

type AvailabilityResponse = {
  days: Record<string, { availableTimeSlots: string[] }>;
};

const statusStyles: Record<BookingStatus, string> = {
  pending: "border-[#c6a15a]/40 bg-[#f6ecd8] text-[#72551f]",
  confirmed: "border-primary/25 bg-[#e3ede5] text-primary",
  cancelled: "border-[#b47c72]/35 bg-[#f1ded9] text-[#7b3c34]",
  completed: "border-[#8f9d86]/35 bg-[#e7eadf] text-[#46543d]"
};
const compactBookingStatusStyles: Record<BookingStatus, string> = {
  pending: "border-[#c6a15a]/45 bg-[#f8efe0] text-[#72551f] hover:bg-[#f4e5ca]",
  confirmed: "border-primary/25 bg-[#e4eee6] text-primary hover:bg-[#d8e8dc]",
  cancelled: "border-[#b47c72]/35 bg-[#f2e2dd] text-[#7b3c34] opacity-75 hover:bg-[#ead3cc]",
  completed: "border-[#8f9d86]/35 bg-[#e8e9e1] text-[#46543d] hover:bg-[#dedfd4]"
};
const scheduleBlockEventStyle =
  "border-border/80 bg-[repeating-linear-gradient(135deg,rgb(236_231_220/0.64)_0,rgb(236_231_220/0.64)_6px,rgb(248_246_241/0.82)_6px,rgb(248_246_241/0.82)_12px)] text-primary";
const dashboardCalendarRealtimeTables = ["bookings", "schedule_blocks", "app_settings"] as const;
const salonTimeZone = "Europe/Belgrade";
const dateLocales: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-GB"
};
const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function todayKey() {
  return toDateKey(new Date());
}

function isDateKey(value: string | undefined): value is string {
  return Boolean(value?.match(/^\d{4}-\d{2}-\d{2}$/));
}

function getInitialDate(value: string | undefined) {
  return isDateKey(value) ? value : todayKey();
}

function toDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: salonTimeZone,
    year: "numeric"
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return new Date(Date.UTC(year, month - 1, day, 12));
}

function addDays(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

function addMonths(value: string, amount: number) {
  const date = parseDateKey(value);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return toDateKey(date);
}

function startOfWeek(value: string) {
  const date = parseDateKey(value);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return toDateKey(date);
}

function getWeekDays(value: string) {
  const start = startOfWeek(value);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

function getMonthDays(value: string) {
  return getCalendarMonthGridDays(value).map((day) => day.dateKey);
}

function formatDate(value: string, locale: Locale, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(dateLocales[locale], { ...options, timeZone: salonTimeZone }).format(parseDateKey(value));
}

function formatCompactWeekday(value: string, locale: Locale) {
  return formatDate(value, locale, { weekday: "short" }).replace(".", "").slice(0, 2);
}

function getWeekdayLabels(locale: Locale) {
  return getWeekDays("2026-01-05").map((day) => formatCompactWeekday(day, locale));
}

function getPluralForm(count: number, locale: Locale) {
  if (locale === "en") {
    return count === 1 ? "one" : "many";
  }

  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return "one";
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return "few";
  }

  return "many";
}

function formatCalendarCount(count: number, locale: Locale, forms: { one: string; few: string; many: string }) {
  const form = getPluralForm(count, locale);

  return `${count} ${forms[form]}`;
}

function sortBookings(bookings: DashboardBooking[]) {
  return [...bookings].sort((a, b) => {
    const dateCompare = a.preferredDate.localeCompare(b.preferredDate);
    return dateCompare === 0 ? a.preferredTime.localeCompare(b.preferredTime) : dateCompare;
  });
}

function isCalendarView(value: string | null): value is CalendarView {
  return value === "day" || value === "week" || value === "month";
}

function getInitialCalendarView(storageKey: string): CalendarView {
  if (typeof window === "undefined") {
    return "month";
  }

  const storedView = window.localStorage.getItem(storageKey);

  return isCalendarView(storedView) ? storedView : "month";
}

function sortCalendarEvents(events: DashboardCalendarEvent[]) {
  return [...events].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    const timeCompare = a.sortTime.localeCompare(b.sortTime);

    if (timeCompare !== 0) {
      return timeCompare;
    }

    return a.kind.localeCompare(b.kind);
  });
}

function formatScheduleBlockTime(value: string | null) {
  return value?.slice(0, 5) ?? "";
}

function timeToMinutes(value: string | null | undefined) {
  const normalized = value?.slice(0, 5);

  if (!normalized?.match(/^\d{2}:\d{2}$/)) {
    return null;
  }

  const [hours, minutes] = normalized.split(":").map(Number);

  return hours * 60 + minutes;
}

function minutesToTime(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function ManualFieldError({ id, message }: ManualFieldErrorProps) {
  if (!message) {
    return <p aria-hidden="true" className="min-h-5 text-sm leading-5" />;
  }

  return (
    <p id={id} role="alert" aria-live="polite" className="min-h-5 text-sm leading-5 text-accent">
      {message}
    </p>
  );
}

function CompactCalendarEventButton({
  ariaLabel,
  children,
  className,
  onClick,
  onTooltipClose,
  onTooltipOpen,
  tooltip,
  tooltipId
}: CompactCalendarEventButtonProps) {
  return (
    <span className="block">
      <button
        type="button"
        aria-describedby={tooltipId}
        aria-label={ariaLabel}
        onBlur={onTooltipClose}
        onFocus={(event) => onTooltipOpen(event.currentTarget, tooltip)}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
        onMouseEnter={(event) => onTooltipOpen(event.currentTarget, tooltip)}
        onMouseLeave={onTooltipClose}
        className={className}
      >
        {children}
      </button>
    </span>
  );
}

function getFocusableElements(container: HTMLElement | null) {
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
}

export function BookingsCalendar({
  bookings,
  clients,
  dataError,
  dictionary,
  initialDate,
  locale,
  role,
  scheduleBlocks,
  serviceCatalog,
  serviceCatalogError,
  localizedServiceNames,
  therapists
}: BookingsCalendarProps) {
  const router = useRouter();
  const calendar = dictionary.dashboard.calendar;
  const calendarViewStorageKey = `raine-dashboard-calendar-view:${role}:${locale}`;
  const [view, setViewState] = useState<CalendarView>("month");
  const [selectedDate, setSelectedDate] = useState(() => getInitialDate(initialDate));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [selectedScheduleBlockId, setSelectedScheduleBlockId] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<CalendarTooltipState | null>(null);
  const [internalNotes, setInternalNotes] = useState("");
  const [assignedTherapistId, setAssignedTherapistId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const manualMinDate = useMemo(() => getTodayValue(), []);
  const [manualBookingForm, setManualBookingForm] = useState<ManualBookingFormState>(() => ({
    clientMode: "new",
    selectedClientId: "",
    clientSearch: "",
    service: "",
    preferredDate: todayKey(),
    preferredTime: "",
    durationMinutes: "",
    clientName: "",
    clientPhone: "",
    clientContactValue: "",
    clientNotes: "",
    clientComment: "",
    internalNotes: "",
    locale,
    therapistId: "",
    status: "confirmed",
    sourceChannel: "phone"
  }));
  const [manualBookingErrors, setManualBookingErrors] = useState<ManualBookingFormErrors>({});
  const [manualAvailableTimeSlots, setManualAvailableTimeSlots] = useState<string[]>([]);
  const [isManualAvailabilityLoading, setIsManualAvailabilityLoading] = useState(false);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const refreshCalendarData = useCallback(() => {
    setAvailabilityRefreshKey((current) => current + 1);
    router.refresh();
  }, [router]);

  useDashboardRealtimeRefresh({
    channelName: "dashboard-calendar",
    onRefresh: refreshCalendarData,
    tables: dashboardCalendarRealtimeTables
  });

  useEffect(() => {
    const storedView = getInitialCalendarView(calendarViewStorageKey);

    setViewState((currentView) => (currentView === storedView ? currentView : storedView));
  }, [calendarViewStorageKey]);

  const therapistNames = useMemo(
    () => new Map(therapists.map((therapist) => [therapist.id, therapist.displayName])),
    [therapists]
  );
  const serviceLabels = useMemo(
    () => new Map(serviceCatalog.map((service) => [service.slug, service.name])),
    [serviceCatalog]
  );
  const servicesBySlug = useMemo(
    () => new Map(serviceCatalog.map((service) => [service.slug, service])),
    [serviceCatalog]
  );
  const filteredManualClients = useMemo(() => {
    const query = manualBookingForm.clientSearch.trim().toLowerCase();

    if (!query) {
      return clients.slice(0, 8);
    }

    return clients
      .filter((client) =>
        [
          client.name,
          client.phone,
          client.instagramUsername,
          client.telegramUsername,
          client.whatsappPhone,
          client.viberPhone,
          client.primaryContactValue
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      )
      .slice(0, 8);
  }, [clients, manualBookingForm.clientSearch]);
  const serviceDurations = useMemo(
    () => new Map(serviceCatalog.map((service) => [service.slug, String(service.durationMinutes)])),
    [serviceCatalog]
  );
  const activeServiceCatalog = useMemo(() => serviceCatalog.filter((service) => service.active), [serviceCatalog]);
  const ownTherapistId = role === "therapist" ? (therapists[0]?.id ?? "") : "";
  const manualServiceCatalog = useMemo(
    () =>
      role === "therapist"
        ? activeServiceCatalog.filter((service) => service.allowedTherapistIds.includes(ownTherapistId))
        : activeServiceCatalog,
    [activeServiceCatalog, ownTherapistId, role]
  );
  const selectedManualService = manualBookingForm.service ? (servicesBySlug.get(manualBookingForm.service) ?? null) : null;
  const manualAllowedTherapistIds = useMemo(
    () => (manualBookingForm.service ? getAllowedTherapistIdsForService(serviceCatalog, manualBookingForm.service) : []),
    [manualBookingForm.service, serviceCatalog]
  );
  const manualAvailableTherapists = useMemo(
    () => therapists.filter((therapist) => manualAllowedTherapistIds.includes(therapist.id)),
    [manualAllowedTherapistIds, therapists]
  );
  const selectedManualServiceTherapists = useMemo(
    () =>
      selectedManualService
        ? selectedManualService.allowedTherapistIds
            .map((therapistId) => therapistNames.get(therapistId))
            .filter((name): name is string => Boolean(name))
        : [],
    [selectedManualService, therapistNames]
  );
  const manualCanLoadAvailability = Boolean(
    manualBookingForm.service &&
    manualBookingForm.therapistId &&
    manualBookingForm.preferredDate
  );

  const filteredBookings = useMemo(() => {
    return sortBookings(bookings).filter((booking) => {
      if (statusFilter !== "all" && booking.status !== statusFilter) {
        return false;
      }

      if (role === "admin" && therapistFilter !== "all" && booking.therapistId !== therapistFilter) {
        return false;
      }

      return true;
    });
  }, [bookings, role, statusFilter, therapistFilter]);

  const filteredScheduleBlocks = useMemo(() => {
    return scheduleBlocks.filter((block) => {
      if (role !== "admin" || therapistFilter === "all") {
        return true;
      }

      return block.blockScope === "salon" || block.therapistId === therapistFilter;
    });
  }, [role, scheduleBlocks, therapistFilter]);

  const selectedBooking = filteredBookings.find((booking) => booking.id === selectedBookingId) ?? null;
  const selectedScheduleBlock = filteredScheduleBlocks.find((block) => block.id === selectedScheduleBlockId) ?? null;
  const selectedBookingServiceMeta = selectedBooking ? getBookingServiceMeta(selectedBooking) : null;
  const assignmentAvailableTherapists = useMemo(
    () =>
      selectedBooking
        ? therapists.filter((therapist) => isTherapistAllowedForService(serviceCatalog, selectedBooking.service, therapist.id))
        : [],
    [selectedBooking, serviceCatalog, therapists]
  );
  const visibleDays = view === "day" ? [selectedDate] : view === "week" ? getWeekDays(selectedDate) : getMonthDays(selectedDate);
  const visibleBookings = filteredBookings.filter((booking) => visibleDays.includes(booking.preferredDate));
  const visibleScheduleBlocks = filteredScheduleBlocks.filter((block) => visibleDays.includes(block.date));
  const visibleEvents = useMemo(
    () =>
      sortCalendarEvents([
        ...visibleBookings.map((booking): DashboardCalendarBookingEvent => ({
          kind: "booking",
          id: booking.id,
          date: booking.preferredDate,
          sortTime: booking.preferredTime,
          booking
        })),
        ...visibleScheduleBlocks.map((block): DashboardCalendarScheduleBlockEvent => ({
          kind: "schedule_block",
          id: block.id,
          date: block.date,
          sortTime: block.blockType === "full_day" ? "00:00" : (block.startTime ?? "00:00"),
          block
        }))
      ]),
    [visibleBookings, visibleScheduleBlocks]
  );
  const mobileMonthDays = useMemo(() => getCalendarMonthGridDays(selectedDate), [selectedDate]);
  const mobileWeekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);
  const daySummaryByDate = useMemo(() => {
    const summaries = new Map<string, CalendarDaySummary>();

    for (const event of visibleEvents) {
      const summary = summaries.get(event.date) ?? {
        bookingCount: 0,
        blockCount: 0,
        hasBooking: false,
        hasPendingBooking: false,
        hasScheduleBlock: false
      };

      if (event.kind === "booking") {
        summary.bookingCount += 1;
        summary.hasBooking = true;
        summary.hasPendingBooking = summary.hasPendingBooking || event.booking.status === "pending";
      } else {
        summary.blockCount += 1;
        summary.hasScheduleBlock = true;
      }

      summaries.set(event.date, summary);
    }

    return summaries;
  }, [visibleEvents]);

  const statusCounts = bookingStatuses.map((status) => ({
    status,
    count: bookings.filter((booking) => booking.status === status).length
  }));

  function getServiceOptionLabel(service: ServiceCatalogItem) {
    return [service.name, formatServiceDuration(service.durationMinutes, locale), formatServicePrice(service.priceRsd)]
      .filter(Boolean)
      .join(" - ");
  }

  function getBookingServiceMeta(booking: DashboardBooking) {
    const service = servicesBySlug.get(booking.service);
    const durationText = formatServiceDuration(booking.durationMinutes ?? service?.durationMinutes, locale);
    const priceText = formatServicePrice(service?.priceRsd);
    const compactText = [durationText, priceText].filter(Boolean).join(" · ");

    return {
      service,
      serviceName: service?.name ?? serviceLabels.get(booking.service) ?? booking.service,
      durationText,
      priceText,
      compactText
    };
  }

  function getBookingTimeRange(booking: DashboardBooking) {
    const service = servicesBySlug.get(booking.service);
    const startMinutes = timeToMinutes(booking.preferredTime);
    const durationMinutes = booking.durationMinutes ?? service?.durationMinutes ?? null;

    if (startMinutes === null || !durationMinutes) {
      return booking.preferredTime;
    }

    return `${booking.preferredTime}–${minutesToTime(startMinutes + durationMinutes)}`;
  }

  function getCompactEventAppearance(event: DashboardCalendarEvent) {
    if (event.kind === "schedule_block") {
      return {
        button: cn(
          "focus-ring flex min-h-7 w-full items-center rounded-lg border border-dashed border-border/85 px-1.5 py-1 text-left text-[0.72rem] font-medium leading-5 transition",
          scheduleBlockEventStyle,
          "hover:border-primary/30 hover:text-primary"
        )
      };
    }

    const appearance = compactBookingStatusStyles[event.booking.status];

    return {
      button: cn(
        "focus-ring flex min-h-7 w-full items-center rounded-lg border px-1.5 py-1 text-left text-[0.72rem] font-medium leading-5 transition",
        appearance
      )
    };
  }

  function getClientPrimaryContact(client: BookingClient) {
    if (client.primaryContactChannel) {
      return {
        channel: client.primaryContactChannel,
        value: normalizePrimaryContactValue(client.primaryContactChannel, client.primaryContactValue)
      };
    }

    if (client.phone) {
      return { channel: "phone" as const, value: client.phone };
    }

    if (client.whatsappPhone) {
      return { channel: "whatsapp" as const, value: client.whatsappPhone };
    }

    if (client.viberPhone) {
      return { channel: "viber" as const, value: client.viberPhone };
    }

    if (client.instagramUsername) {
      return { channel: "instagram" as const, value: client.instagramUsername };
    }

    if (client.telegramUsername) {
      return { channel: "telegram" as const, value: client.telegramUsername };
    }

    return { channel: "walk_in" as const, value: null };
  }

  function getManualClientContactLabel(client: BookingClient) {
    const contact = getClientPrimaryContact(client);

    return getClientContactLabel(
      contact.channel,
      contact.value,
      calendar.create.sourceChannels,
      calendar.create.noPrimaryContact
    );
  }

  function getContactPlaceholder(channel: ManualBookingSourceChannel) {
    return calendar.create.contactPlaceholders[channel];
  }

  function updateView(nextView: CalendarView) {
    setViewState(nextView);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(calendarViewStorageKey, nextView);
    }
  }

  function openCompactTooltip(tooltipId: string, target: HTMLElement, content: ReactNode) {
    setActiveTooltip({
      id: tooltipId,
      content,
      rect: target.getBoundingClientRect()
    });
  }

  function closeCompactTooltip() {
    setActiveTooltip(null);
  }

  function getTooltipPosition(rect: DOMRect) {
    const tooltipWidth = 288;
    const tooltipGap = 10;
    const viewportWidth = typeof window === "undefined" ? tooltipWidth + 32 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 800 : window.innerHeight;
    const left = Math.min(Math.max(rect.left, 16), Math.max(16, viewportWidth - tooltipWidth - 16));
    const belowTop = rect.bottom + tooltipGap;
    const top = belowTop + 220 > viewportHeight ? Math.max(16, rect.top - 220 - tooltipGap) : belowTop;

    return { left, top };
  }

  function getScheduleBlockTherapistLabel(block: DashboardScheduleBlock) {
    if (block.blockScope === "salon") {
      return calendar.scheduleBlocks.salonWide;
    }

    return therapistNames.get(block.therapistId ?? "") ?? calendar.filters.unassignedTherapist;
  }

  function getScheduleBlockTimeLabel(block: DashboardScheduleBlock) {
    if (block.blockType === "full_day") {
      return calendar.scheduleBlocks.fullDay;
    }

    return `${formatScheduleBlockTime(block.startTime)}–${formatScheduleBlockTime(block.endTime)}`;
  }

  function getScheduleBlockCompactLabel(block: DashboardScheduleBlock) {
    if (block.blockType === "full_day") {
      return calendar.scheduleBlocks.unavailableAllDay;
    }

    return `${getScheduleBlockTimeLabel(block)} · ${calendar.scheduleBlocks.unavailable}`;
  }

  function getCompactEventLabel(event: DashboardCalendarEvent) {
    if (event.kind === "schedule_block") {
      return getScheduleBlockTimeLabel(event.block);
    }

    return view === "week" ? getBookingTimeRange(event.booking) : event.booking.preferredTime;
  }

  function getMobileMonthDayAriaLabel(day: (typeof mobileMonthDays)[number], summary?: CalendarDaySummary) {
    const mobile = calendar.mobileMonth;
    const labels = [
      formatDate(day.dateKey, locale, { day: "numeric", month: "long", year: "numeric" }),
      formatCalendarCount(summary?.bookingCount ?? 0, locale, mobile.bookings),
      formatCalendarCount(summary?.blockCount ?? 0, locale, mobile.blocks)
    ];

    if (day.dateKey === todayKey()) {
      labels.push(mobile.today);
    }

    if (!day.isCurrentMonth) {
      labels.push(mobile.outsideMonth);
    }

    labels.push(mobile.openDay);

    return labels.join(". ");
  }

  function getBookingAriaLabel(booking: DashboardBooking) {
    const serviceMeta = getBookingServiceMeta(booking);

    return [
      getBookingTimeRange(booking),
      serviceMeta.serviceName,
      booking.clientName,
      role === "admin" ? (therapistNames.get(booking.therapistId ?? "") ?? booking.specialist) : null,
      dictionary.booking.statuses[booking.status]
    ]
      .filter(Boolean)
      .join(", ");
  }

  function getScheduleBlockAriaLabel(block: DashboardScheduleBlock) {
    return [
      getScheduleBlockTimeLabel(block),
      calendar.scheduleBlocks.blockedTime,
      role === "admin" ? getScheduleBlockTherapistLabel(block) : null
    ]
      .filter(Boolean)
      .join(", ");
  }

  function renderCompactEventTooltip(event: DashboardCalendarEvent) {
    if (event.kind === "schedule_block") {
      const block = event.block;

      return (
        <span className="block space-y-3">
          <span className="block">
            <span className="block text-xs font-semibold uppercase tracking-[0.12em] text-accent">
              {calendar.scheduleBlocks.unavailable}
            </span>
            <span className="mt-1 block text-sm font-semibold text-primary">{getScheduleBlockTimeLabel(block)}</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {formatDate(block.date, locale, { day: "numeric", month: "long", year: "numeric" })}
            </span>
          </span>
          <span className="block space-y-1 text-xs leading-5 text-muted-foreground">
            {block.blockScope === "salon" ? (
              <span className="block">
                <span className="font-semibold text-primary">{calendar.scheduleBlocks.scope}: </span>
                {calendar.scheduleBlocks.salonWide}
              </span>
            ) : null}
            {block.blockScope === "therapist" && role === "admin" ? (
              <span className="block">
                <span className="font-semibold text-primary">{calendar.details.therapist}: </span>
                {getScheduleBlockTherapistLabel(block)}
              </span>
            ) : null}
            {(role === "admin" || block.blockScope === "therapist") && block.reason ? (
              <span className="block">
                <span className="font-semibold text-primary">{calendar.scheduleBlocks.blockReason}: </span>
                {block.reason}
              </span>
            ) : null}
          </span>
        </span>
      );
    }

    const booking = event.booking;
    const serviceMeta = getBookingServiceMeta(booking);

    return (
      <span className="block space-y-3">
        <span className="block">
          <span className="block text-sm font-semibold text-primary">{getBookingTimeRange(booking)}</span>
          <span className="mt-1 block text-sm text-foreground">{serviceMeta.serviceName}</span>
        </span>
        <span className="block space-y-1 text-xs leading-5 text-muted-foreground">
          <span className="block">
            <span className="font-semibold text-primary">{calendar.details.client}: </span>
            {booking.clientName}
          </span>
          {role === "admin" ? (
            <span className="block">
              <span className="font-semibold text-primary">{calendar.details.therapist}: </span>
              {therapistNames.get(booking.therapistId ?? "") ?? booking.specialist}
            </span>
          ) : null}
          <span className="block">
            <span className="font-semibold text-primary">{calendar.details.status}: </span>
            {dictionary.booking.statuses[booking.status]}
          </span>
          {serviceMeta.compactText ? <span className="block font-semibold text-primary/80">{serviceMeta.compactText}</span> : null}
          {booking.sourceChannel ? (
            <span className="block">
              <span className="font-semibold text-primary">{calendar.details.sourceChannel}: </span>
              {calendar.create.sourceChannels[booking.sourceChannel]}
            </span>
          ) : null}
        </span>
      </span>
    );
  }

  useEffect(() => {
    if (!selectedBookingId && !selectedScheduleBlockId && !isCreateOpen) {
      return;
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const focusableElements = getFocusableElements(dialog);
      const target = focusableElements[0] ?? dialog;

      target?.focus();
    });

    return () => {
      window.cancelAnimationFrame(frame);
      previousFocusRef.current?.focus();
    };
  }, [isCreateOpen, selectedBookingId, selectedScheduleBlockId]);

  useEffect(() => {
    if (!manualCanLoadAvailability) {
      setManualAvailableTimeSlots([]);
      setIsManualAvailabilityLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      therapistId: manualBookingForm.therapistId,
      serviceSlug: manualBookingForm.service,
      startDate: manualBookingForm.preferredDate,
      endDate: manualBookingForm.preferredDate
    });

    setIsManualAvailabilityLoading(true);

    fetch(`/api/booking-availability?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Manual booking availability could not be loaded.");
        }

        return (await response.json()) as AvailabilityResponse;
      })
      .then((data) => {
        setManualAvailableTimeSlots(data.days[manualBookingForm.preferredDate]?.availableTimeSlots ?? []);
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setManualAvailableTimeSlots([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsManualAvailabilityLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    manualBookingForm.preferredDate,
    manualBookingForm.service,
    manualBookingForm.therapistId,
    manualCanLoadAvailability,
    availabilityRefreshKey
  ]);

  useEffect(() => {
    if (
      manualBookingForm.preferredTime &&
      !manualAvailableTimeSlots.includes(manualBookingForm.preferredTime)
    ) {
      setManualBookingForm((current) => ({
        ...current,
        preferredTime: ""
      }));
    }
  }, [manualAvailableTimeSlots, manualBookingForm.preferredTime]);

  function shiftDate(direction: -1 | 1) {
    if (view === "day") {
      setSelectedDate((current) => addDays(current, direction));
    } else if (view === "week") {
      setSelectedDate((current) => addDays(current, direction * 7));
    } else {
      setSelectedDate((current) => addMonths(current, direction));
    }
  }

  function openDay(day: string) {
    closeCompactTooltip();
    setSelectedDate(day);
    updateView("day");
    setSelectedBookingId(null);
    setSelectedScheduleBlockId(null);
    setMessage(null);
  }

  function openBooking(booking: DashboardBooking) {
    closeCompactTooltip();
    setIsCreateOpen(false);
    setSelectedScheduleBlockId(null);
    setSelectedBookingId(booking.id);
    setInternalNotes(booking.internalNotes ?? "");
    setAssignedTherapistId(booking.therapistId);
    setMessage(null);
  }

  function openScheduleBlock(block: DashboardScheduleBlock) {
    closeCompactTooltip();
    setIsCreateOpen(false);
    setSelectedBookingId(null);
    setSelectedScheduleBlockId(block.id);
    setMessage(null);
  }

  function getManualBookingInitialDate() {
    if (view === "day" && isDateKey(selectedDate) && isBookingDateSelectable(selectedDate, manualMinDate)) {
      return selectedDate;
    }

    return todayKey();
  }

  function closeBooking() {
    setSelectedBookingId(null);
    setMessage(null);
  }

  function closeScheduleBlock() {
    setSelectedScheduleBlockId(null);
    setMessage(null);
  }

  function openCreateBooking() {
    const defaultDate = getManualBookingInitialDate();

    setSelectedBookingId(null);
    setSelectedScheduleBlockId(null);
    setManualBookingForm({
      clientMode: clients.length > 0 ? "existing" : "new",
      selectedClientId: "",
      clientSearch: "",
      service: "",
      preferredDate: defaultDate,
      preferredTime: "",
      durationMinutes: "",
      clientName: "",
      clientPhone: "",
      clientContactValue: "",
      clientNotes: "",
      clientComment: "",
      internalNotes: "",
      locale,
      therapistId: ownTherapistId,
      status: "confirmed",
      sourceChannel: "phone"
    });
    setManualBookingErrors({});
    setMessage(null);
    setIsCreateOpen(true);
  }

  function updateManualBookingDate(value: string) {
    setManualBookingForm((current) => ({
      ...current,
      preferredDate: value,
      preferredTime: ""
    }));
    setManualBookingErrors((current) => {
      if (!current.preferredDate && !current.preferredTime) {
        return current;
      }

      const next = { ...current };
      delete next.preferredDate;
      delete next.preferredTime;
      return next;
    });
  }

  function closeCreateBooking() {
    setIsCreateOpen(false);
    setManualBookingErrors({});
  }

  function closeActiveDialog() {
    if (isCreateOpen) {
      closeCreateBooking();
      return;
    }

    if (selectedScheduleBlockId) {
      closeScheduleBlock();
      return;
    }

    closeBooking();
  }

  function updateManualBookingField<K extends keyof ManualBookingFormState>(
    field: K,
    value: ManualBookingFormState[K]
  ) {
    setManualBookingForm((current) => ({
      ...current,
      [field]: value
    }));
    setManualBookingErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function updateManualClientMode(mode: ClientMode) {
    setManualBookingForm((current) => ({
      ...current,
      clientMode: mode,
      selectedClientId: mode === "new" ? "" : current.selectedClientId,
      clientSearch: mode === "new" ? "" : current.clientSearch,
      clientName: mode === "new" ? "" : current.clientName,
      clientPhone: mode === "new" ? "" : current.clientPhone,
      clientContactValue: mode === "new" ? "" : current.clientContactValue,
      clientNotes: mode === "new" ? "" : current.clientNotes,
      sourceChannel: mode === "new" ? "phone" : current.sourceChannel
    }));
    setManualBookingErrors({});
  }

  function selectManualClient(client: BookingClient) {
    const contact = getClientPrimaryContact(client);

    setManualBookingForm((current) => ({
      ...current,
      clientMode: "existing",
      selectedClientId: client.id,
      clientSearch: client.name,
      clientName: client.name,
      clientPhone: client.phone ?? "",
      clientContactValue: contact.value ?? "",
      locale: client.locale ?? current.locale,
      sourceChannel: contact.channel
    }));
    setManualBookingErrors((current) => {
      const next = { ...current };
      delete next.selectedClientId;
      delete next.clientName;
      delete next.clientPhone;
      delete next.clientContactValue;
      delete next.sourceChannel;
      return next;
    });
  }

  function updateManualSourceChannel(channel: ManualBookingSourceChannel) {
    setManualBookingForm((current) => ({
      ...current,
      sourceChannel: channel,
      clientContactValue: channel === "walk_in" ? "" : current.clientContactValue,
      clientPhone:
        channel === "phone" || channel === "whatsapp" || channel === "viber"
          ? current.clientContactValue || current.clientPhone
          : current.clientPhone
    }));
    setManualBookingErrors((current) => {
      if (!current.sourceChannel && !current.clientContactValue) {
        return current;
      }

      const next = { ...current };
      delete next.sourceChannel;
      delete next.clientContactValue;
      return next;
    });
  }

  function updateManualBookingService(service: string) {
    const allowedTherapistIds = getAllowedTherapistIdsForService(serviceCatalog, service);
    const nextTherapistId =
      role === "therapist"
        ? (allowedTherapistIds.includes(ownTherapistId) ? ownTherapistId : "")
        : allowedTherapistIds.length === 1
          ? allowedTherapistIds[0]
          : allowedTherapistIds.includes(manualBookingForm.therapistId)
            ? manualBookingForm.therapistId
            : "";

    setManualBookingForm((current) => ({
      ...current,
      service,
      therapistId: nextTherapistId,
      durationMinutes: serviceDurations.get(service) ?? current.durationMinutes,
      preferredTime: ""
    }));
    setManualBookingErrors((current) => {
      if (!current.service) {
        return current;
      }

      const next = { ...current };
      delete next.service;
      return next;
    });
  }

  function validateManualBookingForm() {
    const create = calendar.create;
    const errors: ManualBookingFormErrors = {};

    if (!manualBookingForm.service) {
      errors.service = create.errors.service;
    }

    if (!manualBookingForm.preferredDate) {
      errors.preferredDate = create.errors.date;
    }

    if (!manualBookingForm.preferredTime) {
      errors.preferredTime = create.errors.time;
    }

    if (manualBookingForm.clientName.trim().length < 2) {
      errors.clientName = create.errors.clientName;
    }

    if (manualBookingForm.clientMode === "existing" && !manualBookingForm.selectedClientId) {
      errors.selectedClientId = create.errors.clientRequired;
    }

    if (!manualBookingForm.sourceChannel) {
      errors.sourceChannel = create.errors.sourceChannel;
    }

    if (
      contactValueRequired(manualBookingForm.sourceChannel) &&
      manualBookingForm.clientContactValue.trim().length < 2
    ) {
      errors.clientContactValue = create.errors.clientContactValue;
    }

    if (!manualBookingForm.therapistId) {
      errors.therapistId = manualBookingForm.service && manualAvailableTherapists.length === 0
        ? create.errors.noTherapistsForService
        : create.errors.therapist;
    } else if (!isTherapistAllowedForService(serviceCatalog, manualBookingForm.service, manualBookingForm.therapistId)) {
      errors.therapistId = create.errors.serviceTherapistUnavailable;
    }

    setManualBookingErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleDialogKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeActiveDialog();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    const focusableElements = getFocusableElements(dialog);

    if (!dialog || focusableElements.length === 0) {
      event.preventDefault();
      dialog?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function showActionResult(result: DashboardActionResult) {
    if (result.ok) {
      setMessage(calendar.actions.saved);
      refreshCalendarData();
      return;
    }

    setMessage(
      result.reason === "forbidden"
        ? calendar.actions.forbidden
        : result.reason === "service_restriction"
          ? calendar.actions.serviceRestriction
          : result.reason === "blocked"
            ? calendar.actions.blocked
            : calendar.actions.error
    );
  }

  function runAction(action: () => Promise<DashboardActionResult>) {
    if (!selectedBooking) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      showActionResult(await action());
    });
  }

  function runStatusUpdate(status: BookingStatus) {
    if (!selectedBooking) {
      return;
    }

    if (status === "cancelled" && !window.confirm(calendar.actions.confirmCancel)) {
      return;
    }

    const bookingId = selectedBooking.id;

    runAction(() =>
      updateBookingStatusAction(locale, {
        bookingId,
        status
      })
    );
  }

  function runNotesUpdate() {
    if (!selectedBooking) {
      return;
    }

    const bookingId = selectedBooking.id;

    runAction(() =>
      updateBookingInternalNotesAction(locale, {
        bookingId,
        internalNotes
      })
    );
  }

  function runTherapistAssignment() {
    if (!selectedBooking) {
      return;
    }

    const bookingId = selectedBooking.id;

    runAction(() =>
      assignTherapistToBookingAction(locale, {
        bookingId,
        therapistId: assignedTherapistId
      })
    );
  }

  function submitManualBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateManualBookingForm()) {
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await createManualBookingAction(locale, {
        service: manualBookingForm.service,
        preferredDate: manualBookingForm.preferredDate,
        preferredTime: manualBookingForm.preferredTime,
        durationMinutes: selectedManualService?.durationMinutes ?? null,
        clientName: manualBookingForm.clientName,
        clientPhone: manualBookingForm.clientPhone,
        clientId: manualBookingForm.clientMode === "existing" ? manualBookingForm.selectedClientId : null,
        clientContactValue: manualBookingForm.clientContactValue,
        clientNotes: manualBookingForm.clientNotes,
        clientComment: manualBookingForm.clientComment,
        internalNotes: manualBookingForm.internalNotes,
        locale: manualBookingForm.locale,
        therapistId: manualBookingForm.therapistId || null,
        status: role === "therapist" ? "confirmed" : manualBookingForm.status,
        sourceChannel: manualBookingForm.sourceChannel
      });

      if (result.ok) {
        closeCreateBooking();
        setMessage(calendar.create.success);
        refreshCalendarData();
        return;
      }

      if (result.reason === "blocked") {
        setManualBookingErrors((current) => ({
          ...current,
          preferredTime: calendar.create.errors.blocked
        }));
        setMessage(calendar.create.errors.blocked);
        return;
      }

      if (result.reason === "service_restriction") {
        setManualBookingErrors((current) => ({
          ...current,
          therapistId: calendar.create.errors.serviceTherapistUnavailable
        }));
        setMessage(calendar.create.errors.serviceTherapistUnavailable);
        return;
      }

      setMessage(result.reason === "forbidden" ? calendar.actions.forbidden : calendar.create.error);
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{calendar.eyebrow}</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{calendar.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem] xl:grid-cols-3">
            <Button type="button" onClick={openCreateBooking}>
              {calendar.create.action}
            </Button>

            <Select
              aria-label={calendar.controls.status}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            >
              <option value="all">{calendar.filters.allStatuses}</option>
              {bookingStatuses.map((status) => (
                <option key={status} value={status}>
                  {dictionary.booking.statuses[status]}
                </option>
              ))}
            </Select>

            {role === "admin" ? (
              <Select
                aria-label={calendar.controls.therapist}
                value={therapistFilter}
                onChange={(event) => setTherapistFilter(event.target.value)}
              >
                <option value="all">{calendar.filters.allTherapists}</option>
                {therapists.map((therapist) => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.displayName}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>
        </div>

        {dataError ? (
          <p className="mt-5 rounded-2xl border border-accent/25 bg-accent/10 px-4 py-3 text-sm leading-6 text-foreground">
            {calendar.dataError}
          </p>
        ) : null}

        {message ? <p className="mt-5 rounded-2xl border border-primary/15 bg-secondary/60 px-4 py-3 text-sm font-semibold text-primary">{message}</p> : null}

        {role === "admin" ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className={cn("rounded-2xl border px-4 py-3", statusStyles[status])}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em]">{dictionary.booking.statuses[status]}</p>
                <p className="mt-2 text-3xl font-semibold leading-none">{count}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="rounded-3xl border border-border/70 bg-card/78 p-4 shadow-soft sm:p-5">
        <div className="grid gap-4 border-b border-border/70 pb-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {calendar.currentRange}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-primary">
              {view === "month"
                ? formatDate(selectedDate, locale, { month: "long", year: "numeric" })
                : view === "week"
                  ? `${formatDate(visibleDays[0], locale, { day: "numeric", month: "short" })} - ${formatDate(
                      visibleDays[visibleDays.length - 1],
                      locale,
                      { day: "numeric", month: "short" }
                    )}`
                  : formatDate(selectedDate, locale, { weekday: "long", day: "numeric", month: "long" })}
            </h2>
          </div>

          <div
            role="group"
            aria-label={calendar.controls.view}
            className="grid w-full grid-cols-3 gap-1 rounded-full border border-border/70 bg-background/60 p-1 sm:w-auto"
          >
            {calendarViews.map((calendarView) => {
              const isActiveView = view === calendarView;

              return (
                <button
                  key={calendarView}
                  type="button"
                  aria-pressed={isActiveView}
                  onClick={() => updateView(calendarView)}
                  className={cn(
                    "focus-ring min-h-10 rounded-full px-4 py-2 text-sm font-semibold leading-5 transition",
                    isActiveView
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-primary/78 hover:bg-secondary/75 hover:text-primary"
                  )}
                >
                  {calendar.views[calendarView]}
                </button>
              );
            })}
          </div>

          <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:auto-cols-max sm:grid-flow-col sm:grid-cols-none">
            <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(-1)}>
              {calendar.controls.previous}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setSelectedDate(todayKey())}>
              {calendar.controls.today}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => shiftDate(1)}>
              {calendar.controls.next}
            </Button>
          </div>
        </div>

        {view === "month" ? (
          <div className="mt-4 md:hidden">
            <div className="grid grid-cols-7 gap-1 text-center">
              {mobileWeekdayLabels.map((day) => (
                <p key={day} className="pb-1 text-[0.68rem] font-semibold uppercase leading-5 text-muted-foreground">
                  {day}
                </p>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {mobileMonthDays.map((day) => {
                const summary = daySummaryByDate.get(day.dateKey);
                const hasBooking = Boolean(summary?.hasBooking);
                const hasPendingBooking = Boolean(summary?.hasPendingBooking);
                const hasScheduleBlock = Boolean(summary?.hasScheduleBlock);
                const isToday = day.dateKey === todayKey();

                return (
                  <button
                    key={day.dateKey}
                    type="button"
                    aria-label={getMobileMonthDayAriaLabel(day, summary)}
                    aria-current={isToday ? "date" : undefined}
                    onClick={() => openDay(day.dateKey)}
                    className={cn(
                      "focus-ring flex min-h-12 flex-col items-center justify-center rounded-xl px-1 py-1.5 text-sm font-semibold transition active:scale-[0.98]",
                      day.isCurrentMonth ? "text-primary" : "text-muted-foreground/45"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center rounded-full tabular-nums leading-none transition",
                        isToday
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "hover:bg-secondary/78 hover:text-primary"
                      )}
                    >
                      {day.dayOfMonth}
                    </span>
                    <span aria-hidden="true" className="mt-1 flex h-2 items-center justify-center gap-1">
                      {hasBooking ? (
                        <span
                          className={cn(
                            "size-1.5 rounded-full",
                            hasPendingBooking ? "bg-[#c6a15a]" : "bg-primary/55"
                          )}
                        />
                      ) : null}
                      {hasScheduleBlock ? (
                        <span
                          className="size-1.5 rounded-full border border-border/90 bg-card"
                        />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            "mt-4 grid gap-3",
            view === "day" ? "grid-cols-1" : view === "month" ? "hidden md:grid md:grid-cols-7" : "grid-cols-1 md:grid-cols-7",
            view === "month" && "md:auto-rows-[8.5rem]",
            view === "week" && "md:auto-rows-[12rem]"
          )}
        >
          {visibleDays.map((day) => {
            const dayEvents = visibleEvents.filter((event) => event.date === day);
            const isCompactView = view !== "day";
            const isDesktopToday = isCompactView && day === todayKey();

            return (
              <article
                key={day}
                onClick={isCompactView ? () => openDay(day) : undefined}
                className={cn(
                  "rounded-2xl border border-border/70 bg-background/45 p-3",
                  view === "day" && "min-h-64",
                  view === "week" && "min-h-40 cursor-pointer overflow-hidden transition hover:border-primary/25 hover:bg-background/70",
                  view === "month" && "min-h-32 cursor-pointer overflow-hidden transition hover:border-primary/25 hover:bg-background/70",
                  isDesktopToday && "md:border-accent/45 md:bg-secondary/60 md:ring-1 md:ring-accent/25"
                )}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-primary">
                    {isCompactView ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openDay(day);
                        }}
                        aria-current={isDesktopToday ? "date" : undefined}
                        className={cn(
                          "focus-ring rounded-md text-left transition hover:text-accent",
                          isDesktopToday && "rounded-full bg-accent/12 px-2 py-1 text-primary ring-1 ring-accent/30"
                        )}
                      >
                        {`${formatCompactWeekday(day, locale)} ${formatDate(day, locale, { day: "numeric" })}`}
                      </button>
                    ) : (
                      formatDate(day, locale, { weekday: "long", day: "numeric" })
                    )}
                  </h3>
                  <span className="text-xs text-muted-foreground">{dayEvents.length}</span>
                </div>

                <div className={cn("mt-3 space-y-2", isCompactView && "max-h-[calc(100%-2rem)] overflow-hidden")}>
                  {dayEvents.length > 0 ? (
                    <>
                      {dayEvents.slice(0, isCompactView ? 4 : dayEvents.length).map((event) => {
                        if (event.kind === "schedule_block") {
                          const block = event.block;
                          const appearance = getCompactEventAppearance(event);
                          const label = getCompactEventLabel(event);

                          return isCompactView ? (
                            <CompactCalendarEventButton
                              key={event.id}
                              ariaLabel={getScheduleBlockAriaLabel(block)}
                              className={appearance.button}
                              onClick={() => openScheduleBlock(block)}
                              onTooltipClose={closeCompactTooltip}
                              onTooltipOpen={(target, content) =>
                                openCompactTooltip(`calendar-tooltip-${event.kind}-${event.id}`, target, content)
                              }
                              tooltip={renderCompactEventTooltip(event)}
                              tooltipId={`calendar-tooltip-${event.kind}-${event.id}`}
                            >
                              <span className="whitespace-nowrap tabular-nums">{label}</span>
                            </CompactCalendarEventButton>
                          ) : (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() => openScheduleBlock(block)}
                              className={cn(
                                "focus-ring w-full rounded-xl border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm",
                                scheduleBlockEventStyle
                              )}
                            >
                              <span className="block text-xs font-semibold uppercase tracking-[0.12em]">
                                {calendar.scheduleBlocks.scheduleBlock}
                              </span>
                              <span className="mt-1 block font-semibold text-foreground">
                                {getScheduleBlockCompactLabel(block)}
                              </span>
                              <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span>{block.blockType === "full_day" ? calendar.scheduleBlocks.fullDay : calendar.scheduleBlocks.timeRange}</span>
                                {role === "admin" ? <span>{getScheduleBlockTherapistLabel(block)}</span> : null}
                              </span>
                            </button>
                          );
                        }

                        const booking = event.booking;
                        const serviceMeta = getBookingServiceMeta(booking);
                        const appearance = getCompactEventAppearance(event);
                        const label = getCompactEventLabel(event);

                        return isCompactView ? (
                          <CompactCalendarEventButton
                            key={event.id}
                            ariaLabel={getBookingAriaLabel(booking)}
                            className={appearance.button}
                            onClick={() => openBooking(booking)}
                            onTooltipClose={closeCompactTooltip}
                            onTooltipOpen={(target, content) =>
                              openCompactTooltip(`calendar-tooltip-${event.kind}-${event.id}`, target, content)
                            }
                            tooltip={renderCompactEventTooltip(event)}
                            tooltipId={`calendar-tooltip-${event.kind}-${event.id}`}
                          >
                            <span className="whitespace-nowrap tabular-nums">{label}</span>
                          </CompactCalendarEventButton>
                        ) : (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => openBooking(booking)}
                            className={cn(
                              "focus-ring w-full rounded-xl border p-3 text-left text-sm transition hover:-translate-y-0.5 hover:shadow-sm",
                              statusStyles[booking.status]
                            )}
                          >
                            <span className="block text-xs font-semibold uppercase tracking-[0.12em]">
                              {booking.preferredTime}
                            </span>
                            <span className="mt-1 block font-semibold text-foreground">{booking.clientName}</span>
                            <span className="mt-1 block text-sm text-foreground/85">{serviceMeta.serviceName}</span>
                            {serviceMeta.compactText ? (
                              <span className="mt-1 block text-xs font-semibold text-primary/80">
                                {serviceMeta.compactText}
                              </span>
                            ) : null}
                            <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span>
                                {calendar.details.status}: {dictionary.booking.statuses[booking.status]}
                              </span>
                              {role === "admin" ? (
                                <span>{therapistNames.get(booking.therapistId ?? "") ?? booking.specialist}</span>
                              ) : null}
                            </span>
                          </button>
                        );
                      })}
                      {isCompactView && dayEvents.length > 4 ? (
                        <p className="px-2 text-xs font-semibold text-muted-foreground">
                          +{dayEvents.length - 4}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p
                      className={cn(
                        "rounded-xl border border-dashed border-border/80 text-sm leading-6 text-muted-foreground",
                        isCompactView ? "px-2 py-2 text-xs" : "px-3 py-5"
                      )}
                    >
                      {isCompactView ? calendar.emptyCompact : calendar.emptyDay}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {activeTooltip ? (
        <div
          id={activeTooltip.id}
          role="tooltip"
          style={getTooltipPosition(activeTooltip.rect)}
          className="pointer-events-none fixed z-[60] hidden w-72 rounded-2xl border border-border/75 bg-card px-4 py-3 text-left text-sm leading-5 text-foreground opacity-100 shadow-[0_18px_50px_rgb(20_61_42/0.16)] md:block"
        >
          {activeTooltip.content}
        </div>
      ) : null}

      {isCreateOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateBooking();
            }
          }}
        >
          <section
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby="manual-booking-title"
            role="dialog"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-[0_30px_90px_rgb(20_61_42/0.24)] sm:max-w-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {calendar.create.eyebrow}
                </p>
                <h2 id="manual-booking-title" className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">
                  {calendar.create.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{calendar.create.subtitle}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeCreateBooking}>
                {calendar.details.close}
              </Button>
            </div>

            <form className="mt-6 space-y-5" onSubmit={submitManualBooking}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="manual-service" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.service}
                  </label>
                  <Select
                    id="manual-service"
                    value={manualBookingForm.service}
                    onChange={(event) => updateManualBookingService(event.target.value)}
                    aria-invalid={Boolean(manualBookingErrors.service)}
                    disabled={serviceCatalogError || manualServiceCatalog.length === 0}
                  >
                    <option value="">{calendar.create.placeholders.service}</option>
                    {manualServiceCatalog.map((service) => (
                      <option key={service.slug} value={service.slug}>
                        {getServiceOptionLabel(service)}
                      </option>
                    ))}
                  </Select>
                  {serviceCatalogError ? (
                    <p className="text-sm leading-5 text-accent">{calendar.create.servicesLoadError}</p>
                  ) : manualServiceCatalog.length === 0 ? (
                    <p className="text-sm leading-5 text-muted-foreground">{calendar.create.noServicesAvailable}</p>
                  ) : null}
                  <ManualFieldError message={manualBookingErrors.service} />
                </div>

                {role === "admin" ? (
                  <div className="space-y-2">
                    <label htmlFor="manual-therapist" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.therapist}
                    </label>
                    <Select
                      id="manual-therapist"
                      value={manualBookingForm.therapistId}
                      onChange={(event) => updateManualBookingField("therapistId", event.target.value)}
                      aria-invalid={Boolean(manualBookingErrors.therapistId)}
                      disabled={!manualBookingForm.service || manualAvailableTherapists.length === 0}
                    >
                      <option value="">
                        {!manualBookingForm.service
                          ? calendar.create.placeholders.therapistForService
                          : manualAvailableTherapists.length === 0
                            ? calendar.create.placeholders.noTherapistsForService
                            : calendar.create.placeholders.therapist}
                      </option>
                      {manualAvailableTherapists.map((therapist) => (
                        <option key={therapist.id} value={therapist.id}>
                          {therapist.displayName}
                        </option>
                      ))}
                    </Select>
                    <ManualFieldError message={manualBookingErrors.therapistId} />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/70 bg-background/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.therapist}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">
                      {therapistNames.get(manualBookingForm.therapistId) ?? calendar.create.ownTherapistFallback}
                    </p>
                    {manualServiceCatalog.length > 0 ? (
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{calendar.create.servicesAvailableToTherapist}</p>
                    ) : null}
                    <ManualFieldError message={manualBookingErrors.therapistId} />
                  </div>
                )}

                <div className="space-y-2">
                  <label htmlFor="manual-date" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.date}
                  </label>
                  <BookingDatePicker
                    id="manual-date"
                    copy={dictionary.booking.calendar}
                    errorId={manualBookingErrors.preferredDate ? "manual-date-error" : undefined}
                    invalid={Boolean(manualBookingErrors.preferredDate)}
                    isDateSelectable={(value) => isBookingDateSelectable(value, manualMinDate)}
                    locale={locale}
                    minDate={manualMinDate}
                    value={manualBookingForm.preferredDate}
                    onChange={updateManualBookingDate}
                  />
                  <ManualFieldError id="manual-date-error" message={manualBookingErrors.preferredDate} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-time" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.time}
                  </label>
                  <Select
                    id="manual-time"
                    disabled={!manualCanLoadAvailability || isManualAvailabilityLoading || manualAvailableTimeSlots.length === 0}
                    value={manualBookingForm.preferredTime}
                    onChange={(event) => updateManualBookingField("preferredTime", event.target.value)}
                    aria-invalid={Boolean(manualBookingErrors.preferredTime)}
                    aria-describedby={manualBookingErrors.preferredTime ? "manual-time-error" : undefined}
                  >
                    <option value="">
                      {isManualAvailabilityLoading
                        ? dictionary.booking.availability.loadingTimes
                        : manualBookingForm.service && manualBookingForm.preferredDate && !manualBookingForm.therapistId
                          ? calendar.create.placeholders.therapist
                        : manualCanLoadAvailability && manualAvailableTimeSlots.length === 0
                          ? dictionary.booking.availability.noAvailableTimes
                          : dictionary.booking.fields.time.placeholder}
                    </option>
                    {manualAvailableTimeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </Select>
                  <ManualFieldError id="manual-time-error" message={manualBookingErrors.preferredTime} />
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-locale" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.locale}
                  </label>
                  <Select
                    id="manual-locale"
                    value={manualBookingForm.locale}
                    onChange={(event) => updateManualBookingField("locale", event.target.value as Locale)}
                  >
                    <option value="sr">SR</option>
                    <option value="ru">RU</option>
                    <option value="en">EN</option>
                  </Select>
                  <ManualFieldError />
                </div>
              </div>

              {selectedManualService ? (
                <div className="rounded-2xl border border-primary/12 bg-secondary/45 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                    {calendar.create.serviceSummary.title}
                  </p>
                  <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [calendar.create.serviceSummary.service, selectedManualService.name],
                      [calendar.create.serviceSummary.duration, formatServiceDuration(selectedManualService.durationMinutes, locale)],
                      [
                        calendar.create.serviceSummary.price,
                        formatServicePrice(selectedManualService.priceRsd) || calendar.details.priceNotSet
                      ],
                      [calendar.create.serviceSummary.category, dictionary.services.categories[selectedManualService.category]]
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          {label}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  {selectedManualServiceTherapists.length > 0 ? (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      <span className="font-semibold text-primary">{calendar.create.serviceSummary.therapists}: </span>
                      {selectedManualServiceTherapists.join(", ")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="rounded-3xl border border-border/70 bg-background/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">
                      {calendar.create.clientSection.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {calendar.create.clientSection.subtitle}
                    </p>
                  </div>
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-1 rounded-full border border-border/70 bg-card/80 p-1 sm:w-auto sm:min-w-[19rem]">
                    {(["existing", "new"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => updateManualClientMode(mode)}
                        className={cn(
                          "focus-ring min-w-0 rounded-full px-3 py-2 text-center text-[0.68rem] font-semibold uppercase leading-4 tracking-[0.08em] transition sm:px-4 sm:text-xs sm:tracking-[0.12em]",
                          manualBookingForm.clientMode === mode
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-primary"
                        )}
                      >
                        <span className="block min-w-0 truncate">
                          {mode === "existing" ? calendar.create.clientSection.existing : calendar.create.clientSection.new}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {manualBookingForm.clientMode === "existing" ? (
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <label htmlFor="manual-client-search" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientSearch}
                      </label>
                      <Input
                        id="manual-client-search"
                        value={manualBookingForm.clientSearch}
                        onChange={(event) => {
                          updateManualBookingField("clientSearch", event.target.value);
                          updateManualBookingField("selectedClientId", "");
                        }}
                        placeholder={calendar.create.placeholders.clientSearch}
                        aria-invalid={Boolean(manualBookingErrors.selectedClientId)}
                      />
                      <ManualFieldError message={manualBookingErrors.selectedClientId} />
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {filteredManualClients.length > 0 ? (
                        filteredManualClients.map((client) => {
                          const selected = manualBookingForm.selectedClientId === client.id;

                          return (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => selectManualClient(client)}
                              className={cn(
                                "focus-ring rounded-2xl border p-3 text-left transition",
                                selected
                                  ? "border-primary/35 bg-secondary/70 shadow-sm"
                                  : "border-border/70 bg-card/60 hover:border-primary/25 hover:bg-secondary/45"
                              )}
                            >
                              <span className="block text-sm font-semibold text-primary">{client.name}</span>
                              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                                {getManualClientContactLabel(client)}
                              </span>
                              {client.locale ? (
                                <span className="mt-2 inline-flex rounded-full bg-background/70 px-2 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                  {client.locale}
                                </span>
                              ) : null}
                            </button>
                          );
                        })
                      ) : (
                        <p className="rounded-2xl border border-dashed border-border/80 px-3 py-4 text-sm leading-6 text-muted-foreground sm:col-span-2">
                          {calendar.create.clientSection.empty}
                        </p>
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="manual-client-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.clientName}
                    </label>
                    <Input
                      id="manual-client-name"
                      value={manualBookingForm.clientName}
                      onChange={(event) => updateManualBookingField("clientName", event.target.value)}
                      placeholder={calendar.create.placeholders.clientName}
                      aria-invalid={Boolean(manualBookingErrors.clientName)}
                    />
                    <ManualFieldError message={manualBookingErrors.clientName} />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="manual-source-channel" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.sourceChannel}
                    </label>
                    <Select
                      id="manual-source-channel"
                      value={manualBookingForm.sourceChannel}
                      onChange={(event) => updateManualSourceChannel(event.target.value as ManualBookingSourceChannel)}
                      aria-invalid={Boolean(manualBookingErrors.sourceChannel)}
                    >
                      {manualBookingSourceChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {calendar.create.sourceChannels[channel]}
                        </option>
                      ))}
                    </Select>
                    <ManualFieldError message={manualBookingErrors.sourceChannel} />
                  </div>

                  {manualBookingForm.sourceChannel !== "walk_in" ? (
                    <div className="space-y-2">
                      <label htmlFor="manual-client-contact-value" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientContactValue}
                      </label>
                      <Input
                        id="manual-client-contact-value"
                        value={manualBookingForm.clientContactValue}
                        onChange={(event) => {
                          const value = event.target.value;
                          updateManualBookingField("clientContactValue", value);
                          if (
                            manualBookingForm.sourceChannel === "phone" ||
                            manualBookingForm.sourceChannel === "whatsapp" ||
                            manualBookingForm.sourceChannel === "viber"
                          ) {
                            updateManualBookingField("clientPhone", value);
                          }
                        }}
                        placeholder={getContactPlaceholder(manualBookingForm.sourceChannel)}
                        aria-invalid={Boolean(manualBookingErrors.clientContactValue)}
                      />
                      <ManualFieldError message={manualBookingErrors.clientContactValue} />
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border/70 bg-card/55 p-3 text-sm leading-6 text-muted-foreground">
                      {calendar.create.clientSection.walkIn}
                    </div>
                  )}

                  {manualBookingForm.sourceChannel !== "phone" &&
                  manualBookingForm.sourceChannel !== "whatsapp" &&
                  manualBookingForm.sourceChannel !== "viber" ? (
                    <div className="space-y-2">
                      <label htmlFor="manual-client-phone" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientPhoneOptional}
                      </label>
                      <Input
                        id="manual-client-phone"
                        value={manualBookingForm.clientPhone}
                        onChange={(event) => updateManualBookingField("clientPhone", event.target.value)}
                        placeholder={calendar.create.placeholders.clientPhone}
                      />
                      <ManualFieldError />
                    </div>
                  ) : null}

                  {manualBookingForm.clientMode === "new" ? (
                    <div className="space-y-2 sm:col-span-2">
                      <label htmlFor="manual-client-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        {calendar.create.fields.clientNotes}
                      </label>
                      <Textarea
                        id="manual-client-notes"
                        value={manualBookingForm.clientNotes}
                        onChange={(event) => updateManualBookingField("clientNotes", event.target.value)}
                        placeholder={calendar.create.placeholders.clientNotes}
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {role === "admin" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="manual-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {calendar.create.fields.status}
                    </label>
                    <Select
                      id="manual-status"
                      value={manualBookingForm.status}
                      onChange={(event) => updateManualBookingField("status", event.target.value as CreateBookingStatus)}
                    >
                      {manualBookingCreateStatuses.map((status) => (
                        <option key={status} value={status}>
                          {dictionary.booking.statuses[status]}
                        </option>
                      ))}
                    </Select>
                    <ManualFieldError />
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="manual-client-comment" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.clientComment}
                  </label>
                  <Textarea
                    id="manual-client-comment"
                    value={manualBookingForm.clientComment}
                    onChange={(event) => updateManualBookingField("clientComment", event.target.value)}
                    placeholder={calendar.create.placeholders.clientComment}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="manual-internal-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.create.fields.internalNotes}
                  </label>
                  <Textarea
                    id="manual-internal-notes"
                    value={manualBookingForm.internalNotes}
                    onChange={(event) => updateManualBookingField("internalNotes", event.target.value)}
                    placeholder={calendar.create.placeholders.internalNotes}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-border/70 pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={closeCreateBooking}>
                  {calendar.create.cancel}
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? calendar.create.saving : calendar.create.submit}
                </Button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedBooking ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeBooking();
            }
          }}
        >
          <section
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby="booking-details-title"
            role="dialog"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-[0_30px_90px_rgb(20_61_42/0.24)] sm:max-w-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {dictionary.booking.statuses[selectedBooking.status]}
                </p>
                <h2 id="booking-details-title" className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">
                  {selectedBooking.clientName}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedBooking.preferredTime} · {formatDate(selectedBooking.preferredDate, locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeBooking}>
                {calendar.details.close}
              </Button>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                [calendar.details.client, selectedBooking.clientName],
                [calendar.details.phone, selectedBooking.clientPhone],
                [calendar.details.service, selectedBookingServiceMeta?.serviceName ?? selectedBooking.service],
                [
                  calendar.details.duration,
                  selectedBookingServiceMeta?.durationText || calendar.details.durationNotSet
                ],
                [calendar.details.price, selectedBookingServiceMeta?.priceText || calendar.details.priceNotSet],
                ...(selectedBooking.sourceChannel
                  ? [[calendar.details.sourceChannel, calendar.create.sourceChannels[selectedBooking.sourceChannel]]]
                  : []),
                [calendar.details.locale, selectedBooking.locale.toUpperCase()],
                [calendar.details.therapist, therapistNames.get(selectedBooking.therapistId ?? "") ?? selectedBooking.specialist],
                [calendar.details.status, dictionary.booking.statuses[selectedBooking.status]]
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {calendar.details.comment}
                </p>
                <p className="mt-2 rounded-2xl border border-border/70 bg-background/50 p-3 text-sm leading-6 text-foreground">
                  {selectedBooking.clientComment || calendar.details.noComment}
                </p>
              </div>

              {role === "admin" ? (
                <div className="space-y-2">
                  <label htmlFor="booking-therapist" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {calendar.details.assignedTherapist}
                  </label>
                  <Select
                    id="booking-therapist"
                    value={assignedTherapistId ?? ""}
                    onChange={(event) => setAssignedTherapistId(event.target.value || null)}
                  >
                    <option value="">{calendar.filters.unassignedTherapist}</option>
                    {assignmentAvailableTherapists.map((therapist) => (
                      <option key={therapist.id} value={therapist.id}>
                        {therapist.displayName}
                      </option>
                    ))}
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={runTherapistAssignment} disabled={isPending}>
                    {calendar.actions.assignTherapist}
                  </Button>
                </div>
              ) : null}

              <NotificationGenerator
                mode="booking"
                booking={{
                  id: selectedBooking.id,
                  preferredDate: selectedBooking.preferredDate,
                  preferredTime: selectedBooking.preferredTime,
                  service: selectedBooking.service,
                  specialist: therapistNames.get(selectedBooking.therapistId ?? "") ?? selectedBooking.specialist,
                  therapistId: selectedBooking.therapistId,
                  status: selectedBooking.status,
                  source: selectedBooking.source,
                  sourceChannel: selectedBooking.sourceChannel,
                  durationMinutes: selectedBooking.durationMinutes,
                  clientComment: selectedBooking.clientComment,
                  internalNotes: selectedBooking.internalNotes,
                  locale: selectedBooking.locale
                }}
                clientId={selectedBooking.clientId}
                clientName={selectedBooking.clientName}
                clientLocale={selectedBooking.locale}
                dictionary={dictionary}
                locale={locale}
                serviceCatalog={serviceCatalog}
                localizedServiceNames={localizedServiceNames}
              />

              <div className="space-y-2">
                <label htmlFor="booking-notes" className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {calendar.details.internalNotes}
                </label>
                <Textarea id="booking-notes" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} />
                <Button type="button" variant="outline" size="sm" onClick={runNotesUpdate} disabled={isPending}>
                  {calendar.actions.saveNotes}
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border/70 pt-5">
              {role === "admin" ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={() => runStatusUpdate("pending")} disabled={isPending}>
                    {calendar.actions.pending}
                  </Button>
                  <Button type="button" size="sm" onClick={() => runStatusUpdate("confirmed")} disabled={isPending}>
                    {calendar.actions.confirm}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => runStatusUpdate("completed")} disabled={isPending}>
                    {calendar.actions.complete}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => runStatusUpdate("cancelled")} disabled={isPending}>
                    {calendar.actions.cancel}
                  </Button>
                </>
              ) : (
                <>
                  <Button type="button" size="sm" onClick={() => runStatusUpdate("confirmed")} disabled={isPending}>
                    {calendar.actions.confirm}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => runStatusUpdate("completed")} disabled={isPending}>
                    {calendar.actions.markCompleted}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => runStatusUpdate("cancelled")} disabled={isPending}>
                    {calendar.actions.cancel}
                  </Button>
                </>
              )}
            </div>

            {message ? <p className="mt-4 text-sm font-semibold text-primary">{message}</p> : null}
            {isPending ? <p className="mt-2 text-sm text-muted-foreground">{calendar.actions.saving}</p> : null}
          </section>
        </div>
      ) : null}

      {selectedScheduleBlock ? (
        <div
          className="fixed inset-0 z-50 flex items-end bg-primary/25 px-3 py-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              closeScheduleBlock();
            }
          }}
        >
          <section
            ref={dialogRef}
            aria-modal="true"
            aria-labelledby="schedule-block-details-title"
            role="dialog"
            tabIndex={-1}
            onKeyDown={handleDialogKeyDown}
            className="max-h-[92vh] w-full overflow-y-auto rounded-3xl border border-border/80 bg-card p-5 shadow-[0_30px_90px_rgb(20_61_42/0.24)] sm:max-w-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
                  {calendar.scheduleBlocks.scheduleBlock}
                </p>
                <h2 id="schedule-block-details-title" className="mt-2 font-serif text-3xl font-semibold leading-tight text-primary">
                  {selectedScheduleBlock.blockType === "full_day"
                    ? calendar.scheduleBlocks.unavailableAllDay
                    : calendar.scheduleBlocks.blockedTime}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(selectedScheduleBlock.date, locale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={closeScheduleBlock}>
                {calendar.details.close}
              </Button>
            </div>

            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                [
                  calendar.scheduleBlocks.type,
                  selectedScheduleBlock.blockType === "full_day"
                    ? calendar.scheduleBlocks.fullDay
                    : calendar.scheduleBlocks.timeRange
                ],
                [calendar.scheduleBlocks.date, formatDate(selectedScheduleBlock.date, locale, { day: "numeric", month: "long", year: "numeric" })],
                [calendar.create.fields.time, getScheduleBlockTimeLabel(selectedScheduleBlock)],
                [calendar.scheduleBlocks.scope, getScheduleBlockTherapistLabel(selectedScheduleBlock)],
                ...(selectedScheduleBlock.blockScope === "therapist"
                  ? [[calendar.details.therapist, getScheduleBlockTherapistLabel(selectedScheduleBlock)]]
                  : [])
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-border/70 bg-background/50 p-3">
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {calendar.scheduleBlocks.blockReason}
              </p>
              <p className="mt-2 rounded-2xl border border-border/70 bg-background/50 p-3 text-sm leading-6 text-foreground">
                {selectedScheduleBlock.reason || calendar.scheduleBlocks.noReason}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border/70 pt-5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/${locale}/dashboard/schedule?date=${selectedScheduleBlock.date}`)}
              >
                {calendar.scheduleBlocks.openInSchedule}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={closeScheduleBlock}>
                {calendar.details.close}
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

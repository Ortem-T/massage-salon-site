"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { BookingDatePicker } from "@/components/booking/booking-date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { getTodayValue, isBookingDateSelectable, parseDateValue, toDateValue } from "@/lib/booking/booking-availability";
import { type BookingFormValues, createBookingFormSchema } from "@/lib/booking/booking-schema";
import { BookingRequestError, createBookingRequest } from "@/lib/booking/create-booking-request";
import { type ServiceCatalogItem } from "@/lib/services/catalog";
import { type TherapistCatalogItem } from "@/lib/therapists/catalog";
import { cn } from "@/lib/utils";

type BookingFormProps = {
  locale: Locale;
  dictionary: Dictionary;
  serviceCatalog: ServiceCatalogItem[];
  therapistCatalog: TherapistCatalogItem[];
};

type FieldErrorProps = {
  id: string;
  message?: string;
};

type AvailabilityDay = {
  available: boolean;
  availableTimeSlots: string[];
  selectedTherapistBookingCount: number;
  otherTherapistBookingCount: number;
};

type AvailabilityResponse = {
  days: Record<string, AvailabilityDay>;
};

function getMonthStartValue(value: string) {
  const date = parseDateValue(value) ?? new Date();

  return toDateValue(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getCalendarRange(monthStartValue: string) {
  const monthStart = parseDateValue(monthStartValue) ?? new Date();
  const firstDay = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - startOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 41);

  return {
    startDate: toDateValue(start),
    endDate: toDateValue(end)
  };
}

function FieldError({ id, message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      aria-live="polite"
      className="text-sm leading-6 text-accent"
    >
      {message}
    </p>
  );
}

export function BookingForm({ locale, dictionary, serviceCatalog, therapistCatalog }: BookingFormProps) {
  const { booking } = dictionary;
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const today = useMemo(() => getTodayValue(), []);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStartValue(today));
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, AvailabilityDay>>({});
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(false);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const previousSelectionRef = useRef({ service: "", therapist: "" });
  const availabilityRange = useMemo(() => getCalendarRange(visibleMonth), [visibleMonth]);
  const schema = useMemo(
    () =>
      createBookingFormSchema(booking.validation, {
        minDate: today,
        isDateSelectable: (value) => isBookingDateSelectable(value, today)
      }),
    [booking.validation, today]
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isValid }
  } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      service: "",
      specialist: "",
      preferredDate: "",
      preferredTime: "",
      clientName: "",
      phoneNumber: "",
      comment: ""
    }
  });
  const selectedService = watch("service");
  const selectedTherapist = watch("specialist");
  const selectedDate = watch("preferredDate");
  const selectedTime = watch("preferredTime");
  const selectedServiceItem = useMemo(
    () => serviceCatalog.find((service) => service.slug === selectedService) ?? null,
    [selectedService, serviceCatalog]
  );
  const availableTimeSlots = useMemo(
    () => (selectedDate ? (availabilityByDate[selectedDate]?.availableTimeSlots ?? []) : []),
    [availabilityByDate, selectedDate]
  );
  const canLoadAvailability = Boolean(selectedService && selectedTherapist && selectedServiceItem);
  const isCalendarDisabled = !selectedService || !selectedTherapist;
  const isTimeDisabled = !selectedService || !selectedTherapist || !selectedDate || isAvailabilityLoading || availableTimeSlots.length === 0;
  const isDateSelectable = useCallback(
    (value: string) => {
      if (!canLoadAvailability) {
        return false;
      }

      return isBookingDateSelectable(value, today) && Boolean(availabilityByDate[value]?.available);
    },
    [availabilityByDate, canLoadAvailability, today]
  );

  useEffect(() => {
    const previous = previousSelectionRef.current;
    const selectionChanged = previous.service !== selectedService || previous.therapist !== selectedTherapist;

    previousSelectionRef.current = {
      service: selectedService,
      therapist: selectedTherapist
    };

    if (!selectionChanged) {
      return;
    }

    setValue("preferredDate", "", { shouldDirty: Boolean(previous.service || previous.therapist), shouldValidate: false });
    setValue("preferredTime", "", { shouldDirty: Boolean(previous.service || previous.therapist), shouldValidate: false });
    setAvailabilityByDate({});
    setAvailabilityError(false);
  }, [selectedService, selectedTherapist, setValue]);

  useEffect(() => {
    if (!canLoadAvailability) {
      setIsAvailabilityLoading(false);
      setAvailabilityByDate({});
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      therapistId: selectedTherapist,
      serviceSlug: selectedService,
      startDate: availabilityRange.startDate,
      endDate: availabilityRange.endDate
    });

    setIsAvailabilityLoading(true);
    setAvailabilityError(false);

    fetch(`/api/booking-availability?${params.toString()}`, {
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Availability could not be loaded.");
        }

        return (await response.json()) as AvailabilityResponse;
      })
      .then((data) => {
        setAvailabilityByDate(data.days);
      })
      .catch((error) => {
        if ((error as Error).name === "AbortError") {
          return;
        }

        setAvailabilityByDate({});
        setAvailabilityError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsAvailabilityLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [
    availabilityRange.endDate,
    availabilityRange.startDate,
    availabilityRefreshKey,
    canLoadAvailability,
    selectedService,
    selectedTherapist
  ]);

  useEffect(() => {
    if (selectedTime && !availableTimeSlots.includes(selectedTime)) {
      setValue("preferredTime", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [availableTimeSlots, selectedTime, setValue]);

  useEffect(() => {
    if (
      selectedDate &&
      canLoadAvailability &&
      !isAvailabilityLoading &&
      availabilityByDate[selectedDate] &&
      !availabilityByDate[selectedDate].available
    ) {
      setValue("preferredDate", "", { shouldDirty: true, shouldValidate: true });
      setValue("preferredTime", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [availabilityByDate, canLoadAvailability, isAvailabilityLoading, selectedDate, setValue]);

  function selectDate(value: string) {
    setValue("preferredDate", value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }

  async function onSubmit(values: BookingFormValues) {
    setIsSuccess(false);
    setSubmitError(null);

    try {
      await createBookingRequest({ ...values, siteLocale: locale });
      setAvailabilityRefreshKey((current) => current + 1);
      setIsSuccess(true);
      reset();
    } catch (error) {
      if (error instanceof BookingRequestError && error.code === "slot_unavailable") {
        setSubmitError(booking.error.slotUnavailable);
        setAvailabilityRefreshKey((current) => current + 1);
        setValue("preferredTime", "", { shouldDirty: true, shouldValidate: true });
        return;
      }

      setSubmitError(booking.error.message);
    }
  }

  function getDateHint(value: string) {
    const day = availabilityByDate[value];

    if (!day || day.selectedTherapistBookingCount > 0 || day.otherTherapistBookingCount === 0) {
      return null;
    }

    return booking.availability.otherTherapistBookings;
  }

  const timePlaceholder = isAvailabilityLoading
    ? booking.availability.loadingTimes
    : selectedDate && availableTimeSlots.length === 0
      ? booking.availability.noAvailableTimes
      : booking.fields.time.placeholder;

  return (
    <Card className="relative overflow-hidden border-primary/12 bg-card/90 shadow-[0_34px_110px_rgb(27_54_39/0.13)]">
      <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent/55 to-transparent" />
      <div className="absolute -right-16 -top-20 size-48 rounded-full bg-secondary/40 blur-3xl" />
      <CardContent className="relative p-5 sm:p-8 lg:p-10">
        {isSuccess ? (
          <div className="mb-7 rounded-xl border border-primary/18 bg-secondary/45 p-5 shadow-sm sm:p-6">
            <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-6" aria-hidden="true" />
            </div>
            <p className="mt-4 font-serif text-2xl leading-tight text-foreground sm:text-3xl">{booking.success.title}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{booking.success.message}</p>
          </div>
        ) : null}

        {submitError ? (
          <div
            role="alert"
            className="mb-7 rounded-xl border border-accent/25 bg-accent/10 p-5 text-sm leading-7 text-accent shadow-sm"
          >
            {submitError}
          </div>
        ) : null}

        <form className="grid gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="group grid gap-2.5">
              <Label htmlFor="booking-service">{booking.fields.service.label}</Label>
              <div className="relative">
                <Select
                  id="booking-service"
                  aria-invalid={!!errors.service}
                  aria-describedby={errors.service ? "booking-service-error" : undefined}
                  {...register("service")}
                >
                  <option value="">{booking.fields.service.placeholder}</option>
                  {serviceCatalog.map((service) => (
                    <option key={service.slug} value={service.slug}>
                      {service.name}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              </div>
              <FieldError id="booking-service-error" message={errors.service?.message} />
            </div>

            <div className="group grid gap-2.5">
              <Label htmlFor="booking-specialist">{booking.fields.specialist.label}</Label>
              <div className="relative">
                <Select
                  id="booking-specialist"
                  aria-invalid={!!errors.specialist}
                  aria-describedby={errors.specialist ? "booking-specialist-error" : undefined}
                  {...register("specialist")}
                >
                  <option value="">{booking.fields.specialist.placeholder}</option>
                  {therapistCatalog.map((therapist) => (
                    <option key={therapist.id} value={therapist.id}>
                      {therapist.publicTitle ? `${therapist.displayName} · ${therapist.publicTitle}` : therapist.displayName}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              </div>
              <FieldError id="booking-specialist-error" message={errors.specialist?.message} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            <div className="grid gap-2.5">
              <Label htmlFor="booking-date-trigger">{booking.fields.date.label}</Label>
              <input
                id="booking-date-value"
                type="hidden"
                {...register("preferredDate")}
              />
              <BookingDatePicker
                id="booking-date-trigger"
                value={selectedDate}
                minDate={today}
                locale={locale}
                copy={booking.calendar}
                disabled={isCalendarDisabled}
                getDateHint={getDateHint}
                invalid={!!errors.preferredDate}
                errorId={errors.preferredDate || availabilityError ? "booking-date-error" : undefined}
                isDateSelectable={isDateSelectable}
                onChange={selectDate}
                onVisibleMonthChange={setVisibleMonth}
              />
              <FieldError
                id="booking-date-error"
                message={errors.preferredDate?.message ?? (availabilityError ? booking.error.message : undefined)}
              />
            </div>

            <div className="group grid gap-2.5">
              <Label htmlFor="booking-time">{booking.fields.time.label}</Label>
              <div className="relative">
                <Select
                  id="booking-time"
                  aria-invalid={!!errors.preferredTime}
                  aria-describedby={errors.preferredTime ? "booking-time-error" : undefined}
                  disabled={isTimeDisabled}
                  {...register("preferredTime")}
                >
                  <option value="">{timePlaceholder}</option>
                  {availableTimeSlots.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              </div>
              <FieldError id="booking-time-error" message={errors.preferredTime?.message} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            <div className="grid gap-2.5">
              <Label htmlFor="booking-name">{booking.fields.name.label}</Label>
              <Input
                id="booking-name"
                type="text"
                placeholder={booking.fields.name.placeholder}
                autoComplete="name"
                aria-invalid={!!errors.clientName}
                aria-describedby={errors.clientName ? "booking-name-error" : undefined}
                {...register("clientName")}
              />
              <FieldError id="booking-name-error" message={errors.clientName?.message} />
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="booking-phone">{booking.fields.phone.label}</Label>
              <Input
                id="booking-phone"
                type="tel"
                placeholder={booking.fields.phone.placeholder}
                autoComplete="tel"
                aria-invalid={!!errors.phoneNumber}
                aria-describedby={errors.phoneNumber ? "booking-phone-error" : undefined}
                {...register("phoneNumber")}
              />
              <FieldError id="booking-phone-error" message={errors.phoneNumber?.message} />
            </div>
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="booking-comment">{booking.fields.comment.label}</Label>
            <Textarea
              id="booking-comment"
              placeholder={booking.fields.comment.placeholder}
              aria-invalid={!!errors.comment}
              aria-describedby={errors.comment ? "booking-comment-error" : undefined}
              {...register("comment")}
            />
            <FieldError id="booking-comment-error" message={errors.comment?.message} />
          </div>

          <div className="flex flex-col gap-5 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-md text-sm leading-7 text-muted-foreground">{booking.formNote}</p>
            <Button
              type="submit"
              size="lg"
              disabled={!isValid || isSubmitting}
              className={cn(
                "min-h-14 w-full px-8 shadow-[0_20px_58px_rgb(20_61_42/0.22)] sm:w-auto",
                isSubmitting && "cursor-wait"
              )}
            >
              {isSubmitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              {isSubmitting ? booking.submitting : booking.submit}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

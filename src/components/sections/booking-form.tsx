"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { getAvailableTimeSlots, getTodayValue, isBookingDateSelectable } from "@/lib/booking/booking-availability";
import { type BookingFormValues, createBookingFormSchema } from "@/lib/booking/booking-schema";
import { createBookingRequest } from "@/lib/booking/create-booking-request";
import { type ServiceCatalogItem } from "@/lib/services/catalog";
import { cn } from "@/lib/utils";

type BookingFormProps = {
  locale: Locale;
  dictionary: Dictionary;
  serviceCatalog: ServiceCatalogItem[];
};

type FieldErrorProps = {
  id: string;
  message?: string;
};

function FieldError({ id, message }: FieldErrorProps) {
  return (
    <p
      id={id}
      role={message ? "alert" : undefined}
      aria-live="polite"
      className={cn("min-h-6 text-sm leading-6 text-accent", !message && "invisible")}
    >
      {message || " "}
    </p>
  );
}

export function BookingForm({ locale, dictionary, serviceCatalog }: BookingFormProps) {
  const { booking } = dictionary;
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const today = useMemo(() => getTodayValue(), []);
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
  const selectedDate = watch("preferredDate");
  const selectedTime = watch("preferredTime");
  const availableTimeSlots = useMemo(() => getAvailableTimeSlots(selectedDate), [selectedDate]);

  useEffect(() => {
    if (selectedTime && !availableTimeSlots.includes(selectedTime as (typeof availableTimeSlots)[number])) {
      setValue("preferredTime", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [availableTimeSlots, selectedTime, setValue]);

  function selectDate(value: string) {
    setValue("preferredDate", value, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
  }

  async function onSubmit(values: BookingFormValues) {
    setIsSuccess(false);
    setSubmitError(null);

    try {
      await createBookingRequest({ ...values, siteLocale: locale });
      setIsSuccess(true);
      reset();
    } catch {
      setSubmitError(booking.error.message);
    }
  }

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
                  {booking.specialistOptions.map((specialist) => (
                    <option key={specialist.value} value={specialist.value}>
                      {specialist.label}
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
                invalid={!!errors.preferredDate}
                errorId={errors.preferredDate ? "booking-date-error" : undefined}
                isDateSelectable={(value) => isBookingDateSelectable(value, today)}
                onChange={selectDate}
              />
              <FieldError id="booking-date-error" message={errors.preferredDate?.message} />
            </div>

            <div className="group grid gap-2.5">
              <Label htmlFor="booking-time">{booking.fields.time.label}</Label>
              <div className="relative">
                <Select
                  id="booking-time"
                  aria-invalid={!!errors.preferredTime}
                  aria-describedby={errors.preferredTime ? "booking-time-error" : undefined}
                  disabled={!selectedDate}
                  {...register("preferredTime")}
                >
                  <option value="">{booking.fields.time.placeholder}</option>
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

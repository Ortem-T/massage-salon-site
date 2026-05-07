"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { type BookingFormValues, createBookingFormSchema } from "@/lib/booking/booking-schema";
import { createBookingRequest } from "@/lib/booking/create-booking-request";
import { cn } from "@/lib/utils";

type BookingFormProps = {
  dictionary: Dictionary;
};

type FieldErrorProps = {
  message?: string;
};

const timeSlots = ["10:00", "11:30", "13:00", "14:30", "16:00", "17:30", "19:00"];

function FieldError({ message }: FieldErrorProps) {
  return message ? <p className="text-sm leading-6 text-accent">{message}</p> : null;
}

function getTodayValue() {
  return new Date().toISOString().split("T")[0];
}

export function BookingForm({ dictionary }: BookingFormProps) {
  const { booking, services } = dictionary;
  const [isSuccess, setIsSuccess] = useState(false);
  const schema = useMemo(() => createBookingFormSchema(booking.validation), [booking.validation]);
  const today = useMemo(() => getTodayValue(), []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid }
  } = useForm<BookingFormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      service: "",
      preferredDate: "",
      preferredTime: "",
      clientName: "",
      phoneNumber: "",
      preferredLanguage: "" as Locale,
      comment: ""
    }
  });

  async function onSubmit(values: BookingFormValues) {
    setIsSuccess(false);
    await createBookingRequest(values);
    setIsSuccess(true);
    reset();
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

        <form className="grid gap-6" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="group grid gap-2.5">
              <Label htmlFor="booking-service">{booking.fields.service.label}</Label>
              <div className="relative">
                <Select id="booking-service" aria-invalid={!!errors.service} {...register("service")}>
                  <option value="">{booking.fields.service.placeholder}</option>
                  {services.items.map((service) => (
                    <option key={service.title} value={service.title}>
                      {service.title}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              </div>
              <FieldError message={errors.service?.message} />
            </div>

            <div className="group grid gap-2.5">
              <Label htmlFor="booking-language">{booking.fields.language.label}</Label>
              <div className="relative">
                <Select
                  id="booking-language"
                  aria-invalid={!!errors.preferredLanguage}
                  {...register("preferredLanguage")}
                >
                  <option value="">{booking.fields.language.placeholder}</option>
                  {booking.languageOptions.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              </div>
              <FieldError message={errors.preferredLanguage?.message} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
            <div className="grid gap-2.5">
              <Label htmlFor="booking-date">{booking.fields.date.label}</Label>
              <Input
                id="booking-date"
                type="date"
                min={today}
                aria-invalid={!!errors.preferredDate}
                {...register("preferredDate")}
              />
              <FieldError message={errors.preferredDate?.message} />
            </div>

            <div className="group grid gap-2.5">
              <Label htmlFor="booking-time">{booking.fields.time.label}</Label>
              <div className="relative">
                <Select id="booking-time" aria-invalid={!!errors.preferredTime} {...register("preferredTime")}>
                  <option value="">{booking.fields.time.placeholder}</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
              </div>
              <FieldError message={errors.preferredTime?.message} />
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
                {...register("clientName")}
              />
              <FieldError message={errors.clientName?.message} />
            </div>

            <div className="grid gap-2.5">
              <Label htmlFor="booking-phone">{booking.fields.phone.label}</Label>
              <Input
                id="booking-phone"
                type="tel"
                placeholder={booking.fields.phone.placeholder}
                autoComplete="tel"
                aria-invalid={!!errors.phoneNumber}
                {...register("phoneNumber")}
              />
              <FieldError message={errors.phoneNumber?.message} />
            </div>
          </div>

          <div className="grid gap-2.5">
            <Label htmlFor="booking-comment">{booking.fields.comment.label}</Label>
            <Textarea
              id="booking-comment"
              placeholder={booking.fields.comment.placeholder}
              aria-invalid={!!errors.comment}
              {...register("comment")}
            />
            <FieldError message={errors.comment?.message} />
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

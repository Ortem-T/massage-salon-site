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
    <Card className="border-primary/10 bg-card/92">
      <CardContent className="p-5 sm:p-7 lg:p-9">
        {isSuccess ? (
          <div className="mb-6 rounded-lg border border-primary/20 bg-secondary/55 p-5">
            <CheckCircle2 className="size-6 text-primary" aria-hidden="true" />
            <p className="mt-3 font-serif text-2xl leading-tight text-foreground">{booking.success.title}</p>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{booking.success.message}</p>
          </div>
        ) : null}

        <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-2">
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
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <FieldError message={errors.service?.message} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="booking-language">{booking.fields.language.label}</Label>
              <div className="relative">
                <Select id="booking-language" aria-invalid={!!errors.preferredLanguage} {...register("preferredLanguage")}>
                  <option value="">{booking.fields.language.placeholder}</option>
                  {booking.languageOptions.map((language) => (
                    <option key={language.value} value={language.value}>
                      {language.label}
                    </option>
                  ))}
                </Select>
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <FieldError message={errors.preferredLanguage?.message} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="booking-date">{booking.fields.date.label}</Label>
              <Input id="booking-date" type="date" min={today} aria-invalid={!!errors.preferredDate} {...register("preferredDate")} />
              <FieldError message={errors.preferredDate?.message} />
            </div>

            <div className="grid gap-2">
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
                <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <FieldError message={errors.preferredTime?.message} />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
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

            <div className="grid gap-2">
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

          <div className="grid gap-2">
            <Label htmlFor="booking-comment">{booking.fields.comment.label}</Label>
            <Textarea
              id="booking-comment"
              placeholder={booking.fields.comment.placeholder}
              aria-invalid={!!errors.comment}
              {...register("comment")}
            />
            <FieldError message={errors.comment?.message} />
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">{booking.formNote}</p>
            <Button
              type="submit"
              size="lg"
              disabled={!isValid || isSubmitting}
              className={cn("w-full sm:w-auto", isSubmitting && "cursor-wait")}
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

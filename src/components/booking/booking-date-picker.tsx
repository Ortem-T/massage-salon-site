"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n/config";
import { parseDateValue, toDateValue } from "@/lib/booking/booking-availability";
import { cn } from "@/lib/utils";

type BookingCalendarCopy = {
  chooseDate: string;
  previousMonth: string;
  nextMonth: string;
  unavailable: string;
};

type BookingDatePickerProps = {
  id: string;
  value: string;
  minDate: string;
  locale: Locale;
  copy: BookingCalendarCopy;
  disabled?: boolean;
  errorId?: string;
  invalid?: boolean;
  isDateSelectable: (value: string) => boolean;
  onChange: (value: string) => void;
};

const localeMap: Record<Locale, string> = {
  sr: "sr-Latn-RS",
  ru: "ru-RU",
  en: "en-US"
};

function getMonthStart(value: string) {
  const date = parseDateValue(value) ?? new Date();

  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const startDate = new Date(month.getFullYear(), month.getMonth(), 1 - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    return date;
  });
}

function moveMonth(month: Date, offset: number) {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}

export function BookingDatePicker({
  id,
  value,
  minDate,
  locale,
  copy,
  disabled,
  errorId,
  invalid,
  isDateSelectable,
  onChange
}: BookingDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(value || minDate));
  const formatterLocale = localeMap[locale];
  const selectedDate = value ? parseDateValue(value) : null;
  const selectedLabel = selectedDate
    ? new Intl.DateTimeFormat(formatterLocale, { day: "numeric", month: "long", year: "numeric" }).format(selectedDate)
    : copy.chooseDate;
  const monthLabel = new Intl.DateTimeFormat(formatterLocale, { month: "long", year: "numeric" }).format(visibleMonth);
  const weekDays = useMemo(() => {
    const monday = new Date(2026, 0, 5);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return new Intl.DateTimeFormat(formatterLocale, { weekday: "short" }).format(date);
    });
  }, [formatterLocale]);
  const days = useMemo(() => getCalendarDays(visibleMonth), [visibleMonth]);

  function selectDate(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <Button
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-invalid={invalid}
        aria-describedby={errorId}
        onClick={() => setIsOpen((current) => !current)}
        className={cn(
          "min-h-13 w-full justify-start rounded-xl border-border/75 bg-background/62 px-4 py-3 text-left text-[0.95rem] font-normal text-foreground shadow-[inset_0_1px_0_rgb(255_250_240/0.7)] hover:border-accent/45 hover:bg-card/78",
          !value && "text-muted-foreground/75",
          invalid && "border-accent"
        )}
      >
        <CalendarDays aria-hidden="true" className="text-accent" />
        <span>{selectedLabel}</span>
      </Button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={copy.chooseDate}
          className="absolute left-0 top-[calc(100%+0.75rem)] z-30 w-full min-w-72 rounded-xl border border-border/75 bg-card p-4 shadow-[0_26px_80px_rgb(27_54_39/0.18)] sm:w-80"
        >
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={copy.previousMonth}
              onClick={() => setVisibleMonth((month) => moveMonth(month, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="font-serif text-2xl leading-none text-primary">{monthLabel}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={copy.nextMonth}
              onClick={() => setVisibleMonth((month) => moveMonth(month, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <p key={day} className="pb-2 text-[0.7rem] font-semibold uppercase text-muted-foreground">
                {day}
              </p>
            ))}
            {days.map((date) => {
              const dateValue = toDateValue(date);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = value === dateValue;
              const isSelectable = isDateSelectable(dateValue);

              return (
                <button
                  key={dateValue}
                  type="button"
                  disabled={!isSelectable}
                  aria-label={
                    isSelectable
                      ? new Intl.DateTimeFormat(formatterLocale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        }).format(date)
                      : `${new Intl.DateTimeFormat(formatterLocale, {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        }).format(date)}. ${copy.unavailable}`
                  }
                  aria-pressed={isSelected}
                  onClick={() => selectDate(dateValue)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-full text-sm transition-all duration-200",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/45",
                    isSelectable && "hover:bg-secondary hover:text-primary",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !isSelectable && "cursor-not-allowed text-muted-foreground/30 line-through"
                  )}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}


"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

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
  getDateHint?: (value: string) => string | null;
  isDateSelectable: (value: string) => boolean;
  onChange: (value: string) => void;
  onVisibleMonthChange?: (value: string) => void;
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

function getDaysInMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function BookingDatePicker({
  id,
  value,
  minDate,
  locale,
  copy,
  disabled,
  errorId,
  getDateHint,
  invalid,
  isDateSelectable,
  onChange,
  onVisibleMonthChange
}: BookingDatePickerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => getMonthStart(value || minDate));
  const [focusedDateValue, setFocusedDateValue] = useState(value || minDate);
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
  const selectableDateValues = useMemo(
    () => days.map(toDateValue).filter((dateValue) => isDateSelectable(dateValue)),
    [days, isDateSelectable]
  );
  const firstSelectableDateValue = selectableDateValues[0] ?? null;

  useEffect(() => {
    onVisibleMonthChange?.(toDateValue(visibleMonth));
  }, [onVisibleMonthChange, visibleMonth]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !firstSelectableDateValue) {
      return;
    }

    const focusedDateIsSelectable = selectableDateValues.includes(focusedDateValue);
    const nextFocusedDateValue = focusedDateIsSelectable ? focusedDateValue : firstSelectableDateValue;

    if (!focusedDateIsSelectable) {
      setFocusedDateValue(nextFocusedDateValue);
    }

    const animationFrame = requestAnimationFrame(() => {
      dayButtonRefs.current.get(nextFocusedDateValue)?.focus();
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [firstSelectableDateValue, focusedDateValue, isOpen, selectableDateValues]);

  function selectDate(nextValue: string) {
    onChange(nextValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function focusDate(nextValue: string) {
    setFocusedDateValue(nextValue);
    requestAnimationFrame(() => {
      dayButtonRefs.current.get(nextValue)?.focus();
    });
  }

  function focusNearestSelectableDate(startIndex: number, step: number) {
    for (let index = startIndex; index >= 0 && index < days.length; index += step) {
      const nextValue = toDateValue(days[index]);

      if (isDateSelectable(nextValue)) {
        focusDate(nextValue);
        return;
      }
    }
  }

  function focusSameDayInAdjacentMonth(offset: number) {
    const focusedDate = parseDateValue(focusedDateValue) ?? selectedDate ?? parseDateValue(minDate) ?? visibleMonth;
    const nextMonth = moveMonth(visibleMonth, offset);
    const nextDay = Math.min(focusedDate.getDate(), getDaysInMonth(nextMonth));
    const nextDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay);

    setVisibleMonth(nextMonth);
    setFocusedDateValue(toDateValue(nextDate));
  }

  function moveVisibleMonth(offset: number) {
    const nextMonth = moveMonth(visibleMonth, offset);
    const focusedDate = parseDateValue(focusedDateValue) ?? selectedDate ?? parseDateValue(minDate);
    const nextDay = focusedDate ? Math.min(focusedDate.getDate(), getDaysInMonth(nextMonth)) : 1;

    setVisibleMonth(nextMonth);
    setFocusedDateValue(toDateValue(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), nextDay)));
  }

  function handleDateKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, index: number) {
    const keyActions: Record<string, () => void> = {
      ArrowLeft: () => focusNearestSelectableDate(index - 1, -1),
      ArrowRight: () => focusNearestSelectableDate(index + 1, 1),
      ArrowUp: () => focusNearestSelectableDate(index - 7, -1),
      ArrowDown: () => focusNearestSelectableDate(index + 7, 1),
      Home: () => focusNearestSelectableDate(index - (index % 7), 1),
      End: () => focusNearestSelectableDate(index + (6 - (index % 7)), -1),
      PageUp: () => focusSameDayInAdjacentMonth(-1),
      PageDown: () => focusSameDayInAdjacentMonth(1)
    };

    const action = keyActions[event.key];

    if (!action) {
      return;
    }

    event.preventDefault();
    action();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Button
        ref={triggerRef}
        id={id}
        type="button"
        variant="outline"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-invalid={invalid}
        aria-describedby={errorId}
        onClick={() => {
          setFocusedDateValue(value || firstSelectableDateValue || minDate);
          setIsOpen((current) => !current);
        }}
        className={cn(
          "min-h-13 w-full justify-start rounded-xl border-border/75 bg-background/62 px-4 py-3 text-left text-[0.95rem] font-normal text-foreground shadow-[inset_0_1px_0_rgb(255_250_240/0.7)] hover:translate-y-0 hover:border-accent/45 hover:bg-card/78 hover:shadow-[inset_0_1px_0_rgb(255_250_240/0.7)]",
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
              onClick={() => moveVisibleMonth(-1)}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <p className="font-serif text-2xl leading-none text-primary">{monthLabel}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={copy.nextMonth}
              onClick={() => moveVisibleMonth(1)}
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
            {days.map((date, index) => {
              const dateValue = toDateValue(date);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isSelected = value === dateValue;
              const isSelectable = isDateSelectable(dateValue);
              const hint = getDateHint?.(dateValue) ?? null;
              const isDisabled = !isSelectable;
              const formattedDate = new Intl.DateTimeFormat(formatterLocale, {
                day: "numeric",
                month: "long",
                year: "numeric"
              }).format(date);

              return (
                <button
                  key={dateValue}
                  ref={(node) => {
                    if (node) {
                      dayButtonRefs.current.set(dateValue, node);
                    } else {
                      dayButtonRefs.current.delete(dateValue);
                    }
                  }}
                  type="button"
                  disabled={isDisabled && !hint}
                  aria-disabled={isDisabled}
                  aria-label={
                    !isDisabled
                      ? hint
                        ? `${formattedDate}. ${hint}`
                        : formattedDate
                      : hint
                        ? `${formattedDate}. ${copy.unavailable}. ${hint}`
                        : `${formattedDate}. ${copy.unavailable}`
                  }
                  aria-pressed={isSelected}
                  onClick={() => {
                    if (!isDisabled) {
                      selectDate(dateValue);
                    }
                  }}
                  onFocus={() => {
                    if (!isDisabled) {
                      setFocusedDateValue(dateValue);
                    }
                  }}
                  onKeyDown={(event) => handleDateKeyDown(event, index)}
                  tabIndex={isSelectable && focusedDateValue === dateValue ? 0 : -1}
                  title={hint ?? undefined}
                  className={cn(
                    "relative flex aspect-square items-center justify-center rounded-full text-sm transition-all duration-200",
                    isCurrentMonth ? "text-foreground" : "text-muted-foreground/45",
                    isSelectable && "hover:bg-secondary hover:text-primary",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                    !isSelectable && "cursor-not-allowed text-muted-foreground/30 line-through"
                  )}
                >
                  <span>{date.getDate()}</span>
                  {hint ? (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-1 size-1 rounded-full bg-accent/60",
                        isSelected && "bg-primary-foreground/80"
                      )}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { type MouseEvent } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { type Locale } from "@/i18n/config";
import { bookingServiceQueryParam, bookingServiceSelectEvent } from "@/lib/booking/service-preselection";

type ServiceBookingButtonProps = {
  label: string;
  locale: Locale;
  serviceSlug: string;
};

export function ServiceBookingButton({ label, locale, serviceSlug }: ServiceBookingButtonProps) {
  const href = `/${locale}?${bookingServiceQueryParam}=${encodeURIComponent(serviceSlug)}#booking`;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    const bookingSection = document.getElementById("booking");
    const currentPath = window.location.pathname.replace(/\/$/, "");

    if (currentPath !== `/${locale}` || !bookingSection) {
      return;
    }

    event.preventDefault();

    const nextUrl = new URL(window.location.href);
    nextUrl.pathname = `/${locale}`;
    nextUrl.searchParams.set(bookingServiceQueryParam, serviceSlug);
    nextUrl.hash = "booking";
    window.history.pushState({}, "", nextUrl);

    window.dispatchEvent(
      new CustomEvent(bookingServiceSelectEvent, {
        detail: { serviceSlug }
      })
    );

    bookingSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  return (
    <Button asChild size="sm" variant="outline" className="min-w-32">
      <Link href={href} onClick={handleClick}>
        {label}
      </Link>
    </Button>
  );
}

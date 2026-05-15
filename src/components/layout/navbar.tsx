"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Button } from "@/components/ui/button";
import { type Dictionary } from "@/i18n/dictionaries";
import { type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type NavbarProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Navbar({ locale, dictionary }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { brand, nav } = dictionary;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 border-b border-[#d5c5a8]/62 bg-[#f8f2e5]/82 shadow-[0_10px_34px_rgb(20_61_42/0.06)] backdrop-blur-2xl">
      <div className="container-shell flex h-[4.75rem] items-center justify-between gap-4">
        <Link href={`/${locale}`} className="focus-ring flex items-center rounded-md" aria-label={brand.name}>
          <Image
            src="/images/raine-logo-ui.png"
            alt={brand.name}
            width={136}
            height={136}
            priority
            className="h-14 w-auto object-contain sm:h-16"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {nav.links.map((link) => (
            <Link
              key={link.href}
              href={`/${locale}${link.href}`}
              className="focus-ring rounded-full px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher currentLocale={locale} label={nav.language} />
          <Button asChild>
            <Link href={`/${locale}#booking`}>{nav.cta}</Link>
          </Button>
        </div>

        <button
          type="button"
          className="focus-ring inline-flex size-11 items-center justify-center rounded-full border border-primary/20 bg-card/80 text-primary lg:hidden"
          aria-label={isOpen ? nav.close : nav.menu}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((value) => !value)}
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>

      <div
        className={cn(
          "container-shell grid overflow-hidden transition-[grid-template-rows] duration-300 lg:hidden",
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0">
          <div className="mb-4 rounded-xl border border-border/80 bg-card/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur-xl">
            <nav className="grid gap-2" aria-label="Mobile">
              {nav.links.map((link) => (
                <Link
                  key={link.href}
                  href={`/${locale}${link.href}`}
                  className="focus-ring rounded-full px-4 py-3 text-sm font-medium text-foreground hover:bg-secondary"
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <LanguageSwitcher currentLocale={locale} label={nav.language} onNavigate={() => setIsOpen(false)} />
              <Button asChild>
                <Link href={`/${locale}#booking`} onClick={() => setIsOpen(false)}>
                  {nav.cta}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

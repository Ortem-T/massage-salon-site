"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { localeLabels, localeNames, locales, preferredLocaleCookieName, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type LanguageSwitcherProps = {
  currentLocale: Locale;
  label: string;
  onNavigate?: () => void;
};

export function LanguageSwitcher({ currentLocale, label, onNavigate }: LanguageSwitcherProps) {
  const pathname = usePathname();

  function getLocalizedPath(locale: Locale) {
    const segments = pathname.split("/");
    segments[1] = locale;
    return segments.join("/") || `/${locale}`;
  }

  function savePreferredLocale(locale: Locale) {
    document.cookie = `${preferredLocaleCookieName}=${locale}; Max-Age=31536000; Path=/; SameSite=Lax`;
  }

  return (
    <nav aria-label={label} className="flex items-center rounded-full border border-primary/15 bg-[#fffaf0]/76 p-1 shadow-sm backdrop-blur">
      {locales.map((locale) => (
        <Link
          key={locale}
          href={getLocalizedPath(locale)}
          hrefLang={locale}
          aria-label={localeNames[locale]}
          onClick={() => {
            savePreferredLocale(locale);
            onNavigate?.();
          }}
          className={cn(
            "focus-ring rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors",
            locale === currentLocale
              ? "bg-primary text-primary-foreground hover:text-primary-foreground"
              : "hover:text-primary"
          )}
        >
          {localeLabels[locale]}
        </Link>
      ))}
    </nav>
  );
}

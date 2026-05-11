import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/cormorant-garamond/700.css";
import "../globals.css";

import { defaultLocale, isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://raine-spa.rs";

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    return {};
  }

  const locale = rawLocale;
  const dictionary = await getDictionary(locale);
  const languages = Object.fromEntries(locales.map((item) => [item, `${siteUrl}/${item}`]));

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: dictionary.seo.title,
      template: `%s | ${dictionary.brand.name}`
    },
    description: dictionary.seo.description,
    keywords: [...dictionary.seo.keywords],
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...languages,
        "x-default": `/${defaultLocale}`
      }
    },
    openGraph: {
      title: dictionary.seo.title,
      description: dictionary.seo.description,
      url: `/${locale}`,
      siteName: dictionary.brand.name,
      locale,
      type: "website",
      images: [
        {
          url: "/images/spa-hero.png",
          width: 1536,
          height: 1024,
          alt: dictionary.brand.name
        }
      ]
    },
    twitter: {
      card: "summary_large_image",
      title: dictionary.seo.title,
      description: dictionary.seo.description,
      images: ["/images/spa-hero.png"]
    },
    robots: {
      index: true,
      follow: true
    }
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;

  return (
    <html lang={locale}>
      <body>{children}</body>
    </html>
  );
}

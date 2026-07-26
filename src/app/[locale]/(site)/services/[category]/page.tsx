import { ArrowLeft, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { ServiceBookingButton } from "@/components/sections/service-booking-button";
import { Button } from "@/components/ui/button";
import { getDefaultLocalizedUrl, getLocalizedUrl, getLocalizedUrls, siteName } from "@/config/seo";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import {
  formatPublicServiceDuration,
  formatServicePrice,
  getServiceCatalog,
  serviceCategories,
  type ServiceCatalogItem,
  type ServiceCategory
} from "@/lib/services/catalog";
import { cn } from "@/lib/utils";

type ServiceCategoryPageProps = {
  params: Promise<{ locale: string; category: string }>;
};

export const revalidate = 300;

function isServiceCategory(value: string): value is ServiceCategory {
  return serviceCategories.includes(value as ServiceCategory);
}

function getPermanentMakeupGroup(service: ServiceCatalogItem) {
  if (service.slug.startsWith("powder-brows")) {
    return "brows";
  }

  if (service.slug.startsWith("lip-")) {
    return "lips";
  }

  return "lashLine";
}

export function generateStaticParams() {
  return locales.flatMap((locale) => serviceCategories.map((category) => ({ locale, category })));
}

export async function generateMetadata({ params }: ServiceCategoryPageProps): Promise<Metadata> {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "sr";

  if (!isServiceCategory(rawCategory)) {
    return {};
  }

  const dictionary = await getDictionary(locale);
  const categoryCopy = dictionary.services.categoryPages[rawCategory];
  const path = `/services/${rawCategory}`;

  return {
    title: categoryCopy.seoTitle,
    description: categoryCopy.seoDescription,
    alternates: {
      canonical: getLocalizedUrl(locale, path),
      languages: {
        ...getLocalizedUrls(path),
        "x-default": getDefaultLocalizedUrl(path)
      }
    },
    openGraph: {
      title: categoryCopy.seoTitle,
      description: categoryCopy.seoDescription,
      siteName,
      locale,
      type: "website",
      url: getLocalizedUrl(locale, path)
    }
  };
}

export default async function ServiceCategoryPage({ params }: ServiceCategoryPageProps) {
  const { locale: rawLocale, category: rawCategory } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "sr";

  if (!isServiceCategory(rawCategory)) {
    notFound();
  }

  const [dictionary, serviceCatalog] = await Promise.all([
    getDictionary(locale),
    getServiceCatalog(locale, { bookableOnlineOnly: false, requireTherapistAssignment: false })
  ]);
  const categoryCopy = dictionary.services.categoryPages[rawCategory];
  const categoryServices = serviceCatalog.filter((service) => service.active && service.category === rawCategory);
  const isPermanentMakeup = rawCategory === "permanent_makeup";

  const groups = isPermanentMakeup
    ? (["brows", "lips", "lashLine"] as const).map((group) => ({
        group,
        services: categoryServices.filter((service) => getPermanentMakeupGroup(service) === group)
      }))
    : [{ group: null, services: categoryServices }];

  return (
    <main className="bg-background">
      <section className="relative isolate overflow-hidden py-24 sm:py-32">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
        <div className="container-shell">
          <MotionReveal>
            <Button asChild variant="ghost" className="mb-12 px-0 text-muted-foreground hover:text-primary">
              <Link href={`/${locale}#services`}>
                <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
                {dictionary.services.backToServices}
              </Link>
            </Button>
          </MotionReveal>

          <MotionReveal>
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                {dictionary.services.categories[rawCategory]}
              </p>
              <h1 className="mt-5 font-serif text-6xl leading-[0.9] text-primary sm:text-7xl lg:text-8xl">
                {categoryCopy.title}
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-muted-foreground">
                {categoryCopy.description}
              </p>
            </div>
          </MotionReveal>

          {isPermanentMakeup ? (
            <MotionReveal>
              <p className="mt-10 max-w-3xl rounded-3xl border border-accent/20 bg-secondary/50 p-6 text-sm leading-7 text-muted-foreground">
                {dictionary.services.permanentMakeupGroups.note}
              </p>
            </MotionReveal>
          ) : null}

          <div className="mt-16 space-y-14">
            {groups.map(({ group, services }, groupIndex) =>
              services.length > 0 ? (
                <div key={group ?? "services"}>
                  {group ? (
                    <MotionReveal>
                      <h2 className="font-serif text-4xl leading-tight text-primary sm:text-5xl">
                        {dictionary.services.permanentMakeupGroups[group]}
                      </h2>
                    </MotionReveal>
                  ) : null}
                  <div className={cn("divide-y divide-border/80 border-y border-border/80", group ? "mt-6" : "")}>
                    {services.map((service, index) => {
                      const duration = formatPublicServiceDuration(service, locale);
                      const canBook = service.bookableOnline && service.allowedTherapistIds.length > 0;

                      return (
                        <MotionReveal key={service.slug} delay={(groupIndex + index) * 0.04}>
                          <article className="grid gap-7 py-8 transition-colors duration-300 hover:bg-card/46 sm:-mx-6 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start">
                            <div>
                              <h3 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                                {service.name}
                              </h3>
                              <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                                {service.shortDescription}
                              </p>
                              {service.description ? (
                                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                                  {service.description}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                              {duration ? (
                                <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                                  <Clock aria-hidden="true" className="size-4" />
                                  {duration}
                                </p>
                              ) : null}
                              <p className="text-lg font-semibold text-primary">{formatServicePrice(service.priceRsd)}</p>
                              {canBook ? (
                                <ServiceBookingButton
                                  label={dictionary.services.cardBookingCta}
                                  locale={locale}
                                  serviceSlug={service.slug}
                                />
                              ) : (
                                <span className="text-sm font-semibold text-muted-foreground">
                                  {dictionary.services.categoryComingSoon}
                                </span>
                              )}
                            </div>
                          </article>
                        </MotionReveal>
                      );
                    })}
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

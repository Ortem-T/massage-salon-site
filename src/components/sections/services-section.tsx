import { ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/sections/section-header";
import { ServiceBookingButton } from "@/components/sections/service-booking-button";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import {
  formatPublicServiceDuration,
  formatServicePrice,
  serviceCategories,
  type ServiceCategory,
  type ServiceCatalogItem
} from "@/lib/services/catalog";

type ServicesSectionProps = {
  dictionary: Dictionary;
  locale: Locale;
  serviceCatalog: ServiceCatalogItem[];
};

export function ServicesSection({ dictionary, locale, serviceCatalog }: ServicesSectionProps) {
  const { services } = dictionary;
  const popularServices = serviceCatalog
    .filter((service) => service.active && service.bookableOnline && service.allowedTherapistIds.length > 0)
    .slice(0, 6);

  function getCategoryServices(category: ServiceCategory) {
    return serviceCatalog.filter((service) => service.category === category && service.active);
  }

  function getCategoryPrice(category: ServiceCategory) {
    if (category === "massage") {
      return `${services.from} ${formatServicePrice(3500)}`;
    }

    const prices = getCategoryServices(category)
      .map((service) => service.priceRsd)
      .filter((price): price is number => typeof price === "number");

    if (prices.length === 0) {
      return "";
    }

    return `${services.from} ${formatServicePrice(Math.min(...prices))}`;
  }

  return (
    <section id="services" className="scroll-mt-28 py-24 sm:py-32">
      <div className="container-shell">
        <MotionReveal>
          <SectionHeader eyebrow={services.eyebrow} title={services.title} subtitle={services.subtitle} />
        </MotionReveal>
        {serviceCatalog.length > 0 ? (
          <>
            <div className="mt-14 grid gap-4 md:grid-cols-2">
              {serviceCategories.map((category) => {
                const categoryServices = serviceCatalog.filter((service) => service.category === category);
                const price = getCategoryPrice(category);

                return (
                  <MotionReveal key={category} className="h-full">
                    <Link
                      href={`/${locale}/services/${category}`}
                      className="group flex h-full min-h-[18.5rem] flex-col rounded-3xl border border-border/70 bg-card/74 p-7 shadow-[0_22px_70px_rgb(27_54_39/0.08)] transition duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-background/86 hover:shadow-[0_28px_90px_rgb(27_54_39/0.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 sm:min-h-[19.5rem] sm:p-8 lg:min-h-[20.5rem]"
                    >
                      <span className="flex items-start justify-between gap-5">
                        <span>
                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                            {String(categoryServices.length).padStart(2, "0")}
                          </span>
                          <span className="mt-5 block font-serif text-4xl leading-[0.95] text-primary sm:text-5xl">
                            {services.categories[category]}
                          </span>
                        </span>
                        <span className="grid size-11 place-items-center rounded-full border border-border bg-background text-primary transition duration-300 group-hover:border-accent/40 group-hover:text-accent">
                          <ArrowUpRight aria-hidden="true" className="size-4" />
                        </span>
                      </span>
                      <span className="mt-7 flex flex-1 flex-col">
                        <span className="block max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                          {services.categoryCards[category]}
                        </span>
                        <span className="mt-auto flex items-center justify-between gap-4 pt-6 text-sm font-semibold text-primary">
                          <span>{price || services.categoryComingSoon}</span>
                          <span className="text-accent">{services.viewCategory}</span>
                        </span>
                      </span>
                    </Link>
                  </MotionReveal>
                );
              })}
            </div>

            {popularServices.length > 0 ? (
              <div className="mt-18">
                <MotionReveal>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
                        {services.popularEyebrow}
                      </p>
                      <h3 className="mt-4 font-serif text-4xl leading-[0.95] text-primary sm:text-5xl">
                        {services.popularTitle}
                      </h3>
                    </div>
                    <Button asChild variant="outline">
                      <Link href={`/${locale}#booking`}>{services.bookingCta}</Link>
                    </Button>
                  </div>
                </MotionReveal>
                <div className="mt-8 divide-y divide-border/80 border-y border-border/80">
                  {popularServices.map((service, index) => {
                    const duration = formatPublicServiceDuration(service, locale);

                    return (
                      <MotionReveal key={service.slug} delay={index * 0.04}>
                        <article className="grid gap-6 py-7 transition-colors duration-300 hover:bg-card/46 sm:-mx-5 sm:px-5 lg:grid-cols-[1fr_auto] lg:items-center">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                              {services.categories[service.category]}
                            </p>
                            <h4 className="mt-3 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                              {service.name}
                            </h4>
                            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                              {service.shortDescription}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 lg:justify-end">
                            {duration ? (
                              <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                                <Clock aria-hidden="true" className="size-4" />
                                {duration}
                              </p>
                            ) : null}
                            <p className="text-lg font-semibold text-primary">{formatServicePrice(service.priceRsd)}</p>
                            <ServiceBookingButton
                              label={services.cardBookingCta}
                              locale={locale}
                              serviceSlug={service.slug}
                            />
                          </div>
                        </article>
                      </MotionReveal>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <MotionReveal>
            <p className="mt-14 rounded-xl border border-border/70 bg-card/70 p-6 text-sm leading-7 text-muted-foreground">
              {services.empty}
            </p>
          </MotionReveal>
        )}
      </div>
    </section>
  );
}

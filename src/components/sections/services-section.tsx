import { Clock } from "lucide-react";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import {
  formatServiceDuration,
  formatServicePrice,
  serviceCategories,
  type ServiceCatalogItem
} from "@/lib/services/catalog";

type ServicesSectionProps = {
  dictionary: Dictionary;
  locale: Locale;
  serviceCatalog: ServiceCatalogItem[];
};

export function ServicesSection({ dictionary, locale, serviceCatalog }: ServicesSectionProps) {
  const { services } = dictionary;

  return (
    <section id="services" className="scroll-mt-28 py-24 sm:py-32">
      <div className="container-shell">
        <MotionReveal>
          <SectionHeader eyebrow={services.eyebrow} title={services.title} subtitle={services.subtitle} />
        </MotionReveal>
        {serviceCatalog.length > 0 ? (
          <div className="mt-14 space-y-16">
            {serviceCategories.map((category) => {
              const categoryServices = serviceCatalog.filter((service) => service.category === category);

              if (categoryServices.length === 0) {
                return null;
              }

              return (
                <div key={category}>
                  <MotionReveal>
                    <h3 className="font-serif text-3xl leading-tight text-primary sm:text-4xl">
                      {services.categories[category]}
                    </h3>
                  </MotionReveal>
                  <div className="mt-6 divide-y divide-border/80 border-y border-border/80">
                    {categoryServices.map((service, index) => (
                      <MotionReveal key={service.slug} delay={index * 0.06}>
                        <article className="grid gap-6 py-8 transition-colors duration-300 hover:bg-card/46 sm:-mx-6 sm:px-6 sm:py-9 lg:grid-cols-[1fr_1.45fr_auto] lg:items-start lg:gap-10">
                          <div>
                            <p className="text-sm font-semibold text-accent">{String(index + 1).padStart(2, "0")}</p>
                            <h4 className="mt-4 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                              {service.name}
                            </h4>
                          </div>
                          <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                            {service.shortDescription}
                          </p>
                          <div className="flex items-center justify-between gap-6 lg:min-w-40 lg:flex-col lg:items-end">
                            <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                              <Clock aria-hidden="true" className="size-4" />
                              {formatServiceDuration(service.durationMinutes, services.durationUnit)}
                            </p>
                            <p className="text-right text-lg font-semibold text-primary">
                              {formatServicePrice(service.priceRsd, locale)}
                            </p>
                          </div>
                        </article>
                      </MotionReveal>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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

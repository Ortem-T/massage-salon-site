import { Clock } from "lucide-react";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { type Dictionary } from "@/i18n/dictionaries";

type ServicesSectionProps = {
  dictionary: Dictionary;
};

export function ServicesSection({ dictionary }: ServicesSectionProps) {
  const { services } = dictionary;

  return (
    <section id="services" className="scroll-mt-28 py-24 sm:py-32">
      <div className="container-shell">
        <MotionReveal>
          <SectionHeader eyebrow={services.eyebrow} title={services.title} subtitle={services.subtitle} />
        </MotionReveal>
        <div className="mt-14 divide-y divide-border/80 border-y border-border/80">
          {services.items.map((service, index) => (
            <MotionReveal key={service.title} delay={index * 0.08}>
              <article className="grid gap-6 py-8 transition-colors duration-300 hover:bg-[#fffaf0]/46 sm:py-9 lg:grid-cols-[1fr_1.45fr_auto] lg:items-start lg:gap-10">
                <div>
                  <p className="text-sm font-semibold text-accent">0{index + 1}</p>
                  <h3 className="mt-4 font-serif text-3xl leading-tight text-foreground sm:text-4xl">{service.title}</h3>
                </div>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground">{service.description}</p>
                <div className="flex items-center justify-between gap-6 lg:min-w-40 lg:flex-col lg:items-end">
                  <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                    <Clock aria-hidden="true" className="size-4" />
                    {service.duration}
                  </p>
                  <p className="text-right text-lg font-semibold text-primary">{service.price}</p>
                </div>
              </article>
            </MotionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

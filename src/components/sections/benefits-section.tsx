import { CheckCircle2 } from "lucide-react";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { type Dictionary } from "@/i18n/dictionaries";

type BenefitsSectionProps = {
  dictionary: Dictionary;
};

export function BenefitsSection({ dictionary }: BenefitsSectionProps) {
  const { benefits } = dictionary;

  return (
    <section id="benefits" className="scroll-mt-28 bg-[#fffaf0] py-24 sm:py-32">
      <div className="container-shell grid gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <MotionReveal>
          <SectionHeader eyebrow={benefits.eyebrow} title={benefits.title} />
        </MotionReveal>
        <div className="grid gap-4 sm:grid-cols-2 lg:gap-5">
          {benefits.items.map((benefit, index) => (
            <MotionReveal key={benefit} delay={index * 0.06}>
              <div className="flex min-h-36 gap-4 rounded-lg border border-border/80 bg-background/68 p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-card/72">
                <CheckCircle2 className="mt-1 size-5 shrink-0 text-accent" aria-hidden="true" />
                <p className="text-base leading-7 text-foreground">{benefit}</p>
              </div>
            </MotionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

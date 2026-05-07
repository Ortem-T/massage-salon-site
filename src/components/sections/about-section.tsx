import { Sparkles } from "lucide-react";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { type Dictionary } from "@/i18n/dictionaries";

type AboutSectionProps = {
  dictionary: Dictionary;
};

export function AboutSection({ dictionary }: AboutSectionProps) {
  const { about } = dictionary;

  return (
    <section id="about" className="scroll-mt-28 bg-[#e5dcc8] py-24 sm:py-32">
      <div className="container-shell grid gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
        <MotionReveal>
          <SectionHeader eyebrow={about.eyebrow} title={about.title} />
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <div className="rounded-lg border border-[#cfbd9c] bg-[#fffaf0]/76 p-7 shadow-[var(--shadow-soft)] backdrop-blur-md sm:p-9">
            <Sparkles className="size-6 text-accent" aria-hidden="true" />
            <p className="mt-7 text-lg leading-9 text-foreground">{about.body}</p>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              {about.stats.map((stat) => (
                <div key={stat.label} className="border-t border-accent/35 pt-5">
                  <p className="font-serif text-4xl text-primary">{stat.value}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

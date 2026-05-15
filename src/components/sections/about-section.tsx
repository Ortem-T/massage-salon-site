import { Sparkles } from "lucide-react";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { type Dictionary } from "@/i18n/dictionaries";

type AboutSectionProps = {
  dictionary: Dictionary;
};

export function AboutSection({ dictionary }: AboutSectionProps) {
  const { about } = dictionary;

  return (
    <section id="about" className="scroll-mt-28 bg-[#e5dcc8] py-20 sm:py-28">
      <div className="container-shell">
        <MotionReveal>
          <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-primary px-6 py-14 text-primary-foreground shadow-[0_34px_110px_rgb(20_61_42/0.28)] sm:px-10 sm:py-16 lg:px-16 lg:py-20">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgb(178_132_71/0.24),transparent_30rem)]"
              aria-hidden="true"
            />
            <div className="relative grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
              <div>
                <p className="text-xs font-bold uppercase text-[#d9b77e]">{about.eyebrow}</p>
                <h2 className="mt-5 max-w-2xl font-serif text-4xl leading-[1.04] text-[#fffaf0] sm:text-5xl lg:text-6xl">
                  {about.title}
                </h2>
              </div>
              <div className="rounded-lg border border-[#d9b77e]/24 bg-[#fffaf0]/8 p-7 backdrop-blur-md sm:p-9">
                <Sparkles className="size-6 text-[#d9b77e]" aria-hidden="true" />
                <p className="mt-7 whitespace-pre-line text-base leading-8 text-[#f4ead9] sm:text-lg sm:leading-9">
                  {about.body}
                </p>
              </div>
            </div>
            <div className="relative mt-12 grid gap-4 sm:grid-cols-3">
              {about.stats.map((stat) => (
                <div key={stat.label} className="rounded-lg border border-[#d9b77e]/24 bg-[#fffaf0]/8 p-5">
                  <p className="font-serif text-4xl text-[#fffaf0]">{stat.value}</p>
                  <p className="mt-2 text-sm leading-6 text-[#eadcc4]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

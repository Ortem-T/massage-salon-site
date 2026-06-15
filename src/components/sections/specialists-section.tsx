import Image from "next/image";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { type Dictionary } from "@/i18n/dictionaries";

const specialistImageSizes = "(min-width: 1024px) 520px, (min-width: 640px) 80vw, 100vw";
const atmosphereImageSizes = "(min-width: 1024px) 260px, (min-width: 640px) 42vw, 78vw";

type SpecialistsSectionProps = {
  dictionary: Dictionary;
};

export function SpecialistsSection({ dictionary }: SpecialistsSectionProps) {
  const { specialists } = dictionary;

  return (
    <section id="specialists" className="scroll-mt-28 bg-[#f8f3e9] py-24 sm:py-32">
      <div className="container-shell">
        <MotionReveal>
          <SectionHeader
            eyebrow={specialists.eyebrow}
            title={specialists.title}
            subtitle={specialists.description}
            align="center"
          />
        </MotionReveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {specialists.cards.map((specialist, index) => (
            <MotionReveal key={specialist.name} delay={index * 0.08}>
              <article className="group grid gap-6 rounded-xl border border-border/80 bg-card/72 p-4 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/45 hover:bg-card sm:grid-cols-[0.88fr_1fr] sm:gap-7 sm:p-6">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={specialist.image.src}
                    alt={specialist.image.alt}
                    fill
                    sizes={specialistImageSizes}
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
                  />
                </div>
                <div className="flex flex-col justify-center py-1">
                  <h3 className="font-serif text-3xl leading-tight text-foreground sm:text-4xl">{specialist.name}</h3>
                  <p className="mt-4 text-sm font-semibold leading-6 text-accent">{specialist.role}</p>
                  <p className="mt-5 text-base leading-8 text-muted-foreground">{specialist.description}</p>
                </div>
              </article>
            </MotionReveal>
          ))}
        </div>

        <MotionReveal>
          <div className="mt-20">
            <div className="max-w-2xl">
              <p className="eyebrow">{specialists.atmosphere.eyebrow}</p>
              <h3 className="mt-4 font-serif text-3xl leading-tight text-foreground sm:text-4xl">
                {specialists.atmosphere.title}
              </h3>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{specialists.atmosphere.description}</p>
            </div>

            <div
              className="focus-ring -mx-3 mt-8 snap-x snap-mandatory overflow-x-auto px-3 pb-3 [scrollbar-width:none] focus-visible:rounded-xl lg:mx-0 lg:overflow-visible lg:px-0 lg:pb-0 [&::-webkit-scrollbar]:hidden"
              tabIndex={0}
              aria-label={specialists.atmosphere.title}
            >
              <ul className="grid auto-cols-[78%] grid-flow-col gap-4 sm:auto-cols-[42%] lg:grid-flow-row lg:grid-cols-4">
                {specialists.atmosphere.images.map((image) => (
                  <li key={image.src} className="snap-start">
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-border/70 bg-muted shadow-sm">
                      <Image
                        src={image.src}
                        alt={image.alt}
                        fill
                        sizes={atmosphereImageSizes}
                        className="object-cover transition-transform duration-700 ease-out hover:scale-[1.025]"
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

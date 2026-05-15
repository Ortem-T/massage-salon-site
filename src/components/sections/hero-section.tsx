import Image from "next/image";
import Link from "next/link";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { Button } from "@/components/ui/button";
import { type Dictionary } from "@/i18n/dictionaries";
import { type Locale } from "@/i18n/config";

type HeroSectionProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function HeroSection({ locale, dictionary }: HeroSectionProps) {
  const { hero } = dictionary;

  return (
    <section className="relative isolate min-h-[88svh] overflow-hidden pt-20">
      <Image
        src="/images/spa-hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="absolute inset-0 -z-20 object-cover object-[62%_center] sm:object-center"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(10_31_22/0.82)_0%,rgb(20_61_42/0.5)_48%,rgb(244_239_228/0.04)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-background via-background/64 to-transparent" />

      <div className="container-shell flex min-h-[calc(88svh-5rem)] items-center py-20 sm:py-24">
        <MotionReveal className="max-w-[46rem] text-primary-foreground">
          <div className="flex items-center">
            <p className="text-xs font-bold uppercase text-[#d9b77e]">{hero.eyebrow}</p>
          </div>
          <h1 className="mt-7 max-w-4xl font-serif text-4xl leading-[1.03] text-[#fffaf0] sm:text-6xl md:text-7xl lg:text-[5.25rem]">
            {hero.title}
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-8 text-[#f4ead9] sm:text-lg">{hero.subtitle}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="accent" className="w-full sm:w-auto">
              <Link href={`/${locale}#booking`}>{hero.cta}</Link>
            </Button>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

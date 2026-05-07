import { MotionReveal } from "@/components/motion/motion-reveal";
import { BookingForm } from "@/components/sections/booking-form";
import { SectionHeader } from "@/components/sections/section-header";
import { type Dictionary } from "@/i18n/dictionaries";

type BookingSectionProps = {
  dictionary: Dictionary;
};

export function BookingSection({ dictionary }: BookingSectionProps) {
  const { booking } = dictionary;

  return (
    <section id="booking" className="relative isolate scroll-mt-28 overflow-hidden bg-card py-24 sm:py-32">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/35 to-transparent" />
      <div className="absolute -left-28 top-24 -z-10 size-80 rounded-full bg-secondary/55 blur-3xl" />
      <div className="absolute -right-24 bottom-10 -z-10 size-96 rounded-full bg-background/80 blur-3xl" />

      <div className="container-shell grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-18">
        <MotionReveal className="lg:sticky lg:top-28">
          <SectionHeader eyebrow={booking.eyebrow} title={booking.title} subtitle={booking.subtitle} />
          <div className="mt-10 rounded-xl border border-border/70 bg-background/72 p-6 shadow-[0_18px_54px_rgb(27_54_39/0.08)] backdrop-blur md:p-7">
            <div className="mb-5 h-px w-16 bg-accent/55" />
            <p className="font-serif text-3xl leading-[0.96] text-primary sm:text-4xl">{booking.aside.title}</p>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">{booking.aside.body}</p>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <BookingForm dictionary={dictionary} />
        </MotionReveal>
      </div>
    </section>
  );
}

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
    <section id="booking" className="scroll-mt-28 bg-card py-24 sm:py-32">
      <div className="container-shell grid gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <MotionReveal>
          <SectionHeader eyebrow={booking.eyebrow} title={booking.title} subtitle={booking.subtitle} />
          <div className="mt-10 rounded-lg border border-border/80 bg-background/66 p-6 shadow-sm">
            <p className="font-serif text-3xl leading-tight text-primary">{booking.aside.title}</p>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">{booking.aside.body}</p>
          </div>
        </MotionReveal>
        <MotionReveal delay={0.1}>
          <BookingForm dictionary={dictionary} />
        </MotionReveal>
      </div>
    </section>
  );
}

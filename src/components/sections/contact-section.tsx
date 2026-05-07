import { Instagram, MapPin, MessageCircle, Send } from "lucide-react";
import Link from "next/link";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { Button } from "@/components/ui/button";
import { type Dictionary } from "@/i18n/dictionaries";

type ContactSectionProps = {
  dictionary: Dictionary;
};

export function ContactSection({ dictionary }: ContactSectionProps) {
  const { contact } = dictionary;

  return (
    <section id="contact" className="scroll-mt-28 bg-[#fffaf0] py-24 sm:py-32">
      <div className="container-shell grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <MotionReveal>
          <SectionHeader eyebrow={contact.eyebrow} title={contact.title} subtitle={contact.subtitle} />
          <div className="mt-11 grid gap-5">
            <div className="rounded-lg border border-border bg-background/70 p-6 shadow-sm">
              <p className="text-sm font-semibold text-accent">{contact.addressLabel}</p>
              <p className="mt-2 flex items-center gap-2 text-lg text-foreground">
                <MapPin aria-hidden="true" className="size-5 text-primary" />
                {contact.address}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-background/70 p-6 shadow-sm">
              <p className="text-sm font-semibold text-accent">{contact.hoursLabel}</p>
              <p className="mt-2 text-lg text-foreground">{contact.hours}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="w-full sm:w-auto">
                <Link href="https://wa.me/381000000000" target="_blank" rel="noreferrer">
                  <MessageCircle aria-hidden="true" />
                  {contact.actions.whatsapp}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="https://t.me/raine_spa" target="_blank" rel="noreferrer">
                  <Send aria-hidden="true" />
                  {contact.actions.telegram}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="https://instagram.com/raine.spa" target="_blank" rel="noreferrer">
                  <Instagram aria-hidden="true" />
                  {contact.actions.instagram}
                </Link>
              </Button>
            </div>
          </div>
        </MotionReveal>

        <MotionReveal delay={0.1}>
          <div
            className="relative min-h-[360px] overflow-hidden rounded-xl border border-border bg-[#e2d5bf] shadow-[var(--shadow-soft)] sm:min-h-[460px]"
            aria-label={contact.mapLabel}
          >
            <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(#c8b79f_1px,transparent_1px),linear-gradient(90deg,#c8b79f_1px,transparent_1px)] [background-size:42px_42px]" />
            <div className="absolute inset-8 rounded-lg border border-white/55 bg-[#f2eddf]/58 backdrop-blur-sm" />
            <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_18px_48px_rgb(20_61_42/0.24)]">
                <MapPin aria-hidden="true" />
              </div>
              <p className="mt-5 font-serif text-3xl text-foreground">{contact.mapLabel}</p>
              <p className="mt-2 text-sm text-muted-foreground">{contact.address}</p>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

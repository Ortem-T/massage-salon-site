import { Clock3, ExternalLink, Instagram, Landmark, MapPin, MessageCircle, Send } from "lucide-react";
import Link from "next/link";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { Button } from "@/components/ui/button";
import { contactConfig } from "@/config/contacts";
import { type Dictionary } from "@/i18n/dictionaries";

type ContactSectionProps = {
  dictionary: Dictionary;
};

export function ContactSection({ dictionary }: ContactSectionProps) {
  const { contact } = dictionary;
  const workingHours = `${contact.everyDay}: ${contactConfig.workingHours.start}-${contactConfig.workingHours.end}`;
  const contactActions = [
    {
      href: contactConfig.whatsappUrl,
      icon: MessageCircle,
      label: contact.actions.whatsapp,
      ariaLabel: contact.aria.whatsapp,
      variant: "default" as const
    },
    {
      href: contactConfig.telegramUrl,
      icon: Send,
      label: contact.actions.telegram,
      ariaLabel: contact.aria.telegram,
      variant: "outline" as const
    },
    {
      href: contactConfig.instagramUrl,
      icon: Instagram,
      label: contact.actions.instagram,
      ariaLabel: contact.aria.instagram,
      variant: "outline" as const
    }
  ];

  return (
    <section id="contact" className="scroll-mt-28 bg-[#fffaf0] py-24 sm:py-32">
      <div className="container-shell grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
        <MotionReveal>
          <SectionHeader eyebrow={contact.eyebrow} title={contact.title} subtitle={contact.subtitle} />

          <div className="mt-10 rounded-xl border border-border/80 bg-background/70 p-5 shadow-soft sm:p-6">
            <div className="grid gap-4">
              <div className="rounded-lg border border-border/80 bg-card/72 p-4">
                <p className="text-sm font-semibold text-accent">{contact.addressLabel}</p>
                <p className="mt-2 flex items-start gap-2 text-base leading-7 text-foreground">
                  <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
                  <span>{contactConfig.address}</span>
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-border/80 bg-card/72 p-4">
                  <p className="text-sm font-semibold text-accent">{contact.landmarkLabel}</p>
                  <p className="mt-2 flex items-center gap-2 text-base text-foreground">
                    <Landmark aria-hidden="true" className="size-5 text-primary" />
                    {contactConfig.landmark}
                  </p>
                </div>

                <div className="rounded-lg border border-border/80 bg-card/72 p-4">
                  <p className="text-sm font-semibold text-accent">{contact.hoursLabel}</p>
                  <p className="mt-2 flex items-center gap-2 text-base text-foreground">
                    <Clock3 aria-hidden="true" className="size-5 text-primary" />
                    {workingHours}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {contactActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Button key={action.href} asChild variant={action.variant} className="w-full sm:w-auto">
                    <Link href={action.href} target="_blank" rel="noopener noreferrer" aria-label={action.ariaLabel}>
                      <Icon aria-hidden="true" />
                      {action.label}
                    </Link>
                  </Button>
                );
              })}
            </div>
          </div>
        </MotionReveal>

        <MotionReveal delay={0.1} className="h-full">
          <div
            className="relative h-full min-h-[380px] overflow-hidden rounded-xl border border-border bg-[#e2d5bf] shadow-[var(--shadow-soft)] sm:min-h-[440px] lg:min-h-0"
            aria-label={contact.mapTitle}
          >
            <iframe
              src={contactConfig.googleMapsEmbedSrc}
              title={contact.mapTitle}
              className="absolute inset-0 size-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />

            <div className="absolute inset-x-4 bottom-4 rounded-lg border border-white/65 bg-card/88 p-4 shadow-[0_18px_58px_rgb(27_54_39/0.18)] backdrop-blur sm:inset-x-6 sm:bottom-6 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm leading-6 text-muted-foreground">{contactConfig.address}</p>
                </div>

                <Button asChild variant="outline" className="w-full sm:w-auto">
                  <Link href={contactConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer" aria-label={contact.aria.googleMaps}>
                    <ExternalLink aria-hidden="true" />
                    {contact.openInGoogleMaps}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

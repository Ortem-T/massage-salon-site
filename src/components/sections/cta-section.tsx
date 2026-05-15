import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { Button } from "@/components/ui/button";
import { contactConfig } from "@/config/contacts";

type CTASectionProps = {
  content: {
    title: string;
    subtitle: string;
    button: string;
  };
};

export function CTASection({ content }: CTASectionProps) {
  return (
    <section className="py-24 sm:py-32">
      <div className="container-shell">
        <MotionReveal>
          <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-primary px-6 py-16 text-primary-foreground shadow-[0_34px_110px_rgb(20_61_42/0.28)] sm:px-10 lg:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(178_132_71/0.24),transparent_32rem)]" />
            <div className="relative mx-auto max-w-3xl text-center">
              <h2 className="font-serif text-4xl leading-[1.02] sm:text-5xl lg:text-6xl">{content.title}</h2>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-[#eadcc4] sm:text-lg">{content.subtitle}</p>
              <Button asChild size="lg" variant="accent" className="mt-9">
                <Link href={contactConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">
                  {content.button}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

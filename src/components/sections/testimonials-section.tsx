import { Star } from "lucide-react";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { type Dictionary } from "@/i18n/dictionaries";

type TestimonialsSectionProps = {
  dictionary: Dictionary;
};

export function TestimonialsSection({ dictionary }: TestimonialsSectionProps) {
  const { testimonials } = dictionary;

  return (
    <section className="py-24 sm:py-32">
      <div className="container-shell">
        <MotionReveal>
          <SectionHeader eyebrow={testimonials.eyebrow} title={testimonials.title} align="center" />
        </MotionReveal>
        <div className="mt-14 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {testimonials.items.map((testimonial, index) => (
            <MotionReveal key={testimonial.author} delay={index * 0.08}>
              <Card className="h-full transition-all duration-500 hover:-translate-y-1 hover:border-accent/45 hover:bg-card">
                <CardContent className="flex h-full min-h-[300px] flex-col p-7 sm:p-8">
                  <div className="flex gap-1 text-accent" aria-hidden="true">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="size-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-8 text-base leading-8 text-foreground">“{testimonial.quote}”</blockquote>
                  <div className="mt-auto pt-8">
                    <p className="font-semibold text-primary">{testimonial.author}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{testimonial.detail}</p>
                  </div>
                </CardContent>
              </Card>
            </MotionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

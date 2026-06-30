import { Star } from "lucide-react";

import { MotionReveal } from "@/components/motion/motion-reveal";
import { SectionHeader } from "@/components/sections/section-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { contactConfig } from "@/config/contacts";
import { type Review } from "@/config/reviews";
import { type Dictionary } from "@/i18n/dictionaries";

type TestimonialsSectionProps = {
  dictionary: Dictionary;
  reviews: readonly Review[];
};

export function TestimonialsSection({ dictionary, reviews }: TestimonialsSectionProps) {
  const { testimonials } = dictionary;

  return (
    <section id="reviews" className="scroll-mt-28 bg-[#fffaf0] py-24 sm:py-32">
      <div className="container-shell">
        <MotionReveal>
          <SectionHeader
            eyebrow={testimonials.eyebrow}
            title={testimonials.title}
            subtitle={testimonials.description}
            align="center"
          />
        </MotionReveal>
        <div className="mt-14 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {reviews.map((review, index) => (
            <MotionReveal key={review.id} delay={index * 0.08} className="h-full">
              <Card className="h-full transition-all duration-500 hover:-translate-y-1 hover:border-accent/45 hover:bg-card">
                <CardContent className="flex h-full flex-col p-7 sm:p-8">
                  <div className="flex gap-1 text-accent" aria-label={testimonials.ratingLabel}>
                    {Array.from({ length: review.rating }).map((_, starIndex) => (
                      <Star key={starIndex} aria-hidden="true" className="size-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-8 whitespace-pre-line text-base leading-8 text-foreground">
                    “{review.text}”
                  </blockquote>
                  <div className="mt-auto pt-8">
                    <p className="font-semibold text-primary">{review.author}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{testimonials.sourceLabel}</p>
                  </div>
                </CardContent>
              </Card>
            </MotionReveal>
          ))}
        </div>
        <MotionReveal>
          <div className="mt-10 flex justify-center">
            <Button asChild variant="outline">
              <a href={contactConfig.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                {testimonials.googleCta}
              </a>
            </Button>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}

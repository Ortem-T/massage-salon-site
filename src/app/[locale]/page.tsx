import { AboutSection } from "@/components/sections/about-section";
import { BenefitsSection } from "@/components/sections/benefits-section";
import { ContactSection } from "@/components/sections/contact-section";
import { CTASection } from "@/components/sections/cta-section";
import { HeroSection } from "@/components/sections/hero-section";
import { ServicesSection } from "@/components/sections/services-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "sr";
  const dictionary = await getDictionary(locale);

  return (
    <main>
      <HeroSection locale={locale} dictionary={dictionary} />
      <ServicesSection dictionary={dictionary} />
      <BenefitsSection dictionary={dictionary} />
      <TestimonialsSection dictionary={dictionary} />
      <AboutSection dictionary={dictionary} />
      <CTASection dictionary={dictionary} />
      <ContactSection dictionary={dictionary} />
    </main>
  );
}

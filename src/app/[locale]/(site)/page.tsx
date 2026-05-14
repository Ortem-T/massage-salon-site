import { AboutSection } from "@/components/sections/about-section";
import { BenefitsSection } from "@/components/sections/benefits-section";
import { BookingSection } from "@/components/sections/booking-section";
import { ContactSection } from "@/components/sections/contact-section";
import { CTASection } from "@/components/sections/cta-section";
import { HeroSection } from "@/components/sections/hero-section";
import { ServicesSection } from "@/components/sections/services-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getServiceCatalog } from "@/lib/services/catalog";
import { getTherapistCatalog } from "@/lib/therapists/catalog";

type HomePageProps = {
  params: Promise<{ locale: string }>;
};

export const revalidate = 300;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "sr";
  const [dictionary, serviceCatalog, therapistCatalog] = await Promise.all([
    getDictionary(locale),
    getServiceCatalog(locale, { bookableOnlineOnly: true }),
    getTherapistCatalog(locale)
  ]);

  return (
    <main>
      <HeroSection locale={locale} dictionary={dictionary} />
      <ServicesSection locale={locale} dictionary={dictionary} serviceCatalog={serviceCatalog} />
      <BenefitsSection dictionary={dictionary} />
      <BookingSection
        locale={locale}
        dictionary={dictionary}
        serviceCatalog={serviceCatalog}
        therapistCatalog={therapistCatalog}
      />
      <TestimonialsSection dictionary={dictionary} />
      <AboutSection dictionary={dictionary} />
      <CTASection dictionary={dictionary} />
      <ContactSection dictionary={dictionary} />
    </main>
  );
}

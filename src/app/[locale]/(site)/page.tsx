import { AboutSection } from "@/components/sections/about-section";
import { BenefitsSection } from "@/components/sections/benefits-section";
import { BookingSection } from "@/components/sections/booking-section";
import { ContactSection } from "@/components/sections/contact-section";
import { HeroSection } from "@/components/sections/hero-section";
import { ServicesSection } from "@/components/sections/services-section";
import { SpecialistsSection } from "@/components/sections/specialists-section";
import { TestimonialsSection } from "@/components/sections/testimonials-section";
import { homepageFeatures } from "@/config/homepage";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getActivePromotionForPlacement } from "@/lib/promotions/public";
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
  const [dictionary, serviceCatalog, therapistCatalog, bookingSectionPromotion] = await Promise.all([
    getDictionary(locale),
    getServiceCatalog(locale, { bookableOnlineOnly: true }),
    getTherapistCatalog(locale),
    getActivePromotionForPlacement(locale, "booking_section_card")
  ]);

  return (
    <main>
      <HeroSection locale={locale} dictionary={dictionary} />
      <ServicesSection locale={locale} dictionary={dictionary} serviceCatalog={serviceCatalog} />
      <SpecialistsSection dictionary={dictionary} />
      <BenefitsSection dictionary={dictionary} />
      <BookingSection
        locale={locale}
        dictionary={dictionary}
        promotion={bookingSectionPromotion}
        serviceCatalog={serviceCatalog}
        therapistCatalog={therapistCatalog}
      />
      {homepageFeatures.showTestimonials && dictionary.testimonials.items.length > 0 ? (
        <TestimonialsSection dictionary={dictionary} />
      ) : null}
      <AboutSection dictionary={dictionary} />
      <ContactSection dictionary={dictionary} />
    </main>
  );
}

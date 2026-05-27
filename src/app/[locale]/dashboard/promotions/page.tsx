import { notFound } from "next/navigation";

import { PromotionsManager } from "@/components/dashboard/promotions-manager";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import { getPromotionsForDashboard } from "@/lib/dashboard/promotions";

type DashboardPromotionsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPromotionsPage({ params }: DashboardPromotionsPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardUser(locale);
  const dictionary = await getDictionary(locale);

  if (user.role !== "admin") {
    return (
      <section className="rounded-3xl border border-border/70 bg-card/82 p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          {dictionary.dashboard.promotions.eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight text-primary">
          {dictionary.dashboard.promotions.title}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          {dictionary.dashboard.promotions.forbidden}
        </p>
      </section>
    );
  }

  const data = await getPromotionsForDashboard(user);

  return (
    <PromotionsManager
      dataError={data.error}
      dictionary={dictionary}
      locale={locale}
      promotions={data.promotions}
    />
  );
}

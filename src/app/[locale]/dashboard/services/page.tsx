import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardRole } from "@/lib/dashboard/auth";

type DashboardServicesPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardServicesPage({ params }: DashboardServicesPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  await requireDashboardRole(locale, ["admin"]);

  const dictionary = await getDictionary(locale);
  const page = dictionary.dashboard.pages.services;

  return <DashboardPlaceholder eyebrow={page.eyebrow} title={page.title} body={page.body} />;
}

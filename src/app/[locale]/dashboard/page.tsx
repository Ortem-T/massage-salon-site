import { notFound } from "next/navigation";

import { DashboardPlaceholder } from "@/components/dashboard/dashboard-placeholder";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const dictionary = await getDictionary(locale);
  const page = dictionary.dashboard.pages.overview;

  return <DashboardPlaceholder eyebrow={page.eyebrow} title={page.title} body={page.body} />;
}

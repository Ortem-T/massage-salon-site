import { notFound } from "next/navigation";

import { TherapistsManager } from "@/components/dashboard/therapists-manager";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardRole } from "@/lib/dashboard/auth";
import { getSredimeTherapistCalendars } from "@/lib/integrations/sredime/calendar";

type DashboardTherapistsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardTherapistsPage({ params }: DashboardTherapistsPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardRole(locale, ["admin"]);

  const dictionary = await getDictionary(locale);
  const data = await getSredimeTherapistCalendars(user);

  return (
    <TherapistsManager
      calendars={data.calendars}
      dataError={data.error}
      dictionary={dictionary}
      locale={locale}
    />
  );
}

import { notFound } from "next/navigation";

import { ScheduleBlocksManager } from "@/components/dashboard/schedule-blocks-manager";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import { getScheduleBlocksForDashboard } from "@/lib/dashboard/schedule-blocks";

type DashboardSchedulePageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardSchedulePage({ params }: DashboardSchedulePageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardUser(locale);
  const [dictionary, data] = await Promise.all([
    getDictionary(locale),
    getScheduleBlocksForDashboard(user)
  ]);

  return (
    <ScheduleBlocksManager
      blocks={data.blocks}
      dataError={data.error}
      dictionary={dictionary}
      locale={locale}
      role={user.role}
      therapists={data.therapists}
    />
  );
}

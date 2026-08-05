import { notFound, redirect } from "next/navigation";

import { ManagementControlCenter } from "@/components/dashboard/management-control-center";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import {
  getDashboardOperationSettings,
  getDashboardTelegramSettings
} from "@/lib/dashboard/settings";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

async function getScheduleBlockSummaryCount() {
  const supabase = await createSupabaseServerClient();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Belgrade",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const { count, error } = await supabase
    .from("schedule_blocks")
    .select("id", { count: "exact", head: true })
    .gte("date", today);

  return error ? 0 : count ?? 0;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardUser(locale);

  if (user.role !== "admin") {
    redirect(`/${locale}/dashboard/bookings`);
  }

  const [dictionary, operationSettings, telegramSettings, scheduleBlockCount] = await Promise.all([
    getDictionary(locale),
    getDashboardOperationSettings(),
    getDashboardTelegramSettings(user),
    getScheduleBlockSummaryCount()
  ]);

  return (
    <ManagementControlCenter
      dictionary={dictionary}
      locale={locale}
      operationSettings={operationSettings}
      scheduleBlockCount={scheduleBlockCount}
      telegramSettings={telegramSettings}
    />
  );
}

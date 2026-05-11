import { notFound } from "next/navigation";

import { BookingsCalendar } from "@/components/dashboard/bookings-calendar";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import { getDashboardBookingsData } from "@/lib/dashboard/bookings";

type DashboardBookingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardBookingsPage({ params }: DashboardBookingsPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardUser(locale);
  const [dictionary, data] = await Promise.all([getDictionary(locale), getDashboardBookingsData()]);

  return (
    <BookingsCalendar
      bookings={data.bookings}
      dataError={data.error}
      dictionary={dictionary}
      locale={locale}
      role={user.role}
      therapists={data.therapists}
    />
  );
}

import { notFound } from "next/navigation";

import { BookingsCalendar } from "@/components/dashboard/bookings-calendar";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import { getBookingsForDashboard } from "@/lib/dashboard/bookings";
import { getServiceCatalog } from "@/lib/services/catalog";

type DashboardBookingsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

function getDateSearchParam(searchParams: { date?: string | string[] }) {
  return Array.isArray(searchParams.date) ? searchParams.date[0] : searchParams.date;
}

export default async function DashboardBookingsPage({ params, searchParams }: DashboardBookingsPageProps) {
  const { locale: rawLocale } = await params;
  const initialDate = getDateSearchParam(await searchParams);

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardUser(locale);
  const [dictionary, data, serviceCatalog] = await Promise.all([
    getDictionary(locale),
    getBookingsForDashboard(user),
    getServiceCatalog(locale, { bookableOnlineOnly: false })
  ]);

  return (
    <BookingsCalendar
      bookings={data.bookings}
      dataError={data.error}
      dictionary={dictionary}
      initialDate={initialDate}
      locale={locale}
      role={user.role}
      serviceCatalog={serviceCatalog}
      therapists={data.therapists}
    />
  );
}

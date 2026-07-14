import { notFound } from "next/navigation";

import { BookingsCalendar } from "@/components/dashboard/bookings-calendar";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardUser } from "@/lib/dashboard/auth";
import { getBookingsForDashboard } from "@/lib/dashboard/bookings";
import { getDashboardServiceCatalogData } from "@/lib/services/dashboard-catalog";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
};

function getDateSearchParam(searchParams: { date?: string | string[] }) {
  return Array.isArray(searchParams.date) ? searchParams.date[0] : searchParams.date;
}

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { locale: rawLocale } = await params;
  const initialDate = getDateSearchParam(await searchParams);

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardUser(locale);
  const [dictionary, data, serviceCatalogData, ...localizedServiceCatalogs] = await Promise.all([
    getDictionary(locale),
    getBookingsForDashboard(user),
    getDashboardServiceCatalogData(locale, { activeOnly: false, bookableOnlineOnly: false }),
    ...locales.map((messageLocale) =>
      getDashboardServiceCatalogData(messageLocale, { activeOnly: false, bookableOnlineOnly: false })
    )
  ]);
  const localizedServiceNames = Object.fromEntries(
    locales.map((messageLocale, index) => [
      messageLocale,
      Object.fromEntries(localizedServiceCatalogs[index].services.map((service) => [service.slug, service.name]))
    ])
  ) as Record<Locale, Record<string, string>>;

  return (
    <BookingsCalendar
      bookings={data.bookings}
      clients={data.clients}
      dataError={data.error}
      dictionary={dictionary}
      initialDate={initialDate}
      locale={locale}
      role={user.role}
      scheduleBlocks={data.scheduleBlocks}
      serviceCatalog={serviceCatalogData.services}
      serviceCatalogError={serviceCatalogData.error}
      localizedServiceNames={localizedServiceNames}
      therapists={data.therapists}
    />
  );
}

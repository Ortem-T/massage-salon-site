import { notFound } from "next/navigation";

import { ClientsManager } from "@/components/dashboard/clients-manager";
import { isLocale, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardRole } from "@/lib/dashboard/auth";
import { getClientsForDashboard } from "@/lib/dashboard/clients";
import { getDashboardServiceCatalogData } from "@/lib/services/dashboard-catalog";

type DashboardClientsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DashboardClientsPage({ params }: DashboardClientsPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  const user = await requireDashboardRole(locale, ["admin"]);
  const [dictionary, data, serviceCatalogData, ...localizedServiceCatalogs] = await Promise.all([
    getDictionary(locale),
    getClientsForDashboard(user),
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
    <ClientsManager
      clients={data.clients}
      dataError={data.error}
      dictionary={dictionary}
      locale={locale}
      serviceCatalog={serviceCatalogData.services}
      localizedServiceNames={localizedServiceNames}
    />
  );
}

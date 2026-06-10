import { notFound } from "next/navigation";

import { ClientsManager } from "@/components/dashboard/clients-manager";
import { isLocale, type Locale } from "@/i18n/config";
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
  const [dictionary, data, serviceCatalogData] = await Promise.all([
    getDictionary(locale),
    getClientsForDashboard(user),
    getDashboardServiceCatalogData(locale, { activeOnly: false, bookableOnlineOnly: false })
  ]);

  return (
    <ClientsManager
      clients={data.clients}
      dataError={data.error}
      dictionary={dictionary}
      locale={locale}
      serviceCatalog={serviceCatalogData.services}
    />
  );
}

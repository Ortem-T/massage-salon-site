"use client";

import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { type DashboardClient } from "@/lib/dashboard/clients";
import { type ServiceCatalogItem } from "@/lib/services/catalog";
import { NotificationGenerator } from "@/components/dashboard/notification-generator";

type ClientNotificationsPanelProps = {
  client: DashboardClient;
  dictionary: Dictionary;
  locale: Locale;
  serviceCatalog: ServiceCatalogItem[];
  localizedServiceNames: Record<Locale, Record<string, string>>;
};

export function ClientNotificationsPanel({
  client,
  dictionary,
  locale,
  serviceCatalog,
  localizedServiceNames
}: ClientNotificationsPanelProps) {
  return (
    <NotificationGenerator
      mode="client"
      clientId={client.id}
      clientName={client.name}
      clientLocale={client.locale}
      dictionary={dictionary}
      locale={locale}
      serviceCatalog={serviceCatalog}
      localizedServiceNames={localizedServiceNames}
      bookings={client.bookings}
      rebookingToken={client.rebookingToken}
    />
  );
}

import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { type DashboardRole } from "@/lib/dashboard/auth";

export type DashboardNavItem = {
  href: string;
  label: string;
  adminOnly?: boolean;
};

export function getDashboardNavigation(
  locale: Locale,
  dictionary: Dictionary,
  role: DashboardRole
): DashboardNavItem[] {
  const labels = dictionary.dashboard.navigation;
  const items: DashboardNavItem[] = [
    { href: `/${locale}/dashboard`, label: labels.overview },
    { href: `/${locale}/dashboard/bookings`, label: labels.bookings },
    { href: `/${locale}/dashboard/schedule`, label: labels.schedule },
    { href: `/${locale}/dashboard/promotions`, label: labels.promotions, adminOnly: true },
    { href: `/${locale}/dashboard/clients`, label: labels.clients, adminOnly: true },
    { href: `/${locale}/dashboard/services`, label: labels.services, adminOnly: true },
    { href: `/${locale}/dashboard/therapists`, label: labels.therapists, adminOnly: true }
  ];

  if (role === "admin") {
    return items;
  }

  return items.filter((item) => !item.adminOnly);
}

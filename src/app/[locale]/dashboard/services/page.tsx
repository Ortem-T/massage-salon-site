import { notFound } from "next/navigation";

import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { requireDashboardRole } from "@/lib/dashboard/auth";
import { formatServiceDuration, formatServicePrice, serviceCategories } from "@/lib/services/catalog";
import { getDashboardServiceCatalogData } from "@/lib/services/dashboard-catalog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type DashboardServicesPageProps = {
  params: Promise<{ locale: string }>;
};

type TherapistRow = {
  id: string;
  display_name: string;
};

export default async function DashboardServicesPage({ params }: DashboardServicesPageProps) {
  const { locale: rawLocale } = await params;

  if (!isLocale(rawLocale)) {
    notFound();
  }

  const locale: Locale = rawLocale;
  await requireDashboardRole(locale, ["admin"]);

  const [dictionary, serviceResult] = await Promise.all([
    getDictionary(locale),
    getDashboardServiceCatalogData(locale, { activeOnly: false, bookableOnlineOnly: false })
  ]);
  const supabase = await createSupabaseServerClient();
  const { data: therapistRows } = await supabase
    .from("therapists")
    .select("id, display_name")
    .order("display_name", { ascending: true });
  const therapistNames = new Map((therapistRows as TherapistRow[] | null ?? []).map((therapist) => [therapist.id, therapist.display_name]));
  const page = dictionary.dashboard.pages.services;
  const copy = dictionary.dashboard.servicesCatalog;

  return (
    <section className="space-y-8">
      <div className="rounded-3xl border border-border/70 bg-card/78 p-6 shadow-soft sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{page.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-tight text-primary sm:text-5xl">
          {page.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{page.body}</p>
      </div>

      {serviceResult.error ? (
        <p className="rounded-2xl border border-accent/20 bg-accent/10 p-5 text-sm leading-7 text-accent">
          {copy.loadError}
        </p>
      ) : (
        serviceCategories.map((category) => {
          const services = serviceResult.services.filter((service) => service.category === category);

          if (services.length === 0) {
            return null;
          }

          return (
            <div key={category} className="rounded-3xl border border-border/70 bg-card/72 p-5 shadow-soft sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{copy.category}</p>
                  <h2 className="mt-2 font-serif text-3xl leading-tight text-primary sm:text-4xl">
                    {dictionary.services.categories[category]}
                  </h2>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">
                  {services.length} {copy.servicesCount}
                </p>
              </div>

              <div className="mt-6 divide-y divide-border/70 border-y border-border/70">
                {services.map((service) => {
                  const assignedTherapists = service.allowedTherapistIds
                    .map((therapistId) => therapistNames.get(therapistId))
                    .filter((name): name is string => Boolean(name));

                  return (
                    <article key={service.slug} className="grid gap-5 py-5 lg:grid-cols-[1fr_auto] lg:items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-primary">{service.name}</h3>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                          {service.shortDescription || service.slug}
                        </p>
                        <p className="mt-3 text-xs leading-5 text-muted-foreground">
                          <span className="font-semibold text-primary">{copy.slug}: </span>
                          {service.slug}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:max-w-md lg:justify-end">
                        {[
                          formatServicePrice(service.priceRsd),
                          formatServiceDuration(service.durationMinutes, locale),
                          service.active ? copy.active : copy.inactive,
                          service.bookableOnline ? copy.online : copy.hiddenOnline,
                          service.showDurationPublicly ? copy.durationVisible : copy.durationHidden
                        ]
                          .filter(Boolean)
                          .map((label) => (
                            <span
                              key={label}
                              className={cn(
                                "rounded-full border px-3 py-1 text-xs font-semibold",
                                label === copy.inactive || label === copy.hiddenOnline || label === copy.durationHidden
                                  ? "border-accent/25 bg-accent/10 text-accent"
                                  : "border-border bg-background text-primary"
                              )}
                            >
                              {label}
                            </span>
                          ))}
                        <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                          {assignedTherapists.length > 0 ? assignedTherapists.join(", ") : copy.noTherapists}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}

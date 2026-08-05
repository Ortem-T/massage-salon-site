import { ManagementTelegramSettingsForm } from "@/components/dashboard/management-telegram-settings-form";
import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import {
  type DashboardOperationSettings,
  type DashboardTelegramSettings
} from "@/lib/dashboard/settings";

type ManagementControlCenterProps = {
  dictionary: Dictionary;
  locale: Locale;
  operationSettings: DashboardOperationSettings;
  scheduleBlockCount: number;
  telegramSettings: DashboardTelegramSettings;
};

export function ManagementControlCenter({
  dictionary,
  locale,
  operationSettings,
  scheduleBlockCount,
  telegramSettings
}: ManagementControlCenterProps) {
  const management = dictionary.dashboard.management;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-card/72 p-5 shadow-soft sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {management.eyebrow}
        </p>
        <div className="mt-3 max-w-3xl">
          <h1 className="font-serif text-4xl font-medium leading-tight text-primary sm:text-5xl">
            {management.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{management.subtitle}</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <ManagementTelegramSettingsForm
          copy={management.telegram}
          initialSettings={telegramSettings}
          locale={locale}
        />

        <div className="space-y-5">
          <section className="rounded-3xl border border-border/70 bg-background/60 p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {management.salonMode.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-primary">{management.salonMode.title}</h2>
            <div className="mt-5 rounded-2xl border border-border/70 bg-card/70 p-4">
              <p className="text-sm text-muted-foreground">{management.salonMode.availableRooms}</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{operationSettings.availableRooms}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{management.salonMode.helper}</p>
          </section>

          <section className="rounded-3xl border border-border/70 bg-background/60 p-5 shadow-soft">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {management.scheduleStatus.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-primary">{management.scheduleStatus.title}</h2>
            <div className="mt-5 rounded-2xl border border-border/70 bg-card/70 p-4">
              <p className="text-sm text-muted-foreground">{management.scheduleStatus.activeBlocks}</p>
              <p className="mt-2 text-3xl font-semibold text-primary">{scheduleBlockCount}</p>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{management.scheduleStatus.helper}</p>
          </section>

          <section className="rounded-3xl border border-dashed border-border/80 bg-card/44 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {management.future.eyebrow}
            </p>
            <h2 className="mt-2 text-xl font-semibold text-primary">{management.future.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{management.future.body}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

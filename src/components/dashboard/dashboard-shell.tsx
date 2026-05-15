import Link from "next/link";
import type { ReactNode } from "react";

import { type Locale } from "@/i18n/config";
import { type Dictionary } from "@/i18n/dictionaries";
import { type DashboardUser } from "@/lib/dashboard/auth";
import { getDashboardNavigation } from "@/lib/dashboard/navigation";

type DashboardShellProps = {
  children: ReactNode;
  dictionary: Dictionary;
  locale: Locale;
  user: DashboardUser;
};

export function DashboardShell({ children, dictionary, locale, user }: DashboardShellProps) {
  const dashboard = dictionary.dashboard;
  const navItems = getDashboardNavigation(locale, dictionary, user.role);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-8">
        <aside className="border-border/70 bg-card/72 shadow-soft rounded-3xl border p-5 lg:sticky lg:top-8 lg:h-[calc(100vh-4rem)] lg:w-72 lg:shrink-0">
          <div>
            <Link href={`/${locale}/dashboard`} className="block">
              <p className="font-serif text-3xl leading-none text-primary">{dictionary.brand.name}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {dashboard.title}
              </p>
            </Link>
          </div>

          <nav className="mt-8" aria-label={dashboard.navigationLabel}>
            <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="focus-ring block min-w-max rounded-full border border-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/15 hover:bg-secondary/65 hover:text-primary lg:min-w-0"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-8 rounded-2xl border border-border/70 bg-background/56 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {dashboard.signedInAs}
            </p>
            <p className="mt-2 break-words text-sm font-semibold text-primary">{user.email || dashboard.unknownEmail}</p>
            <p className="mt-1 text-sm text-muted-foreground">{dashboard.roles[user.role]}</p>
          </div>
        </aside>

        <main className="w-full flex-1 py-8 lg:py-0">{children}</main>
      </div>
    </div>
  );
}

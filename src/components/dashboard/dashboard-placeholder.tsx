import { type ReactNode } from "react";

type DashboardPlaceholderProps = {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
};

export function DashboardPlaceholder({ eyebrow, title, body, children }: DashboardPlaceholderProps) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/78 p-6 shadow-soft sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
      <h1 className="mt-3 max-w-3xl font-serif text-4xl font-semibold leading-tight text-primary sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{body}</p>
      {children ? <div className="mt-8">{children}</div> : null}
    </section>
  );
}

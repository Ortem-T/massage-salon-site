import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getDashboardRoleFromAppMetadata } from "@/lib/dashboard/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { signInDashboard } from "./actions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "sr";
  const [{ error, next }, dictionary] = await Promise.all([searchParams, getDictionary(locale)]);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const role = getDashboardRoleFromAppMetadata(data?.claims?.app_metadata);

  if (data?.claims && role) {
    redirect(`/${locale}/dashboard`);
  }

  const login = dictionary.auth.login;
  const action = signInDashboard.bind(null, locale, next ?? null);
  const errorKey = error ?? (data?.claims && !role ? "forbidden" : null);
  const errorMessage = errorKey ? login.errors[errorKey as keyof typeof login.errors] ?? login.errors.invalid : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <section className="w-full max-w-md rounded-3xl border border-border/70 bg-card/82 p-6 shadow-soft sm:p-8">
        <p className="font-serif text-4xl leading-none text-primary">{dictionary.brand.name}</p>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {login.eyebrow}
        </p>
        <h1 className="mt-6 font-serif text-4xl font-semibold leading-tight text-primary">{login.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{login.subtitle}</p>

        <form action={action} className="mt-8 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="email">{login.fields.email.label}</Label>
            <Input id="email" name="email" type="email" autoComplete="email" placeholder={login.fields.email.placeholder} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{login.fields.password.label}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={login.fields.password.placeholder}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm leading-6 text-foreground">
              {errorMessage}
            </p>
          ) : null}

          <Button type="submit" className="w-full">
            {login.submit}
          </Button>
        </form>
      </section>
    </main>
  );
}

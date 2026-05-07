import Link from "next/link";

import { type Dictionary } from "@/i18n/dictionaries";
import { type Locale } from "@/i18n/config";

type FooterProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Footer({ locale, dictionary }: FooterProps) {
  const year = new Date().getFullYear();
  const { brand, footer, nav } = dictionary;

  return (
    <footer className="border-t border-border/70 bg-[#e7dec9] py-10">
      <div className="container-shell flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href={`/${locale}`} className="font-serif text-2xl text-foreground">
            {brand.name}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{footer.text}</p>
        </div>
        <div className="flex flex-col gap-4 md:items-end">
          <nav className="flex flex-wrap gap-4" aria-label="Footer">
            {nav.links.map((link) => (
              <Link key={link.href} href={`/${locale}${link.href}`} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-muted-foreground">
            © {year} {brand.name}. {footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}

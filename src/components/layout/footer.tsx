import Link from "next/link";
import { Instagram, MessageCircle, Send } from "lucide-react";

import { contactConfig } from "@/config/contacts";
import { type Dictionary } from "@/i18n/dictionaries";
import { type Locale } from "@/i18n/config";

type FooterProps = {
  locale: Locale;
  dictionary: Dictionary;
};

export function Footer({ locale, dictionary }: FooterProps) {
  const year = new Date().getFullYear();
  const { brand, footer, nav } = dictionary;
  const footerLinks = [
    {
      href: contactConfig.whatsappUrl,
      icon: MessageCircle,
      label: footer.links.whatsapp,
      ariaLabel: footer.aria.whatsapp
    },
    {
      href: contactConfig.telegramUrl,
      icon: Send,
      label: footer.links.telegram,
      ariaLabel: footer.aria.telegram
    },
    {
      href: contactConfig.instagramUrl,
      icon: Instagram,
      label: footer.links.instagram,
      ariaLabel: footer.aria.instagram
    }
  ];

  return (
    <footer className="border-t border-border/70 bg-[#e7dec9] py-10">
      <div className="container-shell flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href={`/${locale}`} className="font-serif text-2xl text-foreground">
            {brand.name}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">{footer.text}</p>
          <p className="mt-3 text-sm font-semibold text-primary">Sajmište</p>
          <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{contactConfig.address}</p>
        </div>
        <div className="flex flex-col gap-4 lg:items-end">
          <nav className="flex flex-wrap gap-4" aria-label={footer.navigationLabel}>
            {nav.links.map((link) => (
              <Link key={link.href} href={`/${locale}${link.href}`} className="text-sm text-muted-foreground hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>

          <nav className="flex flex-wrap gap-3" aria-label={footer.contactLinksLabel}>
            {footerLinks.map((link) => {
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.ariaLabel}
                  className="focus-ring inline-flex items-center gap-2 rounded-full border border-primary/15 bg-card/38 px-3 py-2 text-sm font-semibold text-primary transition hover:border-accent/55 hover:bg-card"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <p className="text-sm text-muted-foreground">
            © {year} {brand.name}. {footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}

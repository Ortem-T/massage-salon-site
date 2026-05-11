# Development Log

Last updated: 2026-05-11

This log is shared context for human and AI-assisted development. Update it after every major development stage so future Codex, `web-coder`, and `grill-me` sessions can continue without rediscovering project history.

## Current State Summary

Raine is a premium multilingual massage salon homepage for Novi Sad, Serbia. The homepage MVP exists and uses locale-based routing for Serbian, Russian, and English. The visual direction has moved toward calm luxury wellness with Japanese spa influence, warm natural colors, refined typography, soft shadows, and gentle motion.

The booking form MVP is integrated into the homepage. It is currently frontend-only and sends a mock request through a service layer. The form collects service, specialist, preferred date, preferred time, client name, phone number, and optional comment. The current site locale is passed into the mock booking request as `siteLocale`.

## Completed Tasks

- Created Next.js 15 project structure with App Router.
- Added TypeScript, Tailwind CSS, local shadcn/ui-style primitives, and Framer Motion.
- Implemented multilingual routing:
  - `/sr`
  - `/ru`
  - `/en`
- Added dictionary-based i18n structure.
- Built homepage MVP sections:
  - hero
  - services
  - booking form
  - benefits
  - testimonials
  - about
  - CTA
  - contacts
  - footer
- Integrated Raine logo assets into the brand identity.
- Cleaned public logo asset usage.
- Loaded production typography with local font packages.
- Improved language switcher active hover contrast.
- Added booking form MVP with React Hook Form and Zod.
- Added mock booking service layer in `src/lib/booking`.
- Polished booking form UI for premium wellness feel.
- Removed manual preferred language field from booking form.
- Added specialist selection to booking form.
- Passed current route locale into booking request data.
- Added project documentation system in `docs/`.
- Applied booking review fixes for stable service ids, accessible validation messages, schema-level date validation, localized submit failure state, and premium-safe booking copy.
- Replaced the native booking date input with a custom branded calendar popover and added a config-based availability foundation for working days, closed dates, fully booked dates, and available time slots.

## Current Focus

The current focus is stabilizing the booking MVP and documenting decisions before backend work begins. The next product risk is trust: placeholder contact destinations and placeholder specialists should be replaced with real business data before the site feels production-ready.

## Next Tasks

- Replace fake or placeholder WhatsApp, Telegram, and Instagram destinations with real salon channels.
- Replace placeholder specialist options with real staff data or agreed public labels.
- Review booking form copy in all locales.
- Verify mobile booking UX on real viewport sizes.
- Run a hard UX review of the booking section after real data is added.
- Define Supabase schema for booking requests.
- Define Supabase schema for availability rules: working days, closed dates, booked slots, and specialist-specific schedules.
- Add manual QA checklist for launch.

## Manual QA Checklist

- Check `/sr`, `/ru`, and `/en` booking form copy.
- Check mobile widths around 360px, 390px, 430px, 768px, and desktop.
- Complete the form with keyboard only.
- Trigger each validation error and confirm layout does not jump awkwardly.
- Open and use the custom date picker with mouse and keyboard.
- Confirm unavailable dates cannot be selected.
- Confirm time slots update when the selected date changes.
- Confirm validation errors are announced or discoverable by assistive technology.
- Confirm selected language switcher state remains readable on hover.
- Hover service rows and confirm background has proper left and right spacing.
- Submit successfully and verify success state.
- Simulate failed submit before Supabase launch and verify localized error state.
- Verify real WhatsApp, Telegram, Instagram, and contact links before production.

## Known Issues

- Contact destinations are still placeholders and should not be treated as production-ready.
- Specialist options are realistic placeholders.
- Booking request persistence is not implemented.
- No admin dashboard exists.
- No client authentication exists by design.
- Automated PR creation can fail due GitHub CLI or connector access; branch push still works.
- Local Next.js dev server may need a restart after production build.

## Architectural Decisions

- Use locale route segments instead of query parameters for SEO-friendly multilingual pages.
- Keep all translated copy in dictionary files.
- Keep booking data validation in `src/lib/booking/booking-schema.ts`.
- Keep booking persistence behind `createBookingRequest()` so Supabase can be connected later without rewriting form UI.
- Store current site language as `siteLocale` from the selected route instead of asking users to choose communication language manually.
- Keep UI primitives local and lightweight rather than pulling in a full component dependency for every shadcn/ui part.
- Avoid backend, CRM, and authentication until the booking MVP is stable.

## Update Rule

After each major development stage, update this file with:

- what changed
- why it changed
- which files or modules were affected
- what remains unresolved
- what should happen next

Keep entries concise. The goal is continuity, not a full changelog.

# Development Log

Last updated: 2026-05-11

This log is shared context for human and AI-assisted development. Update it after every major development stage so future Codex, `web-coder`, and `grill-me` sessions can continue without rediscovering project history.

## Current State Summary

Raine is a premium multilingual massage salon homepage for Novi Sad, Serbia. The homepage MVP exists and uses locale-based routing for Serbian, Russian, and English. The visual direction has moved toward calm luxury wellness with Japanese spa influence, warm natural colors, refined typography, soft shadows, and gentle motion.

The booking form MVP is integrated into the homepage and now submits through a Next API route to Supabase. The form collects service, specialist, preferred date, preferred time, client name, phone number, and optional comment. The current site locale is passed as `siteLocale` and persisted as the booking `locale`. A protected dashboard foundation now exists for Supabase Auth staff users with `admin` and `therapist` roles. A dashboard MVP schema migration has been drafted but still needs to be applied manually in Supabase.

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
- Switched project workflow from per-task feature branches to a persistent `develop` branch for ongoing development, with milestone PRs from `develop` to `main`.
- Added Supabase booking persistence MVP behind `createBookingRequest()`, including a public anon insert-only RLS migration, a typed Supabase utility, and `/api/bookings` server-side validation.
- Added a Supabase Auth protected dashboard foundation at `/[locale]/dashboard`, with server-side login, cookie-based SSR auth utilities, role-aware navigation, and placeholder admin/therapist dashboard pages.
- Added a dashboard MVP Supabase migration draft for `profiles`, `therapists`, `clients`, `services`, additive `bookings` columns, RLS grants, and staff booking update constraints.

## Current Focus

The current focus is stabilizing the Supabase-backed booking MVP and using the new dashboard foundation for the first internal booking-management views. The next product risk is trust: placeholder contact destinations and placeholder specialists should be replaced with real business data before the site feels production-ready.

## Git Workflow

- `main` is stable and production-ready.
- `develop` is the active development branch.
- Commit ongoing work directly to `develop`.
- Do not push directly to `main`.
- Create a pull request from `develop` to `main` only when a milestone is ready.
- Avoid feature branches unless explicitly requested.
- Run lint/build before commit when available.
- Update this log after meaningful milestones.

## Next Tasks

- Replace fake or placeholder WhatsApp, Telegram, and Instagram destinations with real salon channels.
- Replace placeholder specialist options with real staff data or agreed public labels.
- Review booking form copy in all locales.
- Verify mobile booking UX on real viewport sizes.
- Run a hard UX review of the booking section after real data is added.
- Apply the Supabase booking migration in the hosted project and manually submit a test booking.
- Apply the dashboard MVP schema migration in the hosted Supabase project and verify RLS with one admin user and one therapist user.
- Define Supabase schema for availability rules: working days, closed dates, booked slots, and therapist-specific schedules.
- Add manual QA checklist for launch.
- Create Supabase Auth staff users and set `app_metadata.role` to either `admin` or `therapist`.
- Connect the dashboard bookings page to authenticated Supabase reads with RLS-safe policies.
- Seed initial `profiles`, `therapists`, and `services` rows after the dashboard schema migration is applied.

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
- Submit successfully and verify success state plus a new row in Supabase `public.bookings`.
- Simulate failed submit before Supabase launch and verify localized error state.
- Verify real WhatsApp, Telegram, Instagram, and contact links before production.
- Confirm unauthenticated `/sr/dashboard`, `/ru/dashboard`, and `/en/dashboard` visits redirect to the matching login page.
- Confirm admin users see overview, bookings, clients, services, and therapists navigation.
- Confirm therapist users see only overview and bookings navigation.

## Known Issues

- Contact destinations are still placeholders and should not be treated as production-ready.
- Specialist options are realistic placeholders.
- Booking persistence depends on applying the Supabase migration and setting public Supabase env vars locally and in deployment.
- Dashboard pages are placeholders only; no CRM data views or status workflows exist yet.
- Dashboard schema migration has not been applied to the hosted Supabase project yet.
- No client authentication exists by design; the new auth flow is for staff dashboard users only.
- Automated PR creation can fail due GitHub CLI or connector access; branch push still works.
- Local Next.js dev server may need a restart after production build.

## Architectural Decisions

- Use locale route segments instead of query parameters for SEO-friendly multilingual pages.
- Keep all translated copy in dictionary files.
- Keep booking data validation in `src/lib/booking/booking-schema.ts`.
- Keep booking persistence behind `createBookingRequest()` so storage details can evolve without rewriting form UI.
- Use a Next API route for public booking inserts, with Supabase RLS allowing anon inserts only and no anon reads or updates.
- Store current site language as `siteLocale` from the selected route instead of asking users to choose communication language manually.
- Use Supabase SSR cookie-based Auth only for staff dashboard routes; public booking remains unauthenticated.
- Store dashboard authorization roles in Supabase Auth app metadata, using `role: "admin"` or `role: "therapist"`. Unknown or missing role values fall back to therapist-level navigation.
- Keep dashboard database changes additive: public booking inserts remain anon insert-only, while authenticated dashboard access is controlled by RLS using staff roles from `raw_app_meta_data`.
- Keep UI primitives local and lightweight rather than pulling in a full component dependency for every shadcn/ui part.
- Avoid full CRM workflows until the booking/dashboard foundation is stable.

## Update Rule

After each major development stage, update this file with:

- what changed
- why it changed
- which files or modules were affected
- what remains unresolved
- what should happen next

Keep entries concise. The goal is continuity, not a full changelog.

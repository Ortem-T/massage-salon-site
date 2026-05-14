# Development Log

Last updated: 2026-05-14

This log is shared context for human and AI-assisted development. Update it after every major development stage so future Codex, `web-coder`, and `grill-me` sessions can continue without rediscovering project history.

## Current State Summary

Raine is a premium multilingual massage salon homepage for Novi Sad, Serbia. The homepage MVP exists and uses locale-based routing for Serbian, Russian, and English. The visual direction has moved toward calm luxury wellness with Japanese spa influence, warm natural colors, refined typography, soft shadows, and gentle motion.

The booking form MVP is integrated into the homepage and now submits through a Next API route to Supabase. The form collects service, specialist, preferred date, preferred time, client name, phone number, and optional comment. The current site locale is passed as `siteLocale` and persisted as the booking `locale`. A protected dashboard foundation now exists for Supabase Auth staff users with `admin` and `therapist` roles. A dashboard MVP schema migration has been drafted but still needs to be applied manually in Supabase. The first dashboard bookings UI is calendar-first and supports day, week, and month views. Real face/body services now have a Supabase seed migration with localized Serbian, Russian, and English translations, and homepage/public/manual booking service options are designed to read from that shared catalog. Public booking specialists now come from active Supabase therapists with localized display names; the generic "any available specialist" option has been removed. Public contact data now uses real messenger-first salon channels, a centralized contact config, and a Google Maps embed driven by an environment variable.

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
- Added the first calendar-first dashboard bookings UI on `/[locale]/dashboard` and `/[locale]/dashboard/bookings`, including role-aware filters, status overview, booking details modal, and server actions for status, therapist assignment, and internal notes.
- Added role-based booking management actions: admin can update status, assign therapists, and edit notes for all bookings; therapists can update status and notes only for assigned bookings. Added a follow-up RLS migration for therapist status permissions.
- Hardened dashboard review findings: invalid staff roles are blocked at login/dashboard entry, booking details trap keyboard focus and support Escape close, admin updates verify affected rows, compact calendar events show text status cues, and dashboard dates use the Belgrade salon timezone with Serbian Latin formatting.
- Added manual dashboard booking creation for staff-originated requests, including role-aware create permissions, source channel capture, optional duration, localized validation, and a follow-up RLS migration for authenticated staff inserts.
- Refined manual dashboard booking creation after QA: the dashboard create form now reuses the branded booking calendar picker, uses the shared booking time slot dropdown, limits therapist choices to active database therapist records, and keeps dashboard reads resilient while the manual-booking migration is being applied.
- Added real Supabase-backed service catalog support with `face` and `body` categories, localized service translations, online-bookable flags, sort order, service RLS/grants, and slug-based idempotent seed data for the salon price list.
- Replaced homepage, public booking, and manual dashboard booking service options with the shared service catalog fetcher. Public booking validates that the submitted service slug is active and bookable online; dashboard manual booking validates that the service slug is active and snapshots service duration when none is provided.
- Added a public therapist catalog with localized names/titles for active therapists. Public booking now submits therapist ids, validates them server-side, stores the canonical therapist display name in `bookings.specialist`, and links `bookings.therapist_id`.
- Replaced mock public booking availability with Supabase-backed therapist availability. The public calendar now waits for service and therapist selection, reads safe availability rows from `public.public_booking_availability`, shows subtle other-therapist booking hints, calculates slots from service duration plus a 30-minute break, and revalidates availability before insert.
- Added schedule block management for admin and therapist dashboard users. Staff can block full days or time ranges, admin can manage therapist and salon-wide blocks, therapists can manage their own blocks, and public/manual availability now excludes blocked windows without exposing internal reasons.
- Replaced homepage contact and footer placeholders with real salon address, landmark, daily hours, WhatsApp, Telegram, Instagram, and Google Maps integration. The public phone number remains hidden from visible UI; Viber is intentionally not shown.
- Applied homepage critical/high review fixes: removed mobile service-row horizontal overflow, routed primary booking CTAs to the booking form, moved benefits before booking for trust, and switched public catalog reads to ISR-friendly Supabase access.
- Applied homepage medium review improvements: added a localized quiet booking CTA after the services list and upgraded the custom booking calendar with roving keyboard focus, arrow-key navigation, Home/End, PageUp/PageDown, and Escape focus return.
- Added root-only locale auto-detection: `/` redirects to the preferred locale cookie, then browser `Accept-Language`, then Serbian fallback, while explicit `/sr`, `/ru`, and `/en` routes remain stable.

## Current Focus

The current focus is validating admin/therapist schedule block workflows against real RLS and doing mobile QA on the real public booking flow. The real service, therapist, availability, and schedule-block migrations have been applied to the hosted `raine` Supabase project and public reads are limited to safe catalog/availability data. Contact data is now production-shaped, but deployment still needs a restricted `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` for the embedded map. Homepage public catalog reads are now ISR-friendly and should be revalidated rather than forcing every request through Supabase.

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

- Review booking form copy in all locales.
- Verify mobile booking UX on real viewport sizes.
- Run a hard UX review of the booking section after real data is added.
- Apply the Supabase booking migration in the hosted project and manually submit a test booking.
- Apply the dashboard MVP schema migration in the hosted Supabase project and verify RLS with one admin user and one therapist user.
- Apply the dashboard manual booking migration in the hosted Supabase project and verify admin/therapist insert policies.
- Add therapist-specific working hours later if needed; MVP public availability uses the centralized default 10:00-19:00 schedule, all 7 days.
- Add manual QA checklist for launch.
- Create Supabase Auth staff users and set `app_metadata.role` to either `admin` or `therapist`.
- Seed initial `profiles` and `therapists` rows after the dashboard schema migration is applied.
- Re-run `20260513140000_real_service_catalog.sql` only when restoring or reseeding; it is slug-based and idempotent.
- Re-run `20260513150000_public_therapist_catalog.sql` only when restoring or reseeding therapist translations.
- Re-run `20260513160000_public_booking_availability_view.sql` only when restoring the safe public availability view and column-level booking grants.
- Re-run `20260513170000_schedule_blocks.sql` only when restoring schedule block support, staff RLS, and the safe public schedule block availability view.
- Add `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` locally and in deployment with HTTP referrer restrictions before launch.
- Test admin status changes, therapist assignment, therapist status changes, and internal notes updates against hosted Supabase RLS.
- Test manual booking creation for admin assigned, admin unassigned, therapist own, and therapist direct-request attempts against hosted Supabase RLS.

## Manual QA Checklist

- Check `/sr`, `/ru`, and `/en` booking form copy.
- Confirm `/` redirects to `/sr` by default, `/ru` for Russian browser preference, `/en` for English browser preference, and a saved locale cookie wins over the browser header.
- Confirm visiting `/sr`, `/ru`, and `/en` stays on the explicit route without auto-switching.
- Confirm the language switcher preserves the current localized path and stores the preferred locale cookie.
- Check `/sr`, `/ru`, and `/en` homepages show localized Face/Lice/Лицо and Body/Telo/Тело service groups with the real names, descriptions, durations, and RSD prices.
- Confirm public booking service options use the same real service names as the homepage.
- Confirm public booking specialist options show only active real therapists, localized per route, with no generic "any available specialist" option.
- Confirm dashboard manual booking service options use the same real service names for admin and therapist users.
- Check mobile widths around 360px, 390px, 430px, 768px, and desktop.
- Confirm homepage has no horizontal scroll at 360px, 375px, 390px, 430px, and 768px.
- Confirm hero and navbar "book" CTAs scroll to the booking form, while messenger CTAs still open WhatsApp.
- Confirm the quiet CTA after services scrolls to the booking form in `/sr`, `/ru`, and `/en`.
- Confirm homepage section order is Hero, Services, Benefits, Booking, Testimonials, About, CTA, Contact.
- Complete the form with keyboard only.
- Trigger each validation error and confirm layout does not jump awkwardly.
- Open and use the custom date picker with mouse and keyboard, including Tab, Arrow keys, Home/End, PageUp/PageDown, Enter/Space, and Escape.
- Confirm the booking calendar is disabled until service and therapist are selected.
- Confirm unavailable dates cannot be selected for the selected therapist/service.
- Confirm bookings for therapist A do not block therapist B.
- Confirm a subtle info dot appears only when another therapist has bookings on a date and the selected therapist has none.
- Confirm time slots update when service, therapist, or date changes.
- Confirm selected time clears if it becomes unavailable.
- Confirm a taken slot returns the localized "time no longer available" error.
- Confirm admin can create full-day and time-range schedule blocks for any therapist.
- Confirm therapist users can create full-day and time-range schedule blocks only for their own therapist profile.
- Confirm blocked days/times disappear from public booking and manual dashboard booking time options.
- Confirm internal schedule block reasons are visible in dashboard only and not exposed in public booking UI/API responses.
- Confirm `/sr`, `/ru`, and `/en` contact sections show the real address, Novosadski sajam landmark, daily 10:00-19:00 hours, and localized contact copy.
- Confirm footer contact links show WhatsApp, Telegram, and Instagram only.
- Confirm the Google Maps iframe renders when `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` is configured, and the fallback remains clean without it.
- Confirm the visible site UI does not display the personal phone number as plain text.
- Confirm validation errors are announced or discoverable by assistive technology.
- Confirm selected language switcher state remains readable on hover.
- Hover service rows and confirm background has proper left and right spacing.
- Submit successfully and verify success state plus a new row in Supabase `public.bookings`.
- Simulate failed submit before Supabase launch and verify localized error state.
- Verify real WhatsApp, Telegram, Instagram, and Google Maps contact links before production.
- Confirm unauthenticated `/sr/dashboard`, `/ru/dashboard`, and `/en/dashboard` visits redirect to the matching login page.
- Confirm admin users see overview, bookings, clients, services, and therapists navigation.
- Confirm therapist users see only overview and bookings navigation.
- Confirm the dashboard calendar defaults to a usable day view on mobile.
- Confirm admin users can filter bookings by therapist and status.
- Confirm admin users can create manual bookings assigned to any therapist or temporarily unassigned.
- Confirm manual booking date selection uses the branded calendar and time selection uses the shared slot dropdown.
- Confirm therapist users only see their own assigned bookings.
- Confirm therapist users can create manual bookings only for their own therapist profile.
- Confirm booking details fit mobile screens and allow internal notes editing.
- Confirm booking details trap Tab focus, close with Escape, and return focus to the opened booking.
- Confirm cancelling a booking shows a confirmation dialog.
- Confirm therapist users can mark assigned bookings confirmed, cancelled, or completed, but cannot reassign them or set them back to pending.
- Confirm a signed-in Auth user without `app_metadata.role` is redirected to login with a staff-access error.
- Confirm Serbian dashboard dates render in Latin script.
- Confirm manual booking source channel and duration are visible after creation.

## Known Issues

- Google Maps embed requires `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY`; without it, the contact section shows a styled map fallback and the external Google Maps link still works.
- Booking persistence depends on applying the Supabase migration and setting public Supabase env vars locally and in deployment.
- Clients, services, and therapists dashboard pages are placeholders only; the bookings calendar is the first operational dashboard view.
- Dashboard schema migration has not been applied to the hosted Supabase project yet.
- Manual booking creation requires applying `20260513130000_dashboard_manual_bookings.sql` in the hosted Supabase project.
- The hosted Supabase project has `20260513140000_real_service_catalog.sql` applied; local or restored environments still need that migration before public service reads work.
- The hosted Supabase project has `20260513160000_public_booking_availability_view.sql` applied; local or restored environments need it before real public availability works.
- The hosted Supabase project has `20260513170000_schedule_blocks.sql` applied; local or restored environments need it before dashboard schedule blocks work.
- No client authentication exists by design; the new auth flow is for staff dashboard users only.
- Automated PR creation can fail due GitHub CLI or connector access; branch push still works.
- Local Next.js dev server may need a restart after production build.

## Architectural Decisions

- Use locale route segments instead of query parameters for SEO-friendly multilingual pages.
- Keep locale auto-detection root-only: `/` may redirect by saved preference or browser language, but explicit localized URLs stay canonical and unchanged.
- Keep all translated copy in dictionary files.
- Keep booking data validation in `src/lib/booking/booking-schema.ts`.
- Keep booking persistence behind `createBookingRequest()` so storage details can evolve without rewriting form UI.
- Use a Next API route for public booking inserts, with Supabase RLS allowing anon inserts only and no anon reads or updates.
- Store current site language as `siteLocale` from the selected route instead of asking users to choose communication language manually.
- Use Supabase SSR cookie-based Auth only for staff dashboard routes; public booking remains unauthenticated.
- Store dashboard authorization roles in Supabase Auth app metadata, using `role: "admin"` or `role: "therapist"`. Unknown or missing role values are blocked from dashboard access.
- Keep dashboard database changes additive: public booking inserts remain anon insert-only, while authenticated dashboard access is controlled by RLS using staff roles from `raw_app_meta_data`.
- Keep dashboard booking data fetching and updates isolated in `src/lib/dashboard` so UI components can evolve without embedding Supabase query details.
- Keep dashboard booking actions role-aware in the service layer and rely on Supabase RLS as the real data boundary.
- Keep manual booking creation as dashboard-only staff workflow with `source = 'dashboard'` and a captured `source_channel`; public booking remains `source = 'website'`.
- Store service catalog entries in `public.services` by stable slug, with public text in `public.service_translations`; booking rows continue to store the selected service slug in `bookings.service` for compatibility with existing data.
- Treat the 6-treatment course as one normal first-appointment booking in the MVP; do not add package tracking until a later workflow is designed.
- Keep public availability data behind `public.public_booking_availability`, a `security_invoker` view with column-level booking grants and RLS that exposes only date, time, therapist id, service slug, duration, and blocking status. Full booking rows remain unavailable to anon users.
- Keep schedule block reasons private in `public.schedule_blocks`; public booking reads only `public.public_schedule_block_availability`, which exposes blocked date/time/scope fields and never internal comments.
- Use `src/lib/booking/booking-availability.ts` as the shared source for duration rounding, blocked intervals, default time slot generation, and before-insert slot checks.
- Keep public salon contact data centralized in `src/config/contacts.ts`; translated labels and messages stay in dictionaries. The phone number may exist inside the WhatsApp URL, but visible UI must not render it as plain text.
- Use `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` for the embedded map instead of committing Google Maps keys to source.
- Keep the custom branded booking calendar, but support roving keyboard focus instead of replacing it with a new component dependency.
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

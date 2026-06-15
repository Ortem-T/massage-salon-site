# Development Log

Last updated: 2026-06-15

This log is shared context for human and AI-assisted development. Update it after every major development stage so future Codex, `web-coder`, and `grill-me` sessions can continue without rediscovering project history.

## Current State Summary

Raine is a premium multilingual massage salon homepage for Novi Sad, Serbia. The homepage MVP exists and uses locale-based routing for Serbian, Russian, and English. The visual direction has moved toward calm luxury wellness with Japanese spa influence, warm natural colors, refined typography, soft shadows, and gentle motion.

The booking form MVP is integrated into the homepage and now submits through a Next API route to Supabase. The form collects service, specialist, preferred date, preferred time, client name, phone number, and optional comment. The current site locale is passed as `siteLocale` and persisted as the booking `locale`. A protected dashboard foundation now exists for Supabase Auth staff users with `admin` and `therapist` roles. A dashboard MVP schema migration has been drafted but still needs to be applied manually in Supabase. The first dashboard bookings UI is calendar-first and supports day, week, and month views. Real face/body services now have Supabase seed migrations with localized Serbian, Russian, and English translations, and homepage/public/manual booking service options read from that shared catalog. Public booking specialists now come from active Supabase therapists and are filtered by active therapist-service eligibility; the generic "any available specialist" option has been removed. Public contact data now uses real messenger-first salon channels, a centralized contact config, and a Google Maps embed for the real Raine Massage Salon listing. Telegram team notifications are now wired for booking creation, status changes, and dashboard therapist assignment changes, with Russian-only server-side messages.

Manual dashboard booking now has a CRM-ready client contact foundation. Admins and therapists can select an allowed existing client or create a new client during manual booking, with separate contact fields for Instagram, Telegram, WhatsApp, Viber, phone, walk-in, and other channels. New bookings keep legacy `client_name` / `client_phone` snapshots for compatibility, but also write `client_id`, `client_contact_channel`, and `client_contact_value`. Public booking UI remains visually unchanged and now links website bookings to clients through a narrow public RPC that returns only the client id.

The admin-only Clients CRM page is now implemented at `/[locale]/dashboard/clients`. Admin users can search and filter clients, view primary contact details, notes, booking counts, latest service, and linked booking history, then create or edit client records without changing old booking snapshots. Therapist users still do not see the Clients navigation item and are redirected away from the full CRM route by server-side role checks.

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
- Replaced active homepage hero copy in Serbian, Russian, and English with the approved massage-focused messaging while keeping the existing hero structure.
- Updated the homepage services intro copy in Serbian, Russian, and English to describe personalized treatments more clearly.
- Updated the homepage benefits section title and first benefit item in Serbian, Russian, and English to emphasize calm atmosphere and professional care.
- Updated the homepage booking section copy in Serbian, Russian, and English to make the booking flow clearer and remove the no-payment/no-registration form note.
- Temporarily hid the homepage testimonials section behind a feature flag and removed placeholder review items from public dictionaries until real client reviews are available.
- Updated the homepage About salon copy and stats in Serbian, Russian, and English to use clearer salon positioning and real specialist/procedure counts.
- Updated two homepage benefits card texts in Serbian, Russian, and English to mention cozy atmosphere, music, coffee, natural oils, and gentle aromas.
- Removed the standalone homepage WhatsApp CTA block and redesigned the About salon section as a dark green premium brand block while keeping existing About copy and stats.
- Added server-side Telegram booking notifications using `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, and `NEXT_PUBLIC_SITE_URL`. Notifications are Russian-only for now, include an inline dashboard day button when the site URL is configured, and failures are logged server-side without blocking booking creation or updates.
- Completed a pre-deployment Vercel audit: lint and production build pass, required env placeholders are documented, local env files and build artifacts are ignored, tracked code contains no Telegram bot token, Supabase service-role key, or Google Maps API key, `/sr`, `/ru`, and `/en` smoke-test successfully, unauthenticated dashboard access redirects to login, and a public booking API smoke-test returns `201`.
- Added the local SEO foundation for `https://raine.rs`: localized production titles/descriptions, absolute canonical and hreflang URLs, sitemap and robots using the production domain, Open Graph locale metadata, LocalBusiness/HealthAndBeautyBusiness JSON-LD, noindex metadata for login/dashboard routes, and `docs/SEO_CHECKLIST.md` for Search Console and Google Business Profile follow-up.
- Switched the contact section Google Maps embed from address/API-key lookup to the real Raine Massage Salon Google Maps listing embed, and updated the external Google Maps link and JSON-LD `hasMap` value to the same listing.
- Added therapist-service eligibility through the new `public.therapist_services` migration, updated and split body services into the new production price list, deactivated deprecated combined body service slugs without deleting historical bookings, and made public booking plus dashboard manual booking filter/validate therapists by selected service.
- Added two body services for device-based lymphatic drainage: one-zone session and a 12-treatment course, both bookable online, 30 minutes, available to Sergey and Ekaterina through `therapist_services`, with the course treated as a regular first-appointment booking for the MVP.
- Renamed the `taping-application` service translations to show the shorter public name "Taping" / "Tejping" / "Тейпирование" while keeping the one-application detail in the localized short descriptions.
- Updated the homepage services eyebrow to Services & Prices, added localized booking buttons to bookable service rows, wired service buttons to preselect the booking form via `?service=...#booking`, and made the form auto-select a therapist only when exactly one active therapist is allowed for the selected service.
- Updated Serbian microcurrent wording to use `mikrostrujna` instead of `mikrotalasna`, including `Mikrostrujna terapija lica` for facial microcurrents and related microcurrent service descriptions.
- Updated the dashboard booking experience to show Supabase service duration and RSD price in manual booking service options, selected service summaries, day-view booking cards, compact card tooltips, and booking details while keeping therapist-service restrictions in place.
- Added an admin-managed homepage booking-section promotion card: new promotions schema/RLS migration, admin-only dashboard management, localized public promo fallback logic, booking promo snapshots, and Telegram promo context for public bookings.
- Added first-stage public booking security hardening: public form submissions now target `POST /api/bookings/public`, the server validates payload/date/time/service/therapist eligibility more strictly, applies Origin/Referer checks, in-memory IP and phone rate limits, a hidden honeypot field, before-insert availability re-checks, and safe error codes before sending Telegram only after successful inserts. Public availability responses now expose only availability and slots.
- Created `docs/SECURITY.md` with the current security model, public booking protections, rate-limit limitations, Origin-check limitations, public data exposure notes, and the recommended stage 2 hardening path.
- Added a Supabase maintenance patch for booking updates: `private.enforce_therapist_booking_update()` now allows trusted DB roles (`postgres`, `supabase_admin`, `service_role`) before dashboard JWT role checks, while keeping admin/therapist restrictions intact. Booking availability now treats `19:00` as the latest allowed start time instead of the service end deadline, including public booking, manual dashboard booking, before-insert re-checks, and schedule block overlap handling.
- Added CRM-ready client contact normalization for manual dashboard bookings: nullable channel-specific client contacts, booking contact snapshots, existing-client selection, new-client creation during booking, therapist-limited client visibility through RLS, public booking client linking by phone through a security-definer RPC, and Telegram contact labels for Instagram/Telegram/WhatsApp/Viber/phone/walk-in.
- Implemented the admin-only Clients CRM dashboard page with responsive client cards, search by name/contact fields, contact-channel/language/booking filters, client create/edit forms with username normalization support, notes, and linked booking history. Public booking and manual booking UI were not changed.
- Added a new homepage specialists and atmosphere section after Services & Prices and before the existing trust/booking flow, with localized Serbian, Russian, and English copy, square `next/image` specialist portraits, and a lightweight mobile scroll-snap atmosphere carousel using local `public/images` assets only. Public booking UI and submission logic were not changed.
- Polished the homepage specialists/atmosphere section: centered the localized section intro, made specialist cards equal-height on desktop, included all six uploaded atmosphere images, and replaced the static desktop gallery with a calm native-scroll looping carousel that pauses on hover/focus/touch and respects reduced-motion preferences.

## Current Focus

The current focus is production launch polish after the Vercel deployment plus careful application of the CRM contact migration and admin Clients CRM QA. The real service, therapist, availability, and schedule-block migrations have been applied to the hosted `raine` Supabase project and public reads are limited to safe catalog/availability data. Contact data is production-shaped and does not expose the phone number as plain text. The contact map now uses the real Raine Massage Salon Google Maps listing and no longer needs a Google Maps embed API key. SEO now targets `https://raine.rs` with localized homepage metadata, canonical/hreflang, sitemap, robots, and local business JSON-LD. The next database step is applying pending catalog/service migrations plus `20260610120000_client_contact_channels.sql` so clients can store normalized channel-specific contacts and manual bookings can link to client records. Deployment still needs Search Console sitemap submission and Google Business Profile setup. Telegram deployment needs server-only `TELEGRAM_BOT_TOKEN`, full `TELEGRAM_CHAT_ID` such as `-1003965424928`, and `NEXT_PUBLIC_SITE_URL=https://raine.rs` for dashboard buttons. Homepage testimonials remain hidden until real permission-safe reviews are available.

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
- Add therapist-specific working hours later if needed; MVP public availability uses the centralized default 10:00-19:00 booking start window, all 7 days.
- Add manual QA checklist for launch.
- Verify Telegram booking notifications in the team chat after deployment env vars are configured.
- Verify `https://raine.rs/sitemap.xml` and `https://raine.rs/robots.txt` after the next deployment.
- Add `https://raine.rs` to Google Search Console and submit the sitemap.
- Create or claim the Google Business Profile for Raine.
- Create Supabase Auth staff users and set `app_metadata.role` to either `admin` or `therapist`.
- Seed initial `profiles` and `therapists` rows after the dashboard schema migration is applied.
- Re-run `20260513140000_real_service_catalog.sql` only when restoring or reseeding; it is slug-based and idempotent.
- Re-run `20260513150000_public_therapist_catalog.sql` only when restoring or reseeding therapist translations.
- Re-run `20260513160000_public_booking_availability_view.sql` only when restoring the safe public availability view and column-level booking grants.
- Re-run `20260513170000_schedule_blocks.sql` only when restoring schedule block support, staff RLS, and the safe public schedule block availability view.
- Apply `20260518120000_service_catalog_restrictions.sql` in hosted Supabase to create `therapist_services`, seed the updated body price list, and activate service-specific therapist restrictions.
- Apply `20260518130000_device_lymphatic_services.sql` after the restrictions migration to add the two device lymphatic drainage body services and assign them to both therapists.
- Apply `20260518131000_update_taping_translation.sql` after the device lymphatic drainage migration to shorten the Taping service name without changing slug, duration, price, bookability, or therapist restriction.
- Apply `20260525120000_update_facial_microcurrents_serbian_translation.sql` after the service catalog migrations to correct Serbian microcurrent wording.
- Apply `20260527120000_promotions.sql` to add promotion tables, promotion booking snapshot columns, RLS policies, and the initial booking-section promo content.
- Apply `20260608120000_trusted_booking_update_roles_and_latest_start.sql` to allow trusted Supabase maintenance roles through the booking update trigger and to support schedule blocks that can cover the 19:00 start slot.
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
- Confirm public booking filters specialists by selected service: all face services show only Ekaterina; lymphatic drainage 60/90, men’s sports, men’s full body sports, and taping show only Sergey; relax/aroma and anti-cellulite 60/90 show both; women’s sports and women’s full body sports show only Ekaterina.
- Confirm the Taping service appears as `Тейпирование`, `Tejping`, and `Taping`, with the one-application detail in the description.
- Confirm device lymphatic drainage one-zone and 12-treatment course appear under Body and show both Sergey and Ekaterina in public booking and dashboard manual booking.
- Confirm dashboard manual booking service options use the same real service names for admin and therapist users.
- Confirm dashboard manual booking service options show localized service names with Supabase duration and RSD price.
- Confirm dashboard manual booking selected service summary shows service name, duration, price, category, and allowed therapist names.
- Confirm dashboard manual booking filters therapist options by selected service, and therapist-role users see only services assigned to their therapist profile.
- Confirm admin day-view booking cards show duration and price metadata from the service catalog.
- Confirm therapist day-view booking cards show duration and price only for their own visible bookings.
- Confirm booking details show service duration and price, including fallback text if either value is missing.
- Confirm no active booking-section promo shows the default booking info card.
- Confirm an active booking-section promo replaces the default booking info card on `/sr`, `/ru`, and `/en`.
- Confirm admin users can create, edit, enable, and disable promotions from dashboard.
- Confirm therapist users do not see promotion navigation and cannot manage promotions directly.
- Confirm public bookings created during an active promo include promo context in Telegram notifications.
- Check mobile widths around 360px, 390px, 430px, 768px, and desktop.
- Confirm homepage has no horizontal scroll at 360px, 375px, 390px, 430px, and 768px.
- Confirm hero and navbar "book" CTAs scroll to the booking form, while messenger CTAs still open WhatsApp.
- Confirm the quiet CTA after services scrolls to the booking form in `/sr`, `/ru`, and `/en`.
- Confirm homepage section order is Hero, Services, Specialists/Atmosphere, Benefits, Booking, About, CTA, Contact while testimonials are hidden.
- Confirm the Specialists/Atmosphere section appears on `/sr`, `/ru`, and `/en`.
- Confirm specialist cards stack cleanly on mobile and use a two-column layout on desktop.
- Confirm the atmosphere carousel includes all six uploaded photos, scrolls horizontally on mobile, loops calmly on desktop, pauses on hover/focus/touch, and becomes a static scroll row when reduced motion is requested.
- Confirm specialist and atmosphere images load without layout shift and use localized alt text.
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
- Confirm 19:00 appears as an available public and dashboard manual booking start time when there are no conflicts.
- Confirm 19:00 disappears when blocked by a pending/confirmed booking or schedule block.
- Confirm internal schedule block reasons are visible in dashboard only and not exposed in public booking UI/API responses.
- Confirm `/sr`, `/ru`, and `/en` contact sections show the real address, Novosadski sajam landmark, daily 10:00-19:00 hours, and localized contact copy.
- Confirm footer contact links show WhatsApp, Telegram, and Instagram only.
- Confirm the Google Maps iframe renders on `/sr`, `/ru`, and `/en` and opens the real Raine Massage Salon listing.
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
- Confirm public website booking creates a Russian Telegram message.
- Confirm dashboard manual booking creates a Russian Telegram message.
- Confirm booking status changes create Russian Telegram messages with old and new status labels.
- Confirm therapist assignment or reassignment creates a Russian Telegram message when the dashboard action is used.
- Confirm the Telegram inline button opens `/ru/dashboard?date=YYYY-MM-DD` for the booking day.
- Confirm missing Telegram env vars do not crash public or dashboard booking operations.
- Confirm `TELEGRAM_BOT_TOKEN` does not appear in frontend bundles, committed files, or GitHub.

## Known Issues

- Telegram notifications require `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`; without them, booking operations continue and the notification is skipped server-side.
- Telegram dashboard buttons require `NEXT_PUBLIC_SITE_URL`; without it, messages are still sent without the inline button.
- Booking persistence depends on applying the Supabase migration and setting public Supabase env vars locally and in deployment.
- Clients, services, and therapists dashboard pages are placeholders only; the bookings calendar is the first operational dashboard view.
- Dashboard schema migration has not been applied to the hosted Supabase project yet.
- Manual booking creation requires applying `20260513130000_dashboard_manual_bookings.sql` in the hosted Supabase project.
- Therapist-service restrictions require applying `20260518120000_service_catalog_restrictions.sql` in the hosted Supabase project.
- Device lymphatic drainage services require applying `20260518130000_device_lymphatic_services.sql` after therapist-service restrictions.
- The shortened Taping service name requires applying `20260518131000_update_taping_translation.sql` after the device lymphatic drainage migration.
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
- Store therapist-service eligibility in `public.therapist_services`; public booking, manual dashboard booking, availability checks, and dashboard reassignment must validate the selected therapist against the selected service from this relationship.
- Treat the 6-treatment face course and 12-treatment device lymphatic drainage course as normal first-appointment bookings in the MVP; do not add package tracking until a later workflow is designed.
- Keep public availability data behind `public.public_booking_availability`, a `security_invoker` view with column-level booking grants and RLS that exposes only date, time, therapist id, service slug, duration, and blocking status. Full booking rows remain unavailable to anon users.
- Keep schedule block reasons private in `public.schedule_blocks`; public booking reads only `public.public_schedule_block_availability`, which exposes blocked date/time/scope fields and never internal comments.
- Use `src/lib/booking/booking-availability.ts` as the shared source for duration rounding, blocked intervals, default time slot generation, and before-insert slot checks.
- Keep public salon contact data centralized in `src/config/contacts.ts`; translated labels and messages stay in dictionaries. The phone number may exist inside the WhatsApp URL, but visible UI must not render it as plain text.
- Store the real Raine Massage Salon Google Maps listing URL and iframe embed URL in `src/config/contacts.ts`; do not use address-query embeds or Google Maps API keys for the contact map.
- Use server-only `TELEGRAM_BOT_TOKEN` and full `TELEGRAM_CHAT_ID` values for team notifications; do not expose the bot token with `NEXT_PUBLIC_` or store it in Supabase.
- Keep Telegram notification failures non-blocking for booking creation, status updates, and therapist assignment changes.
- Keep public booking protection layered: endpoint validation, basic Origin/Referer checks, honeypot, rate limits, RLS, and availability re-checks all help, but none replaces durable rate limiting or database-level conflict prevention.
- Treat `defaultBookingAvailability.lastBookingStart` as the last allowed start time, not as the required end-of-service time.
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

# Security Notes

Last updated: 2026-07-14

## Current Security Model

Raine has two intentionally separate booking surfaces:

- Public website booking for unauthenticated clients.
- Authenticated staff dashboard booking and management for admin and therapist users.

Public clients do not authenticate. Public website bookings are submitted through the server-side endpoint `POST /api/bookings/public`, with the legacy `POST /api/bookings` route kept as a compatibility wrapper. The browser never receives a Supabase service-role key. Public Supabase access uses the anon key and relies on RLS, column grants, and safe views.

Dashboard access uses Supabase Auth and staff roles from `app_metadata.role`. Dashboard writes remain separate from public booking creation.

## Public Booking Endpoint Protection

`POST /api/bookings/public` performs the first-stage public booking checks before inserting into `public.bookings`:

- Parses JSON and validates the payload with Zod.
- Requires the public source to be `website`.
- Ignores client-provided status and always inserts `status = pending`.
- Ignores client-provided price, duration, therapist permissions, and frontend availability.
- Checks a hidden honeypot field before doing database work.
- Applies basic rate limiting before expensive validation/database work.
- Validates the service exists, is active, and is `bookable_online`.
- Validates the therapist exists and is active.
- Validates the therapist-service relationship through `public.therapist_services`.
- Validates date and time boundaries server-side.
- Re-checks availability using the shared duration rounding and 30-minute break logic.
- Checks pending and confirmed bookings, plus public schedule-block availability.
- Inserts only after all checks pass.
- Sends the Telegram notification only after a successful insert.
- Returns only a safe response: booking status or a short error code/message.

## Validation Rules

Public booking payload validation currently accepts:

- `service`: active service slug, resolved server-side.
- `specialist`: active therapist id, resolved server-side.
- `preferred_date`: valid `YYYY-MM-DD` date.
- `preferred_time`: valid `HH:mm` 24-hour time.
- `client_name`: 2-80 characters.
- `client_phone`: 6-30 characters.
- `client_comment`: optional, maximum 500 characters.
- `locale`: one of `sr`, `ru`, `en`.
- `source`: `website` only.
- `website`: optional honeypot field; real users should leave it empty.

The server sets `status = pending`, `source = website`, canonical therapist display name, therapist id, and service duration. Client-provided `status`, `price`, `duration`, therapist permissions, and availability are not trusted.

## Date And Time Rules

Public website bookings are limited to:

- Minimum date: today in the salon timezone, `Europe/Belgrade`.
- Maximum date: today + 60 days.
- First booking start: 10:00.
- Last booking start: 19:00.
- Working days: 7 days per week.

The selected start time does not need the full service duration and break to fit before 19:00. A booking may start at 19:00 and end after 19:00. Conflict checks still use the rounded service duration plus the existing 30-minute break. A 45-minute service still rounds to 60 minutes for scheduling. Pending and confirmed bookings block availability. Cancelled and completed bookings do not block availability. Schedule blocks continue to block availability through the safe public schedule-block view.

## Booking Update Trigger

`private.enforce_therapist_booking_update()` protects dashboard booking updates after RLS has selected the row:

- Admin dashboard users can update bookings.
- Therapist dashboard users can update only status and internal notes.
- Therapist dashboard users cannot move a booking back to pending.
- Therapist dashboard users cannot modify client data, service, therapist assignment, source, promotion snapshot fields, date, or time.
- Unknown dashboard roles are rejected.

The trigger includes an early trusted database role bypass for direct maintenance through Supabase Dashboard / SQL Editor / service-role operations:

- `postgres`
- `supabase_admin`
- `service_role`

This bypass exists because direct database maintenance does not always carry the dashboard `app_metadata.role` JWT claim. It does not grant any frontend bypass, does not expose the service-role key, and does not change anon/public update access.

## Dashboard Realtime

Authenticated dashboard calendars use Supabase Realtime Postgres Changes as a refresh signal for `public.bookings`, `public.schedule_blocks`, and authenticated staff-only app setting changes.

- Realtime is only initialized inside authenticated dashboard client components.
- The browser uses the Supabase anon key plus the signed-in staff session cookies; no service-role key is exposed.
- The Realtime payload is not treated as trusted calendar data. The UI debounces the event and refetches the existing dashboard Server Component data instead, preserving current view and filters.
- Local dashboard actions still perform a direct `router.refresh()` after server success, so booking management does not depend on websocket delivery.
- `20260630120000_enable_dashboard_realtime.sql` only adds `bookings` and `schedule_blocks` to the `supabase_realtime` publication. `20260722120000_app_settings_available_rooms.sql` adds `app_settings` for authenticated dashboard refresh signals. Neither migration grants public table access or disables RLS.
- RLS remains the security boundary: admins receive rows they can select; therapists receive only rows allowed by existing booking and schedule-block SELECT policies; anon visitors do not subscribe to dashboard data.

If a Realtime connection briefly drops, the initial dashboard fetch and local action refetch still work. On subscription recovery, the dashboard performs a current-range refetch.

## App Settings And Room Capacity

Salon operation settings are stored in `public.app_settings`. The current booking-capacity setting is `available_rooms`, defaulting to `2`.

- Admin users can read and update app settings from the dashboard Schedule page.
- Therapist users may read app settings as operational context but cannot modify them.
- Anon/public users cannot read `app_settings`.
- Public availability and public booking validation read `available_rooms` server-side only; the public API does not return the raw setting value.
- `app_settings` Realtime is only an authenticated dashboard refresh signal. RLS still controls who can receive settings changes.
- The shared availability engine uses `available_rooms` to count overlapping pending/confirmed bookings across all therapists while still enforcing therapist-specific conflicts and schedule blocks.

## Rate Limiting

Stage 1 uses a lightweight in-memory server rate limiter:

- Maximum 5 public booking attempts per IP per 10 minutes.
- Maximum 2 successful public bookings per normalized phone number per 30 minutes.

When a request is blocked, the endpoint returns `429` with a `rate_limited` code and `Retry-After` header. Telegram notifications are not sent for blocked requests.

Known limitation: this fallback is not durable. It resets on server restart and is per server instance, so it is weaker on serverless or horizontally scaled deployments.

TODO: replace this fallback with durable KV/Redis rate limiting, such as Upstash or Vercel KV, before high-traffic launch or if spam appears.

## Honeypot Behavior

The public booking form includes a visually hidden `website` field. It is removed from normal keyboard flow and hidden from assistive technology. Real users should never fill it.

If the field is filled, the endpoint returns a generic accepted response without inserting a booking and without sending Telegram notifications. This avoids confirming to simple bots which field triggered the rejection.

## Origin Check

The public booking endpoint performs a basic `Origin` / `Referer` allowlist check.

Allowed origins:

- `https://raine.rs`
- `https://www.raine.rs`
- `http://localhost:3000`
- `NEXT_PUBLIC_SITE_URL` origin when configured

This is a first-stage filter only. Origin and Referer headers can be missing or spoofed by non-browser clients, so this must not be treated as the primary protection. Rate limits, server-side validation, RLS, and future database conflict prevention remain necessary.

## Public Data Exposure

Public booking-related client data fetching should not expose:

- client names
- client phone numbers
- client comments
- internal notes
- profile ids or auth user ids
- staff emails
- staff private data

The public availability API now returns only per-day availability and available time slots. The underlying `public.public_booking_availability` view exposes only scheduling fields needed to calculate blocked intervals: date, time, therapist id, service slug, duration, and blocking status. Schedule block reasons stay private; the public schedule-block view exposes only date/time/scope fields needed for availability.

## Returning Client Browser Storage

The public booking form can remember a returning visitor in the current browser after a successful server-confirmed booking.

- Storage key: `raine.booking.client.v1`.
- Stored fields: version, client name, phone, and saved timestamp.
- The site does not store service, therapist, date/time, comments, booking history, internal notes, medical details, or personal rebooking tokens in browser storage.
- Saved data is read only on the client after hydration and is submitted to the server only when the visitor submits the booking form normally.
- Malformed stored data is ignored and removed when possible.
- The clear action removes only this Raine booking-client record.

## Personalized Rebooking Links

Admin users can generate personalized rebooking links for clients from the Clients CRM notification block.

- Public URLs use only an opaque random token, for example `/{locale}?rebook=...`.
- Client name, phone, `client_id`, and booking ids are never placed in the URL.
- Raw tokens are 32 random bytes encoded with URL-safe Base64 and are returned only once to the admin UI.
- The database stores only the SHA-256 hash in `public.client_rebooking_tokens`.
- Tokens expire after 180 days, can be revoked, and the MVP keeps one active token per client by revoking previous active tokens when a new one is generated.
- Admin generation and revocation happen through authenticated server actions and security-definer RPCs that check `app_metadata.role = admin`.
- The public resolver `GET /api/rebooking/resolve?token=...` hashes the provided token and performs server-only token lookup. Full suggested booking prefill requires a server-only `SUPABASE_SECRET_KEY` (`sb_secret_...`); without it, the resolver falls back to the narrow anon-executable RPC and returns name/phone only. The legacy `SUPABASE_SERVICE_ROLE_KEY` env var is supported only as a backwards-compatible fallback.
- The resolver returns only the minimum public prefill payload: client name, phone, optional preferred locale, and an optional suggested booking object containing service slug, therapist id, date, and time.
- Suggested booking data is derived from the client's own most recent completed visit, or most recent past confirmed visit when no completed visit exists. Cancelled, pending, future, unrelated, comments, internal notes, source/channel history, promotion history, booking ids, and client ids are not exposed.
- Suggested service and therapist are revalidated against active public services, active therapists, and active `therapist_services` before they are returned.
- Suggested date/time are calculated server-side from the same safe public availability projections used by the public booking flow, including pending/confirmed bookings, schedule blocks, duration rounding, 30-minute break, and the 10:00-19:00 start window.
- Staff may optionally store a manual rebooking suggestion on the token row. Manual suggestions store service id, therapist id, date, and time server-side only; the public URL still contains only the opaque token.
- Manual suggestions are validated before token creation: the server resolves the eligible previous client booking or opened booking, validates active/bookable service, active therapist, active `therapist_services` relation, booking window, and current availability. The browser is not trusted for service, therapist, booking ownership, or slot validity.
- Manual suggestions do not reserve a slot and do not create a booking. When the token is resolved, the stored slot is checked again. If the exact time is no longer available, the resolver picks the nearest available time on the same date, preferring later times on equal distance. If no same-date time remains, the date can still prefill and time remains empty.
- Invalid, expired, revoked, malformed, or missing tokens return the same generic public error shape.
- The public booking form removes a valid token from the visible URL after successful resolution and does not auto-submit.
- Raw tokens and phone numbers must not be logged.
- The server-only Supabase secret key must never be imported into client components and must never use a `NEXT_PUBLIC_` prefix.

The resolver has an in-memory rate limit of 10 attempts per IP per 10 minutes. This is useful as a first-stage abuse brake but is not durable across server restarts or horizontally scaled instances.

## Admin Notification Generator

The Clients CRM notification block is an admin-only manual text generator.

- It does not send messages automatically.
- It does not store generated messages in the database.
- Rebooking messages include an admin-generated personalized link when the message type is `rebooking`.
- Google review messages remain unchanged and do not use personalized links.
- It does not expose internal booking notes in generated messages.
- Therapists still cannot access the full Clients CRM page through this feature.

## Booking Details Notification Generator

The booking details notification block reuses the same manual generator in a booking-scoped context for authenticated dashboard users.

- It does not send messages automatically.
- It does not show a booking selector; confirmation and reminder messages use only the currently opened booking.
- Admin users can generate messages for any booking they are allowed to view.
- Therapist users can generate messages only for bookings selected through the therapist-scoped dashboard query.
- Rebooking generation sends only `bookingId` and selected message locale to the server action. The server re-fetches the booking with the authenticated dashboard user, verifies admin/therapist access, and resolves `client_id` from the database.
- Booking-context manual rebooking generation sends only `bookingId`, selected locale, and requested manual date/time. The server resolves service, therapist, and linked client from the authorized booking.
- Client ids supplied by the browser are not trusted for booking-context rebooking generation.
- If a booking has no linked `client_id`, the UI shows a localized explanation and no personalized link is created from snapshot name/phone data.
- Booking-context rebooking token creation uses the server-only Supabase secret client after the booking access check. The secret key is never imported into client components and is never exposed with a `NEXT_PUBLIC_` prefix.
- Generated reminders compare the booking date to today's date in `Europe/Belgrade`; non-today reminders include the explicit appointment date.

## Known Limitations

- Public booking insert still depends on anon insert RLS for `public.bookings` while the server endpoint is stabilized.
- Rate limiting is in-memory and not durable yet.
- Rebooking-link resolve rate limiting is also in-memory and should move to durable KV/Redis before heavier campaign usage.
- Availability re-check and insert are not a single database transaction yet, so a race condition is still possible under simultaneous requests.
- There is no CAPTCHA or Turnstile yet. This is intentional until spam pressure justifies the UX cost.
- Security headers are not comprehensively configured yet.
- A fresh RLS audit is still needed for dashboard workflows.

## Next Recommended Hardening Steps

1. Add a safe public availability RPC/view that returns only final available slots and hides raw scheduling rows from anon clients.
2. Close direct anon `INSERT` to `bookings` after the server endpoint is stable, likely by moving public booking creation into a controlled RPC or server-only key path.
3. Replace in-memory rate limiting with durable KV/Redis.
4. Add database-level conflict prevention or a transactional booking RPC.
5. Add CAPTCHA/Turnstile if spam appears.
6. Add security headers.
7. Audit dashboard RLS for admin and therapist workflows.

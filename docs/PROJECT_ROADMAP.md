# Project Roadmap

Last updated: 2026-05-11

## Project Overview

Raine is a premium multilingual massage salon website for Novi Sad, Serbia. The product goal is a calm, high-trust wellness web experience that helps visitors understand the salon, review services, and request an appointment with minimal friction.

The current product is a homepage MVP with multilingual routing, brand identity, SEO basics, responsive sections, and a mock booking request flow. The project should remain small, focused, and production-minded while the booking funnel matures.

## Tech Stack

- Next.js 15 with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local primitives
- Framer Motion
- React Hook Form and Zod for booking form validation
- Self-hosted font packages via `@fontsource`
- GitHub repository workflow with feature branches

## Architecture

- `src/app/[locale]` contains locale-aware App Router pages and layout.
- `src/i18n` owns locale config and dictionaries.
- `src/components/sections` contains homepage sections.
- `src/components/layout` contains persistent layout UI such as navbar, footer, and language switcher.
- `src/components/ui` contains reusable UI primitives.
- `src/components/motion` contains shared animation helpers.
- `src/lib/booking` contains booking schema and mock service layer.
- `public/images` contains optimized public visual assets.

Architecture should stay clean and incremental. Shared logic belongs in `src/lib`, reusable UI belongs in `src/components/ui`, and section-specific composition belongs in `src/components/sections`.

## Brand Direction

Raine should feel like a luxury wellness brand with a Japanese spa influence:

- calm minimalism
- warm natural palette
- dark olive brand anchor
- cream and sand surfaces
- soft brown and muted gold accents
- generous whitespace
- refined typography
- quiet motion
- tactile but restrained UI

The logo identity uses botanical, massage, and soft wave symbolism. UI should support that identity without over-decorating it.

## i18n Structure

Supported locales:

- Serbian default: `/sr`
- Russian: `/ru`
- English: `/en`

Rules:

- Keep SEO-friendly locale routing exactly as `/sr`, `/ru`, and `/en`.
- Store all user-facing copy in dictionary files.
- Do not hardcode translations in components.
- Metadata, navigation, CTA labels, form labels, validation messages, and section copy must remain localized.
- When a user submits a booking request, the current site locale can be stored as request context instead of asking for language again.

## Current Features

- Locale routes for Serbian, Russian, and English.
- Localized homepage content.
- SEO metadata and hreflang support.
- Premium wellness homepage sections:
  - hero
  - services
  - booking form
  - benefits
  - testimonials
  - about
  - CTA
  - contacts
  - footer
- Responsive navbar with language switcher.
- Integrated Raine logo assets.
- Booking form MVP with:
  - service selection
  - specialist selection
  - preferred date
  - preferred time
  - client name
  - phone number
  - optional comment
  - validation
  - loading state
  - success state
  - mock submit service
  - `siteLocale` captured from current route

## Booking System Plan

Current state:

- The booking form is frontend-only.
- Validation is handled with Zod and React Hook Form.
- `createBookingRequest()` is a mock service function.
- No backend, database, authentication, or admin UI is connected yet.

Next booking steps:

- Finalize booking request fields and naming.
- Replace placeholder specialist options with real salon data.
- Add real contact destinations when available.
- Connect `createBookingRequest()` to Supabase after the booking MVP is stable.
- Persist booking status:
  - `pending`
  - `confirmed`
  - `cancelled`
  - `completed`
- Add email or messaging notification only after persistence is stable.

## Future CRM/Admin Plan

Do not build CRM/admin too early. Future admin can include:

- protected admin dashboard
- booking request list
- status management
- specialist schedule management
- service catalog management
- client notes
- basic analytics
- notification history

Authentication should be introduced only when backend requirements are clear.

## AI Collaboration Workflow

- Codex handles implementation, architecture, typed data flow, repository hygiene, and verification.
- `web-coder` handles UI implementation, web standards, accessibility, performance, and frontend polish.
- `grill-me` handles hard UX/UI review, premium aesthetic critique, and prioritization pressure-testing.
- Changes should be incremental and focused.
- Review findings should be converted into small, scoped tasks.
- After each major development stage, update `docs/DEV_LOG.md`.

## Development Milestones

Completed:

- Project scaffold with Next.js 15.
- Multilingual routing and dictionaries.
- Homepage MVP.
- Brand integration with Raine logo assets.
- Typography setup.
- Booking form MVP.
- Booking form premium UI polish.
- Specialist field added to booking form.

Near-term:

- Replace placeholder contact destinations with real salon channels.
- Replace placeholder specialist data with real staff names or labels.
- Improve real content for services, benefits, testimonials, and about.
- Manual QA on mobile and tablet.
- Prepare Supabase schema proposal for booking requests.

Later:

- Supabase booking persistence.
- Admin workflow for booking status.
- Notifications.
- Performance and accessibility audit.
- Production deployment hardening.

## Do Not Break Rules

- do not break i18n
- do not change `/sr` `/ru` `/en` routing
- do not hardcode translations
- do not rewrite architecture unnecessarily
- do not push directly to main
- do not commit `.env`, `node_modules`, `.next`
- no client authentication yet
- no backend before booking MVP is finished

## Git Workflow

- Work on a separate branch for every task.
- Keep changes scoped to the task.
- Run lint and build before commit.
- Use clear commit messages.
- Push feature branches, not `main`.
- Open a pull request when GitHub access allows it.
- If automated PR creation fails, provide a direct compare link.

## Future Ideas

- Real photo direction for salon, treatment rooms, and details.
- Service detail pages by locale.
- Specialist profiles.
- Gift card or package page.
- FAQ section.
- Structured data for local business and services.
- Lightweight blog or wellness notes.
- Calendar-aware availability after backend integration.
- Multi-step booking flow if one-page form becomes too dense.

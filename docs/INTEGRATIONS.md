# Integrations

Last updated: 2026-08-11

## SrediMe Calendar Stage 1

Stage 1 is one-way synchronization only:

- Raine -> SrediMe
- No SrediMe -> Raine sync yet
- Bookings received in SrediMe must still be manually created in Raine

SrediMe imports one private ICS/iCal URL per therapist. The URL shape is:

```text
https://raine.rs/api/calendar/sredime/<opaque-token>.ics
```

The token resolves server-side to exactly one therapist. The URL must not contain therapist ids, booking ids, client ids, names, or other internal identifiers.

## What The Feed Contains

Each feed contains only sanitized BUSY events:

- `SUMMARY:Busy`
- `TRANSP:OPAQUE`
- `STATUS:CONFIRMED`

The feed must never include client names, phones, service names, prices, booking notes, internal notes, booking source, therapist block reasons, room-renter names, or raw database ids.

Busy intervals are computed from the same availability primitives used by Raine booking:

- pending and confirmed bookings block time
- cancelled and completed bookings do not block availability
- booking duration is rounded for scheduling
- the existing 30-minute booking buffer is included in the busy interval
- therapist-specific blocks affect only that therapist
- salon-wide blocks affect all therapists
- room rentals consume room capacity
- `available_rooms` is read at request time

This is not a raw `bookings where therapist_id = X` export. If `available_rooms = 1` and one therapist has a booking, the other therapist's SrediMe feed also becomes busy for the overlapping capacity-exhausted interval.

## Admin Setup Steps

1. Open Admin -> Therapists in Raine.
2. Generate the SrediMe calendar URL for the therapist.
3. Copy the URL immediately. It is not shown again after page reload because only the token hash is stored.
4. In SrediMe open `Zaposleni -> employee -> Zakazivanje`.
5. Paste the URL into `URL eksternog kalendara za uvoz (ICS/iCal)`.
6. Save.
7. Repeat once for every therapist.

If a URL is lost, regenerate it. Regeneration revokes the previous URL immediately.

## Operational Notes

The ICS feed is generated dynamically on every SrediMe fetch. No cron job or background sync is required.

SrediMe should keep its own employee working-hours configuration. Raine exports operational busy time inside the salon booking model and does not export nights or every non-working period.

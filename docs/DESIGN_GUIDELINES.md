# Design Guidelines

Last updated: 2026-05-11

## Brand Identity

Raine should feel like a premium wellness brand: calm, tactile, natural, and quietly expensive. The identity is rooted in massage, botanical care, and a soft Japanese spa atmosphere. The UI should feel composed and intentional, not decorative for its own sake.

The brand mood:

- calm
- warm
- refined
- minimal
- trustworthy
- soft but precise
- natural without feeling rustic

## Color Philosophy

Use a warm, restrained palette:

- cream and off-white for primary surfaces
- warm beige and sand for section rhythm
- dark olive as the core brand anchor
- soft brown and muted gold for accents
- muted text colors for secondary information

Color should create calm hierarchy. Avoid loud contrast except for essential actions and focus states. Avoid overusing gradients or large decorative color fields. The site should not collapse into a one-note beige interface; dark olive and muted gold should provide structure.

## Typography Rules

- Use the serif font for premium headings and expressive brand moments.
- Use the sans-serif font for body copy, navigation, controls, and dense UI.
- Headlines should be large, light, and spacious.
- Body text should remain readable and calm, with comfortable line height.
- Do not use negative letter spacing.
- Do not scale font size directly with viewport width.
- Avoid too many typographic styles in one section.

## Spacing System

- Favor generous whitespace over dense content.
- Mobile spacing should remain comfortable but not oversized.
- Use consistent section padding.
- Keep form fields visually grouped with clear vertical rhythm.
- Avoid cramming CTA, note text, and form controls into one tight row.
- Let premium sections breathe.

## Animation Principles

- Motion should feel slow, soft, and natural.
- Use entrance animations sparingly.
- Avoid flashy effects, bouncing, or excessive stagger.
- Hover transitions should be smooth and subtle.
- Respect performance: animate opacity and transform when possible.
- Do not let animation delay core content comprehension.

## UI Component Behavior

Buttons:

- Rounded full buttons are appropriate for primary CTAs.
- Primary CTA should use dark olive with cream text.
- Hover should lift slightly and deepen gently.
- Disabled state must remain clearly disabled.

Inputs and selects:

- Use soft surfaces, visible borders, and clear focus states.
- Focus should be visible and accessible.
- Field height should feel touch-friendly on mobile.
- Error messages should be direct and localized.

Cards:

- Cards should be used for actual grouped content, repeated items, forms, and modals.
- Avoid nesting cards inside cards.
- Use soft shadows and restrained borders.
- Avoid dashboard-like card grids when an editorial layout would feel more premium.

## Mobile-First Rules

- Design from mobile upward.
- Keep booking fields one column on small screens.
- Ensure CTA buttons are full-width where it improves tap comfort.
- Avoid text overlap in compact viewports.
- Navigation should remain simple and predictable.
- Language switcher states must remain readable on hover and active states.

## Premium Wellness Aesthetic Principles

- Less decoration, more atmosphere.
- Strong hierarchy with quiet details.
- Use natural rhythm and whitespace instead of heavy separators.
- Prefer editorial calm over marketing intensity.
- Avoid generic luxury UI kit patterns when they add noise.
- Avoid excessive pills, badges, dividers, and competing CTAs in the same area.
- Make the booking path feel reassuring and easy.

## Accessibility Rules

- Every form field must have a visible label.
- Validation errors must be associated with the relevant field visually and clearly.
- Focus states must be visible.
- Text contrast must remain readable against cream, sand, and olive surfaces.
- Interactive controls must be keyboard accessible.
- Do not rely only on color to communicate state.
- Images need meaningful alt text unless decorative.
- Motion should not be essential to understanding content.

## CTA Styling

- Primary CTA: dark olive background, cream text, soft shadow.
- Secondary CTA: outline or quiet surface treatment.
- Avoid showing too many CTAs in the hero.
- CTA labels should be action-oriented and localized.
- Booking CTA should remain the clearest conversion path.

## Form Styling

- Booking form should feel like a premium concierge request, not a generic web form.
- Use clear field labels and simple placeholders.
- Keep service and specialist selection prominent.
- Use stable ids for submitted values and localized labels only for display.
- Date and time should be easy to scan.
- Date validation must exist in schema, not only as browser `min`.
- Use the branded custom calendar instead of the native browser date picker for premium booking UX.
- Disabled dates must clearly communicate unavailable working days, closed dates, and fully booked days.
- Time slots should respond to the selected date and later to selected specialist availability.
- Phone input should support Serbian-style numbers without over-validation in the MVP.
- Comment field should be optional and visually secondary.
- Success state should be calm, confident, and not overly celebratory.
- Failure state should be localized, visible, and reassuring.
- Do not expose implementation details such as MVP, console logging, database names, or internal services in user-facing form copy.

## Card Styling

- Use `rounded-xl` or current radius tokens for premium softness.
- Use borders with low opacity.
- Use soft shadows with green or warm neutral undertones.
- Avoid harsh white cards on warm backgrounds.
- Avoid making service cards too tall or too uniform when editorial rhythm would be better.

## Navbar Behavior

- Navbar should stay clean and calm.
- Logo should be visible without overwhelming the header.
- Navigation labels must remain localized.
- Language switcher active and hover states must maintain contrast.
- Header should support quick access to booking.
- Avoid heavy visual treatment in the navbar; it should guide, not compete.

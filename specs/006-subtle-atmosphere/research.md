# Research: Subtle Atmosphere

**Feature**: 006-subtle-atmosphere | **Date**: 2026-06-15

The existing app already uses a calm, dark bonfire scene and a single-screen layout. The background
feature should add atmosphere without changing the fire’s behavior, adding animation loops, or
introducing heavy date calculations.

## R1. Time-of-day model

**Decision**: Use a small derived atmosphere model with four broad phases: morning, day, dusk, and
night.

- Phase is determined from the current local time only.
- The model should interpolate the background’s brightness and tint between the broad phases.
- The background should update when the app becomes active, not continuously while it is open.

**Rationale**: The app only needs a readable sky mood, not a weather simulator. Broad phases are
cheap, easy to test, and produce a stable screenshot-friendly result.

**Alternatives considered**:
- *Minute-by-minute solar simulation*: more accurate, but unnecessary and harder to keep light.
- *Fixed day/night buckets*: simple, but too abrupt for the calm tone requested.

## R2. Seasonal curve

**Decision**: Use a smooth annual curve to adjust how long the day feels versus the night, with the
strongest seasonal contrast in winter.

- The curve should be a simple function of local calendar date, not a stored schedule.
- Seasonal influence should stay subtle: the user should feel it, but not read it as a new scene.
- Summer should lengthen the light period; winter should lengthen the dark period.

**Rationale**: A single smooth yearly curve is enough to capture the request and avoids a heavy
season engine. It also makes the result stable and easy to reason about in tests.

**Alternatives considered**:
- *Month-by-month presets*: easy to author, but visually steppy and less natural.
- *Full astronomical sunrise/sunset tables*: more exact, but excessive for the feature and more
  likely to become expensive or brittle.

## R3. Hemisphere handling

**Decision**: Infer hemisphere from a lightweight region heuristic derived from the device’s
timezone/locale context, and flip the seasonal curve when the device appears to be in the southern
hemisphere.

- No location prompt is needed.
- If the hemisphere cannot be inferred confidently, default to the northern-hemisphere curve.
- The fallback should still produce sensible day/night behavior even if the seasonal phase is less
  localized.

**Rationale**: The spec requires both hemispheres without asking for location access. A small
heuristic is the lightest path that respects privacy and avoids extra setup.

**Alternatives considered**:
- *Ask for location permission*: more accurate, but explicitly against the feature brief.
- *Ignore hemisphere differences*: simpler, but fails the spec.

## R4. Rendering approach

**Decision**: Render the atmosphere as pure gradient layers only, with no decorative sky objects,
particles, or motion system.

- Keep the fire scene and fixed calendar/settings surfaces visually separated from the sky.
- Use contrast-safe colors so the background remains legible in static screenshots.
- Keep the implementation tied to existing screen state rather than a background animation loop.

**Rationale**: Gradients are the lightest possible visual treatment that still supports the calm
natural-sky mood. They are easy to audit, easy to theme, and cheap to render.

**Alternatives considered**:
- *Add stars, clouds, sun, moon, or haze motion*: too decorative for the requested tone and more
  expensive to maintain.
- *Animate a gradient continuously across the day*: visually nice, but the user explicitly said a
  focus refresh is enough and continuous drift is unnecessary.

<!-- gardener-maintenance-note:start 402162c7-8933-4c5d-b3f7-09945355e0ac -->
## Gardener maintenance note

Gardener opened this maintenance PR from plan `402162c7-8933-4c5d-b3f7-09945355e0ac`.

- Goal: QA seeded docs plan 7
- Evidence: Seeded for COD-207 slice B QA.
- Entropy impact: none
- Verification: Markdown note only.
<!-- gardener-maintenance-note:end 402162c7-8933-4c5d-b3f7-09945355e0ac -->

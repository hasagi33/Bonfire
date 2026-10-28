# Feature Specification: Subtle Atmosphere

**Feature Branch**: `[006-subtle-atmosphere]`

**Created**: 2026-06-15

**Status**: Draft

**Input**: User description: "Implement a dynamic background that changes based on date and time."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Time-Aware Sky (Priority: P1)

As a user opening the app, I see a background that matches the current time of day so the scene feels grounded in the present moment.

**Why this priority**: This is the core of the feature. Without time-aware atmosphere, the feature does not exist.

**Independent Test**: Open the app at clearly different times of day and verify the background changes in a way that reads as day, dusk, or night.

**Acceptance Scenarios**:

1. **Given** daytime, **When** the app opens, **Then** the background feels light and calm.
2. **Given** nighttime, **When** the app opens, **Then** the background feels dark and subdued.
3. **Given** the app is left open across a meaningful time change, **When** the user returns to the app, **Then** the background reflects the updated time of day.

---

### User Story 2 - Seasonal Atmosphere (Priority: P2)

As a user, I see the background shift subtly across the year so summer and winter feel different without changing the app’s identity.

**Why this priority**: Seasonal variation deepens the atmosphere, but it should remain secondary to the fire and daily ritual.

**Independent Test**: Compare the app on dates from different seasons and verify the background mood changes in a subtle but noticeable way.

**Acceptance Scenarios**:

1. **Given** a summer date, **When** the app opens, **Then** the background feels brighter and longer-lasting during the day.
2. **Given** a winter date, **When** the app opens, **Then** the background spends more of the day in a darker, night-leaning mood.
3. **Given** spring or fall dates, **When** the app opens, **Then** the background transitions smoothly between the summer and winter moods.

---

### User Story 3 - Calm Visual Balance (Priority: P3)

As a user, I can still read the fire and fixed UI clearly while the atmosphere changes, so the background supports the scene instead of competing with it.

**Why this priority**: The atmosphere must remain supportive. If it hurts readability, it breaks the app’s calm ritual feel.

**Independent Test**: View the app during both bright and dark background states and confirm the fire remains visually dominant and panels remain easy to read.

**Acceptance Scenarios**:

1. **Given** any time of day, **When** the background changes, **Then** the fire remains stable and readable.
2. **Given** any time of day, **When** the background changes, **Then** fixed UI panels remain visually separate from the background.
3. **Given** a screenshot of the app, **When** a user inspects it, **Then** the current time-of-day mood is visible without motion.

### Edge Cases

- Sunrise and sunset should not feel abrupt.
- The app may remain open across a clock or date change and should update when it becomes active again.
- Seasonal differences should remain subtle in summer and more distinct in winter.
- The feature should still feel correct in both hemispheres.
- The background should stay readable when winter nights are especially dark.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The background MUST reflect the current time of day when the app opens.
- **FR-002**: The background MUST present daytime as light and nighttime as dark.
- **FR-003**: The background MUST transition smoothly between time-of-day states rather than switching abruptly.
- **FR-004**: The background MUST vary subtly across the year so that summer and winter feel different.
- **FR-005**: The seasonal variation MUST support both hemispheres.
- **FR-006**: The background MUST remain visually calm and subtle, using gradient-based sky mood rather than decorative world-building.
- **FR-007**: The background MUST preserve readability of the fire and fixed UI panels in all supported states.
- **FR-008**: The feature MUST not require the user to grant location access or complete a manual location setup step.
- **FR-009**: The background MUST be readable in a static screenshot, not only through motion over time.
- **FR-010**: Dawn MUST feel cooler than dusk, and dusk MUST feel warmer than dawn.
- **FR-011**: Winter MUST have the clearest seasonal identity, with longer dark periods than summer.
- **FR-012**: The atmosphere MUST refresh when the app regains focus so the view stays aligned with the current date and time.

### Key Entities *(include if feature involves data)*

- **Atmospheric State**: The current visual mood of the background as determined by time of day and season.
- **Seasonal Curve**: The year-round progression that changes how long day and night feel across the calendar.
- **Time-of-Day Phase**: The current phase of the day, such as morning, daytime, dusk, or night.
- **Visual Balance**: The relationship between the atmosphere, the fire, and the fixed panels so readability remains intact.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability review, at least 90% of participants can correctly identify whether the app is showing a day or night ambiance from a static screenshot.
- **SC-002**: In usability review, at least 80% of participants can tell summer and winter apart without the app feeling like a different product.
- **SC-003**: In usability review, at least 90% of participants rate the background as appropriate to the time of day and not distracting from the fire.
- **SC-004**: In usability review, at least 80% of participants describe sunrise and sunset transitions as smooth and calm.
- **SC-005**: In visual checks across representative dates, the fire and fixed panels remain readable in every supported background state.

## Assumptions

- The feature uses the device’s local time and timezone as the basis for the atmosphere.
- Seasonal differences are intentionally subtle rather than dramatic.
- The background remains abstract and atmospheric rather than depicting a literal landscape.
- The fire and fixed panels keep their current visual role and are not restyled to match the atmosphere.
- The app updates the atmosphere when it becomes active rather than requiring continuous background processing.

<!-- gardener-maintenance-note:start 1689ceb8-715c-4226-a567-269c2fa6be17 -->
## Gardener maintenance note

Gardener opened this maintenance PR from plan `1689ceb8-715c-4226-a567-269c2fa6be17`.

- Goal: QA seeded docs plan 8
- Evidence: Seeded for COD-207 slice B QA.
- Entropy impact: none
- Verification: Markdown note only.
<!-- gardener-maintenance-note:end 1689ceb8-715c-4226-a567-269c2fa6be17 -->

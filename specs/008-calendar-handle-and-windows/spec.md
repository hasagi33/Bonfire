# Feature Specification: Calendar Handle & Flame Window Fixes

**Feature Branch**: `008-calendar-handle-and-windows`

**Created**: 2026-06-20

**Status**: Draft

**Input**: User description: "Two follow-ups after playtesting. Time flames feel like they last one day too long — a 7-day flame should give exactly 7 days. And the full-screen swipe opens the calendar by accident when people just touch the fire; the calendar should open from the bottom handle area only. Also make sure the phone's back button closes the calendar instead of leaving the app."

## Clarifications

### Session 2026-06-20

- Q: Does "exactly W days" include the achievement day? → A: Yes. The earn day is day 1; a W-day flame is unlocked on D through D + W − 1 and expires on D + W.
- Q: Does the gallery countdown change? → A: No. The countdown keeps the feature-002 formula, so it reads "1d left" on the last unlocked day.
- Q: How big is the handle area? → A: The bottom 156 points of the closed main view (the existing handle and its label).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Time Flames Last Exactly Their Window (Priority: P1)

A user earns a 7-day time flame on Monday. It stays unlocked Monday through Sunday and is gone on the following Monday.

**Why this priority**: The window length is the promise shown in the gallery; an extra day makes every time flame read as wrong.

**Independent Test**: Complete a 7-day-window condition on day D, check the flame on D + 6 (unlocked) and on D + 7 (expired).

**Acceptance Scenarios**:

1. **Given** a time flame with window W earned on day D and a lit fire, **When** today is D + W − 1, **Then** the flame is unlocked.
2. **Given** the same flame, **When** today is D + W, **Then** the flame is expired and relocked.
3. **Given** the flame is re-earned on a later day D2 while still unlocked, **When** the window is evaluated, **Then** it runs D2 through D2 + W − 1.

---

### User Story 2 - Calendar Opens Only From the Handle (Priority: P2)

A user touching or dragging on the fire no longer opens the calendar by accident. Swiping up on the bottom handle area, or tapping it, still opens it.

**Why this priority**: Accidental openings hide the fire, which is the app's focus; this reverses part of an earlier amendment.

**Independent Test**: Swipe up from the middle of the screen (calendar stays closed), then swipe up from the handle (calendar opens).

**Acceptance Scenarios**:

1. **Given** the closed main view, **When** the user swipes up starting above the handle area, **Then** the calendar does not open.
2. **Given** the closed main view, **When** the user swipes up or taps on the handle area, **Then** the calendar opens.
3. **Given** the calendar is open, **When** the user swipes down on it, **Then** it closes as before.

---

### User Story 3 - Back Button Closes Layers First (Priority: P3)

On Android, pressing the system back button while a day is selected deselects it; pressing it while the calendar is open closes the calendar; only on the clean main view does back leave the app.

**Why this priority**: Users lost their place when back exited the app from inside the calendar.

**Independent Test**: Open the calendar, select a day, press back twice, and confirm the app is still open on the main view.

**Acceptance Scenarios**:

1. **Given** a selected day, **When** back is pressed, **Then** the day is deselected and the calendar stays open.
2. **Given** the open calendar with no selected day, **When** back is pressed, **Then** the calendar closes.
3. **Given** the clean main view, **When** back is pressed, **Then** the system default applies.

### Edge Cases

- A window of W = 1 means the flame is available only on its achievement day.
- A drag that starts inside the handle area and continues upward over the fire still opens the calendar.
- Taps on the settings cog are unaffected by the handle rule.
- Back while the flame gallery is open closes the gallery (existing modal behavior).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A time-specific flame earned on achievement day D with window W MUST be unlocked only while the fire is lit AND today is between D and D + W − 1 inclusive; it MUST expire on D + W. The gallery countdown formula ((D + W) − today) is unchanged. (Replaces the window bound in feature 002 FR-007.)
- **FR-002**: The calendar MUST open only from a swipe-up or tap that begins in the bottom handle area of the closed main view; upward swipes that begin anywhere else MUST NOT open it. Closing gestures are unchanged. (Replaces feature 002 FR-025 and feature 003 FR-009.)
- **FR-003**: The system back button MUST first deselect a selected day, then close an open calendar, and only leave the app from the clean main view.

### Key Entities

- **Time Window**: The span D … D + W − 1 during which an earned time flame is available.
- **Handle Area**: The bottom strip of the closed main view that owns the calendar-open gesture.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In 100% of tested cases a W-day time flame is unlocked for exactly W calendar days, including back-to-back re-earns.
- **SC-002**: Swipes beginning above the handle area open the calendar in 0% of attempts; swipes on the handle open it in at least 95%.
- **SC-003**: Back never exits the app while a day is selected or the calendar is open, in 100% of attempts.

## Assumptions

- Only the window bound changes; achievement conditions, the lit-fire gate, and re-earn rules from feature 002 stay as they are.
- The handle area is the existing closed-state handle; no new visual is added.
- Back handling applies to Android; iOS has no system back button.

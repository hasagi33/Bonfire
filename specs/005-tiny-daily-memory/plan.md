# Implementation Plan: Tiny Daily Memory

**Branch**: `005-tiny-daily-memory` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-tiny-daily-memory/spec.md`

## Summary

Add an optional personal note to each calendar day, stored locally and shown only in day detail.
The implementation should reuse the app’s existing Expo/React Native stack, local persistence
pattern, and calendar flow. Notes must remain private, lightweight, and strictly non-analytical:
no summary, no sentiment, no coaching, no monthly note timeline, and no extra visual markers in
the month view.

## Technical Context

**Language/Version**: TypeScript strict on Expo SDK 56 / React Native 0.85.3 / React 19.2.3

**Primary Dependencies**: Existing Expo app, React Native built-in `TextInput`, AsyncStorage via
`@react-native-async-storage/async-storage`, Jest (`jest-expo`), React Native Reanimated already
present in the app for the calendar sheet. No new runtime dependencies.

**Storage**: Local device storage only. Add a separate versioned notes store keyed by calendar day
so notes stay isolated from score entries and can evolve independently.

**Testing**: Jest unit/component tests in `__tests__/`, plus existing lint coverage via
`npm run lint`.

**Target Platform**: iOS + Android through Expo managed/prebuild workflow.

**Project Type**: Mobile app, single-screen bonfire with a bottom-sheet calendar.

**Performance Goals**: Keep the feature lightweight: no new animation loops, no background work,
no monthly note scan, and no extra renders beyond the selected day detail. UI must remain as
responsive as the current calendar flow.

**Constraints**: Use existing packages only. Keep code small, readable, and strictly typed. Avoid
heavy computation and avoid any feature that introduces analysis or automatic interpretation.

**Scale/Scope**: Current local calendar only. One note per day, stored and edited from day detail,
with month view unchanged except for the selected-day flow.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Maintainability**: PASS. The plan uses a narrow, typed storage module and a
  small UI surface. No `any`, no broad abstraction, no new package churn.
- **II. Beginner-Readable Code (Explanatory Comments)**: PASS. The work should follow the repo’s
  existing comment style for hooks, stores, and screen wiring.
- **III. Testing Standards (NON-NEGOTIABLE)**: PASS. Add focused tests for save/reopen, blank-note
  rejection, and “notes do not appear in month view”.
- **IV. User Experience Consistency**: PASS. Reuse the current calendar flow and existing design
  tokens; do not add a separate timeline or visual badge system.
- **V. Performance Requirements**: PASS. No new runtime dependencies, no intensive work, and no
  extra per-frame logic.

## Project Structure

### Documentation (this feature)

```text
specs/005-tiny-daily-memory/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── data/
│   └── dayNotesStore.ts          # new local notes persistence boundary
├── hooks/
│   └── useDayNotes.ts            # new hook that loads/saves note text by day
├── screens/
│   └── BonfireScreen.tsx         # wire selected day notes into the calendar flow
└── components/
    └── Calendar/
        ├── CalendarSheet.tsx     # place the note editor in day detail
        ├── MonthGrid.tsx         # keep month view free of note markers
        └── ScorePickerBar.tsx    # keep score flow intact, optionally share day context

__tests__/
├── dayNotesStore.test.ts         # persistence + validation
├── useDayNotes.test.ts           # hook behavior and edge cases
└── BonfireScreen.test.tsx        # selected day shows note editor; month view stays clean
```

**Structure Decision**: Keep the feature inside the existing single-screen calendar flow. Add one
small storage module and one small hook for notes, then render the note editor in the current day
detail area of the calendar sheet. This keeps the implementation local, testable, and free of new
dependencies.

## Research Plan

1. Confirm the simplest local-storage shape for one note per day and the migration path if the
   notes store changes later.
2. Reuse the existing calendar sheet’s selected-day state to avoid introducing a second detail
   surface.
3. Use React Native’s built-in text input and the current styling system for the editor, with no
   extra package.
4. Keep note rendering out of the month grid so month browsing stays unchanged.

## Design Decisions

- **Storage shape**: a versioned `dateKey -> noteText` map stored separately from scores.
- **Editing surface**: the selected day’s detail area inside the existing calendar sheet.
- **Empty input behavior**: trim for validation only; whitespace-only input is not saved.
- **Display behavior**: show the stored note verbatim in day detail, with no generated content.
- **Month view**: no note badges, markers, or previews.

## Phase 0 Deliverable

Create `research.md` with the decisions above and any implementation tradeoffs that matter for
testing or future migration.

## Phase 1 Deliverables

Create `data-model.md`, `contracts/`, and `quickstart.md` describing:
- the note entity and its relation to a day,
- the local storage contract,
- the user flow for saving, reopening, editing, and leaving notes blank,
- the validation steps for ensuring month view stays unchanged.

<!-- gardener-maintenance-note:start b62c2796-afeb-40ec-a4d4-caf6cb07a430 -->
## Gardener maintenance note

Gardener opened this maintenance PR from plan `b62c2796-afeb-40ec-a4d4-caf6cb07a430`.

- Goal: QA seeded docs plan 10
- Evidence: Seeded for COD-207 slice B QA.
- Entropy impact: none
- Verification: Markdown note only.
<!-- gardener-maintenance-note:end b62c2796-afeb-40ec-a4d4-caf6cb07a430 -->

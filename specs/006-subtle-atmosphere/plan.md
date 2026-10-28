# Implementation Plan: Subtle Atmosphere

**Branch**: `006-subtle-atmosphere` | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-subtle-atmosphere/spec.md`

## Summary

Add a lightweight dynamic sky background that changes with local time and calendar date while
keeping the fire scene stable and readable. The atmosphere should use simple gradient layers and a
small date/time state model, update on app focus, and avoid timers, continuous animation loops, or
expensive calculations.

## Technical Context

**Language/Version**: TypeScript (strict) on Expo SDK 56 / React Native 0.85.3 / React 19.2.3

**Primary Dependencies**: Existing Expo app stack only: `expo`, `expo-linear-gradient`,
`react-native-reanimated`, `react-native-safe-area-context`, and the calendar/fire components
already in the repo. No new runtime dependencies.

**Storage**: N/A. This feature is fully derived from local date/time and does not persist data.

**Testing**: Jest (`jest-expo`) plus the existing lint gate (`npm run lint`).

**Target Platform**: iOS + Android through Expo managed/prebuild.

**Project Type**: Mobile app, single-screen bonfire with a bottom-sheet calendar.

**Performance Goals**: Background state should be computed only when the app becomes active or the
local date context changes. No animation loops, no per-frame JS work, and no heavy date math.

**Constraints**: No location prompt, no network calls, no new packages, no continuous background
polling, and no changes to fire math or calendar behavior.

**Scale/Scope**: Single screen, one background layer system, one derived atmosphere state, no stored
user preferences.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Maintainability**: PASS. The feature can stay in a small pure helper plus one
  screen-level wiring change. No `any`, no new abstractions beyond the derived atmosphere model.
- **II. Beginner-Readable Code (Explanatory Comments)**: PASS. The time/season selection logic will
  need short comments, but the flow is small and explainable.
- **III. Testing Standards (NON-NEGOTIABLE)**: PASS. Add unit coverage for the atmosphere helper
  and screen-level refresh behavior, plus a manual validation path for screenshot readability.
- **IV. User Experience Consistency**: PASS. Keep the fire and calendar visually separate while the
  sky changes behind them; use the existing design tokens and style language.
- **V. Performance Requirements**: PASS. Use simple derived state and gradient rendering only; no
  continuous timers, no animations tied to the background, and no expensive seasonal simulation.

## Project Structure

### Documentation (this feature)

```text
specs/006-subtle-atmosphere/
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
├── domain/
│   └── atmosphere.ts           # pure helper: time/date -> atmospheric state
├── components/
│   └── Bonfire/
│       └── Atmosphere.tsx      # gradient background layers, no animation loop
└── screens/
    └── BonfireScreen.tsx       # refresh atmosphere on focus; keep fire/panels stable

__tests__/
├── atmosphere.test.ts          # phase/season/hemisphere heuristics
└── BonfireScreen.test.tsx      # focus refresh + stable layering behavior
```

**Structure Decision**: Keep the feature inside the existing single-screen app. Add one pure
atmosphere helper and one rendering component, then wire the screen to refresh the derived state on
focus. This keeps the change isolated, readable, and cheap to execute.

## Phases

**Phase 0 — Research (research.md)**: choose the lightest usable model for day/night and seasonal
variation, resolve hemisphere handling without a location prompt, and confirm the rendering should
stay gradient-only.

**Phase 1 — Design artifacts**: `data-model.md` (derived atmosphere entities and transitions),
`contracts/` (behavior contract for the background), `quickstart.md` (validation scenarios for
day/night, seasonal change, screenshot readability, and app-focus refresh).

## Complexity Tracking

*No constitution violations — table intentionally empty.*

<!-- gardener-maintenance-note:start 3910dd28-8c73-401e-8b5e-1c649aec6614 -->
## Gardener maintenance note

Gardener opened this maintenance PR from plan `3910dd28-8c73-401e-8b5e-1c649aec6614`.

- Goal: QA seeded docs plan 6
- Evidence: Seeded for COD-207 slice B QA.
- Entropy impact: none
- Verification: Markdown note only.
<!-- gardener-maintenance-note:end 3910dd28-8c73-401e-8b5e-1c649aec6614 -->

# Tasks: Subtle Atmosphere

**Input**: Design documents from `/specs/006-subtle-atmosphere/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included because the feature spec defines user scenarios and acceptance criteria that need direct verification.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the small shared surface for a derived atmosphere system

- [X] T001 [P] Create the derived atmosphere helper scaffold in `src/domain/atmosphere.ts` with exported types and pure function signatures for time, date, and hemisphere inputs
- [X] T002 [P] Create the atmosphere rendering scaffold in `src/components/Bonfire/Atmosphere.tsx` with gradient-layer props and a stable render entry point

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Wire the screen so the atmosphere can refresh on focus without affecting the fire scene

**⚠️ CRITICAL**: No user story work should be considered complete until this phase is in place

- [X] T003 Implement the focus-based atmosphere refresh wiring in `src/screens/BonfireScreen.tsx` so the background state updates when the app becomes active and stays separate from the fire and fixed panels

**Checkpoint**: Foundation ready - the screen can host a derived atmosphere without changing fire behavior

---

## Phase 3: User Story 1 - Time-Aware Sky (Priority: P1) 🎯 MVP

**Goal**: Show a background that reads as day, dusk, or night based on the current local time

**Independent Test**: Open the app at representative daytime and nighttime values and confirm the background clearly changes while the fire and panels remain stable

### Tests for User Story 1

- [X] T004 [P] [US1] Add time-of-day derivation tests in `__tests__/atmosphere.test.ts` for daytime, dusk, night, and screenshot-friendly brightness ranges

### Implementation for User Story 1

- [X] T005 [US1] Implement the local-time phase selection and brightness/warmth mapping in `src/domain/atmosphere.ts`
- [X] T006 [US1] Render the day/night gradient states in `src/components/Bonfire/Atmosphere.tsx`
- [X] T007 [P] [US1] Add component behavior tests in `__tests__/Atmosphere.test.tsx` for the rendered gradient layers, screenshot-friendly contrast, and no decorative sky objects
- [X] T008 [US1] Mount `src/components/Bonfire/Atmosphere.tsx` in `src/screens/BonfireScreen.tsx` behind the fire scene while preserving the current panel layering

**Checkpoint**: At this point, the background should already change by time of day and remain readable

---

## Phase 4: User Story 2 - Seasonal Atmosphere (Priority: P2)

**Goal**: Make summer and winter feel subtly different, with winter carrying the clearest night-leaning identity

**Independent Test**: Compare summer and winter dates and confirm the seasonal shift is visible but restrained, including the southern-hemisphere flip

### Tests for User Story 2

- [X] T009 [P] [US2] Add seasonal curve and hemisphere tests in `__tests__/atmosphere.test.ts` for summer, winter, and north/south inversion behavior

### Implementation for User Story 2

- [X] T010 [US2] Implement the smooth annual curve and timezone-based hemisphere heuristic in `src/domain/atmosphere.ts`
- [X] T011 [US2] Tune the seasonal gradient transitions in `src/components/Bonfire/Atmosphere.tsx` so winter darkens more than summer without breaking the calm tone

**Checkpoint**: At this point, the background should vary by season without feeling like a different product

---

## Phase 5: User Story 3 - Calm Visual Balance (Priority: P3)

**Goal**: Keep the atmosphere supportive so the fire and fixed panels remain readable in all supported states

**Independent Test**: Review screenshots from bright and dark background states and confirm the fire stays dominant and the panels stay visually separate

### Tests for User Story 3

- [X] T012 [P] [US3] Add screen readability tests in `__tests__/BonfireScreen.test.tsx` for stable fire prominence and panel contrast across background states

### Implementation for User Story 3

- [X] T013 [US3] Adjust `src/screens/BonfireScreen.tsx` layering, tint, and contrast so the atmosphere never competes with the fire or fixed UI

**Checkpoint**: All user stories should now be independently functional and visually balanced

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, validation, and any small tuning needed to keep the code clean and performant

- [X] T014 [P] Run `npm run lint` and `npm test`, then make any final comment or tuning pass in `src/domain/atmosphere.ts`, `src/components/Bonfire/Atmosphere.tsx`, and `src/screens/BonfireScreen.tsx` to keep the code clean and lightweight, including a quick check that atmosphere updates only on focus and remains free of continuous timers or heavy date work

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user story work
- **User Stories (Phase 3+)**: Depend on Foundation completion
  - US1 is the MVP and should be completed first
  - US2 can follow once US1 is in place
  - US3 can follow once the background model is stable
- **Polish (Final Phase)**: Depends on the story work being complete

### User Story Dependencies

- **User Story 1 (P1)**: No dependency on later stories
- **User Story 2 (P2)**: Depends on the shared atmosphere helper and screen wiring established for US1
- **User Story 3 (P3)**: Depends on the atmosphere rendering path and seasonal tuning from US1/US2

### Within Each User Story

- Tests, when present, should be written before the implementation tasks they verify
- Pure helper logic before rendering details
- Rendering details before screen integration
- Story complete before moving to the next priority

### Parallel Opportunities

- T001 and T002 can run in parallel because they touch different files
- T004 and T008 can run in parallel because they test different parts of the same derived model
- T012 can run in parallel with T013 because they touch different files

---

## Parallel Example: User Story 1

```bash
Task: "Add time-of-day derivation tests in __tests__/atmosphere.test.ts for daytime, dusk, night, and screenshot-friendly brightness ranges"
Task: "Implement the local-time phase selection and brightness/warmth mapping in src/domain/atmosphere.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Stop and validate the day/night background before touching seasonal behavior

### Incremental Delivery

1. Build the time-aware background first
2. Add the seasonal curve and hemisphere handling next
3. Finish with readability and contrast tuning
4. Validate each story independently so the feature stays easy to reason about

### Parallel Team Strategy

With multiple developers:

1. One developer can build the helper and gradient component scaffolding
2. Another can wire the screen refresh path
3. After the foundation lands, story work can proceed in priority order

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to a specific user story for traceability
- Keep the atmosphere derived and lightweight; avoid timers, polling, or expensive date logic
- Preserve the existing fire behavior and keep the panels visually separate
<!-- qa cod-207 B1 touch -->

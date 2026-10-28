# Tasks: Fire Health

**Input**: Design documents from `/specs/007-fire-health/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Included because the feature plan and constitution require deterministic coverage for the derived health model and regression protection for gameplay invariants.

**Organization**: Tasks are grouped by user story to keep the health signal independently implementable and independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the Fire Health module boundary and shared types

- [X] T001 Create the Fire Health domain module scaffold with exported types and intent comments in `src/domain/fireHealth.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core derived-state logic that every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 Implement the weighted 7-scored-day health window, score-quality index, and four-state threshold mapping in `src/domain/fireHealth.ts`
- [X] T003 Thread the derived Fire Health state through `src/screens/BonfireScreen.tsx` into `src/components/Bonfire/FireScene.tsx` and `src/components/Bonfire/FireCaption.tsx`

**Checkpoint**: Fire Health can now be derived from score history and passed to the scene without changing gameplay behavior

---

## Phase 3: User Story 1 - Read the Fire's Condition (Priority: P1) 🎯 MVP

**Goal**: A user can read Faint, Steady, Bright, or Radiant from the flame scene and understand recent effort quality at a glance

**Independent Test**: Compare representative score histories and confirm the visible state label and flame behavior move together across the four health states

### Tests for User Story 1

- [X] T004 [P] [US1] Add deterministic unit coverage for the weighted window, sparse-history fallback (0/1/2 scored days), and state thresholds in `__tests__/fireHealth.test.ts`
- [X] T005 [P] [US1] Add render coverage for the visible Fire Health label and state handoff in `__tests__/BonfireScreen.health.test.tsx`

### Implementation for User Story 1

- [X] T006 [P] [US1] Add Fire Health label rendering and state presentation in `src/components/Bonfire/FireCaption.tsx`
- [X] T007 [P] [US1] Apply Fire Health-driven visual modifiers to the flame scene in `src/components/Bonfire/flameModel.ts` and `src/components/Bonfire/Flame.tsx`

**Checkpoint**: The flame scene visibly communicates recent score quality without altering any game rules

---

## Phase 4: User Story 2 - Keep Gameplay Rules Unchanged (Priority: P1)

**Goal**: Fire Health remains visual-only and never changes streak survival, fire strength math, or unlock outcomes

**Independent Test**: Replay the same score histories before and after Fire Health and confirm only visuals change while fire math and unlock outcomes stay identical

### Tests for User Story 2

- [X] T008 [P] [US2] Add regression coverage proving Fire Health does not alter `computeFire`, `computeMetrics`, `fireLabel`, score-entry round-trips, or unlock outcomes in `__tests__/fire.test.ts`, `__tests__/fireMetrics.test.ts`, `__tests__/entriesStore.test.ts`, and `__tests__/achievements.test.ts`

### Implementation for User Story 2

- [X] T009 [US2] Keep Fire Health suppressed when the fire is not lit and ensure the state remains visual-only in `src/domain/fireHealth.ts`, `src/components/Bonfire/Flame.tsx`, and `src/components/Bonfire/FireCaption.tsx`

**Checkpoint**: The game rules remain unchanged and the health state never implies gameplay advantage

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Tighten performance, readability, and validation across the feature

- [X] T010 [P] Review Fire Health hot paths for unnecessary re-renders and simplify memoization in `src/domain/fireHealth.ts`, `src/components/Bonfire/Flame.tsx`, and `src/screens/BonfireScreen.tsx`
- [X] T011 [P] Validate the feature against `specs/007-fire-health/quickstart.md` and fix any lint, test, or readability issues uncovered

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on the user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - MVP scope
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) - depends on the same derived health model but remains independently testable

### Within Each User Story

- Tests, when included, should be written before the corresponding implementation work
- Shared model logic before presentation wiring
- Presentation wiring before polish
- Story complete before moving on to the next phase

### Parallel Opportunities

- `T004` and `T005` can run in parallel because they touch different test files
- `T006` and `T007` can run in parallel because they update different presentation paths
- `T008` can run in parallel with unrelated cleanup once the core implementation is stable

---

## Parallel Example: User Story 1

```text
Task: "Add deterministic unit coverage for the weighted window and state thresholds in __tests__/fireHealth.test.ts"
Task: "Add render coverage for the visible Fire Health label and state handoff in __tests__/BonfireScreen.health.test.tsx"
Task: "Add Fire Health label rendering and state presentation in src/components/Bonfire/FireCaption.tsx"
Task: "Apply Fire Health-driven visual modifiers to the flame scene in src/components/Bonfire/flameModel.ts and src/components/Bonfire/Flame.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1
4. Validate the flame scene and state label independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → the health state can be derived from score history
2. Add User Story 1 → users can read the health state in the flame scene
3. Add User Story 2 → the feature is locked down as visual-only and gameplay-safe
4. Finish with polish and performance review before merge

### Parallel Team Strategy

With multiple developers:

1. One developer can implement the derived health helper while another prepares the screen wiring
2. After the foundation is in place:
   - Developer A: FireCaption and Flame presentation
   - Developer B: regression tests for no gameplay change
   - Developer C: polish/performance cleanup

<!-- gardener-maintenance-note:start 0c75c29b-fba7-4d57-90e9-8f407a865373 -->
## Gardener maintenance note

Gardener opened this maintenance PR from plan `0c75c29b-fba7-4d57-90e9-8f407a865373`.

- Goal: QA seeded docs plan 3
- Evidence: Seeded for COD-207 slice B QA.
- Entropy impact: none
- Verification: Markdown note only.
<!-- gardener-maintenance-note:end 0c75c29b-fba7-4d57-90e9-8f407a865373 -->

# Implementation Plan: UI & Flame Polish Fixes

**Branch**: `main` (no feature branch; spec dir `003-ui-flame-polish`) | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-ui-flame-polish/spec.md`

## Summary

Five amendments to the existing Bonfire app, all inside current files — no new packages, no new
screens, no storage changes:

1. **Locked-flame selection guard (P1)**: tapping a locked flame in the gallery no longer equips
   it; the row gives a brief rejection cue. Defense-in-depth guard at the screen level too.
2. **Per-flame glow & particles (P2)**: the halo, ground glow, hearth warm wash, and ember
   particles currently hardcode warm-orange RGBA stops; they will derive every color from the
   active flame's 5-stop `Palette` via small pure color helpers (`withAlpha`, `darken`).
3. **Score heat ramp (P3)**: redefine `heat1..heat5` design tokens to white → light yellow →
   yellow → orange → red and adapt `heatStyle()` text/contrast treatment (white button gets a
   visible outline). Day cells inherit the same ramp automatically (single-token-source rule).
4. **Whole-screen calendar gestures (P4)**: the existing full-screen swipe-up-to-open stays; add a
   symmetric down-only pan over the open sheet body so a downward drag anywhere on the calendar
   dismisses it without breaking day-cell taps or score buttons.
5. **Larger cog (P5)**: grow the settings gear from 38×38 to 52×52 (icon 18 → 26), comfortably
   above the 44pt minimum touch target.

## Technical Context

**Language/Version**: TypeScript (strict) on the adopted Expo SDK's React Native/React versions

**Primary Dependencies**: Expo (managed + prebuild), @shopify/react-native-skia (flame, embers),
react-native-reanimated (animation), react-native-gesture-handler (sheet gestures),
expo-linear-gradient (swatches/background), @react-native-async-storage/async-storage (persistence)
— **no new packages** (existing constraint carried forward)

**Storage**: AsyncStorage via existing `entriesStore` / `settingsStore` — **unchanged by this feature**

**Testing**: Jest (`jest-expo`), tests in `__tests__/`; `npm test`, `npm run lint` gate merges

**Target Platform**: iOS + Android (Expo)

**Project Type**: mobile-app (single screen + sheets)

**Performance Goals**: flame rendering ≥120 FPS (constitution amendment); UI ≥60 FPS; flame
switching must not regress (SC-005)

**Constraints**: derived-only unlock state (feature 002 invariant); all colors from single token /
palette source (Principle IV); no per-frame JS work on the render path

**Scale/Scope**: 5 fixes across ~8 existing source files + tests; 0 new components

## Constitution Check

*GATE: evaluated against constitution v1.1.0 — PASS (initial and post-design). No violations; Complexity Tracking empty.*

- **I. Code Quality**: All edits in strict TS; no `any` needed. `npm run lint` gate unchanged.
  New helpers are small pure functions. PASS.
- **II. Beginner-Readable Comments**: Every touched block already carries header/inline comments;
  edits update those comments in the same change (stale comments = bugs). New helpers get
  plain-language headers. PASS.
- **III. Testing (NON-NEGOTIABLE)**: Each fix ships tests: heat-ramp token mapping + `heatStyle`
  contrast; `withAlpha`/`darken`/glow-derivation pure helpers; locked-tap regression test on
  `FlameGallery` (onEquip NOT called, was called before fix — true regression test for the bug);
  screen-level guard test. Gesture activation ranges are config (not deterministically unit-testable
  in jsdom); validated via quickstart manual scenarios, config asserted where feasible. PASS.
- **IV. UX Consistency**: Heat ramp stays in `tokens.ts` (single source) so score buttons and day
  cells move together. Touch targets ≥44pt (cog fix directly serves this). Accessibility labels and
  `accessibilityState.disabled` added for locked rows. PASS.
- **V. Performance**: Glow color arrays derived from palette are `useMemo`-ized (recompute only on
  flame switch, never per frame). No new JS on the Skia/Reanimated UI-thread loops. PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-ui-flame-polish/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── score-heat-ramp.md
│   ├── glow-derivation.md
│   ├── locked-selection.md
│   └── gesture-surface.md
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
src/
├── theme/
│   ├── tokens.ts                    # EDIT: heat1..heat5 ramp + heatStyle() contrast (P3)
│   └── palettes.ts                  # EDIT: add withAlpha()/darken() pure color helpers (P2)
├── components/
│   ├── Bonfire/
│   │   ├── Flame.tsx                # EDIT: halo/ground-glow/tongue-base stops ← palette (P2)
│   │   ├── Embers.tsx               # EDIT: particle gradient fade ← own color (P2)
│   │   └── Hearth.tsx               # EDIT: warm wash + coal colors ← palette prop (P2)
│   ├── Calendar/
│   │   ├── CalendarSheet.tsx        # EDIT: down-only pan over open sheet body (P4)
│   │   └── ScorePickerBar.tsx       # EDIT: white-button outline treatment (P3)
│   └── Settings/
│       ├── SettingsSheet.tsx        # EDIT: larger gear (52×52, icon 26) (P5)
│       └── FlameRow.tsx             # EDIT: locked rows reject equip + feedback (P1)
├── screens/
│   └── BonfireScreen.tsx            # EDIT: guard onEquip by unlock state; pass palette to Hearth (P1, P2)

__tests__/
├── tokens.heat.test.ts              # NEW: ramp colors + heatStyle contrast
├── palettes.test.ts                 # EDIT: withAlpha/darken/glow-derivation cases
├── FlameGallery.test.tsx            # EDIT: locked-tap regression (equip rejected)
└── BonfireScreen.test.tsx           # EDIT: screen-level equip guard
```

**Structure Decision**: Single Expo project, existing layout — domain rules in `src/domain/`,
pure visual helpers in `src/theme/`, UI in `src/components/` + one screen. This feature only
edits existing files plus one new test file; no structural change.

## Complexity Tracking

*No constitution violations — table intentionally empty.*

## Maintenance Policy

- Documentation upkeep is low risk: the maintenance bot may fix typos, spelling and broken links in `docs/handbook/getting-started.md` on its own, without review.

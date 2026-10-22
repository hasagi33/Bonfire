<!-- gardener-constitution-proposal: v1 -->
# Scope: 003-ui-flame-polish

## Scope

- Specs: local: specs/003-ui-flame-polish
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `specs/002-achievement-flame-unlocks/data-model.md` (spec_path)
- `specs/003-ui-flame-polish/quickstart.md` (spec_path)
- `src/components/Bonfire/Embers.tsx` (requirement, spec_path)
- `src/components/Bonfire/Flame.tsx` (requirement, spec_path)
- `src/components/Bonfire/Hearth.tsx` (spec_path)
- `src/components/Calendar/CalendarSheet.tsx` (requirement, spec_path)
- `src/components/Calendar/DayCell.tsx` (spec_path)
- `src/components/Calendar/ScorePickerBar.tsx` (requirement, spec_path)
- `src/components/Settings/FlameRow.tsx` (requirement, spec_path)
- `src/components/Settings/SettingsSheet.tsx` (requirement, spec_path)
- `src/domain/flames.ts` (spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `src/theme/palettes.ts` (spec_path)
- `src/theme/tokens.ts` (requirement, spec_path)
- `__tests__/BonfireScreen.test.tsx` (requirement)
- `__tests__/FlameGallery.test.tsx` (requirement)
- `__tests__/flames.catalog.test.ts` (requirement)
- `src/components/Bonfire/flameModel.ts` (requirement)
- `src/components/Calendar/MonthGrid.tsx` (requirement)
- `src/data/settingsStore.ts` (requirement)
- `src/domain/achievements.ts` (requirement)
- `src/domain/dates.ts` (requirement)
- `src/domain/fireMetrics.ts` (requirement)
- `src/hooks/useFlames.ts` (requirement)

## Requirements

- FR-001: System MUST prevent a locked flame (one whose achievement condition is not currently satisfied) from being set as the active flame through any selection interaction.
- FR-002: System MUST give the user immediate, clear feedback when they attempt to select a locked flame (the attempt is visibly rejected rather than silently ignored).
- FR-003: System MUST continue to allow selection of any flame whose unlock condition is currently satisfied, with unchanged behavior.
- FR-004: System MUST derive the ambient/surrounding light of the rendered fire from the active flame's own palette.
- FR-005: System MUST derive particle/spark colors of the rendered fire from the active flame's own palette.
- FR-006: System MUST update glow and particle colors immediately when the active flame changes, while preserving the existing flame-switch performance standard (no perceptible drop below the established frame-rate target).
- FR-007: Calendar score buttons MUST each display a distinct fixed color by score value: 1 = white, 2 = light yellow, 3 = yellow, 4 = orange, 5 = red.
- FR-008: Score button labels and the selected-state indicator MUST remain clearly legible on each button's color.
- FR-009: Users MUST be able to open the calendar by swiping up starting anywhere on the main screen.
- FR-010: Users MUST be able to dismiss the calendar by swiping down starting anywhere on the calendar screen.
- FR-011: Whole-screen calendar gestures MUST NOT break taps, button presses, or scrolling within either screen; only a deliberate directional drag moves the calendar.
- FR-012: The upper-right cog control MUST be rendered larger, with a touch target at least meeting standard mobile minimum touch-target size, and MUST keep its existing behavior of opening flame selection.

## Shared Seams

- `__tests__/BonfireScreen.test.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory
- `__tests__/flames.catalog.test.ts` is also in: 007-fire-health
- `src/components/Bonfire/Embers.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/components/Bonfire/Hearth.tsx` is also in: 001-bonfire-productivity-tracker
- `src/components/Bonfire/flameModel.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 007-fire-health
- `src/components/Calendar/CalendarSheet.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 005-tiny-daily-memory
- `src/components/Calendar/DayCell.tsx` is also in: 001-bonfire-productivity-tracker, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health
- `src/components/Calendar/MonthGrid.tsx` is also in: 001-bonfire-productivity-tracker, 005-tiny-daily-memory, 007-fire-health
- `src/components/Calendar/ScorePickerBar.tsx` is also in: 001-bonfire-productivity-tracker, 007-fire-health
- `src/components/Settings/FlameRow.tsx` is also in: 002-achievement-flame-unlocks, 004-flame-visual-profiles
- `src/components/Settings/SettingsSheet.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks
- `src/data/settingsStore.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles
- `src/domain/achievements.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 006-subtle-atmosphere
- `src/domain/dates.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks
- `src/domain/fireMetrics.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks
- `src/domain/flames.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health
- `src/hooks/useFlames.ts` is also in: 002-achievement-flame-unlocks, 004-flame-visual-profiles, 006-subtle-atmosphere
- `src/screens/BonfireScreen.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/theme/palettes.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 005-tiny-daily-memory, 007-fire-health
- `src/theme/tokens.ts` is also in: 001-bonfire-productivity-tracker

<!-- gardener-generated: 028712b46e 074b0a97c6 0a63188421 0da6d457e1 1439d77371 194beb8f8e 199152b147 1fc43d08fc 20b6c63fed 226dc824e4 2890267a6a 29e9c28b2b 2eb5c64f6b 30d461f7d2 32b767a85a 3340219e91 3460de9b69 3657738dc2 3708a2216a 42dc162ce8 4709bcf9c8 48514e12df 586e6ddefd 58f5dd2b0b 5b09089c01 5b921c6664 6787fcecd2 7745bd2ded 78ecc94c19 7ee3d76ebf 83f4dcee0a 85500f0bc9 8c4dd1f45c 8f537e5f62 8f902ba116 90dafda27c 92f16c0208 948370d4d5 95c2736c93 967c1ee502 999fd5f90b 99ff67fbd4 a3102fdd1b a3150b7a3c aaaf0d17dc b0b4f40d1b b106e39660 b3110a5434 b8ef3e7305 c0639b7f66 c3f772695f d57612f97a e4f1f10177 f32e1a6a0d f83036815d f87f0fb332 fb9872cc80 fd66e6b82e ff504f91a1 -->

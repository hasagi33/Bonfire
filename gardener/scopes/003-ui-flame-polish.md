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
- `src/domain/flames.ts` (requirement, spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `src/theme/palettes.ts` (requirement, spec_path)
- `src/theme/tokens.ts` (spec_path)
- `__tests__/BonfireScreen.test.tsx` (requirement)
- `__tests__/FlameGallery.test.tsx` (requirement)
- `__tests__/flames.catalog.test.ts` (requirement)
- `__tests__/tokens.heat.test.ts` (requirement)
- `src/components/Bonfire/flameModel.ts` (requirement)
- `src/components/Calendar/MonthGrid.tsx` (requirement)
- `src/domain/achievements.ts` (requirement)
- `src/domain/dates.ts` (requirement)
- `src/domain/fire.ts` (requirement)
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

- `__tests__/BonfireScreen.test.tsx` is also in: 001-bonfire-productivity-tracker, 004-flame-visual-profiles, 005-tiny-daily-memory
- `__tests__/flames.catalog.test.ts` is also in: 004-flame-visual-profiles, 007-fire-health
- `__tests__/tokens.heat.test.ts` is also in: 006-subtle-atmosphere
- `src/components/Bonfire/Embers.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/components/Bonfire/Hearth.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks
- `src/components/Bonfire/flameModel.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 007-fire-health
- `src/components/Calendar/CalendarSheet.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 005-tiny-daily-memory
- `src/components/Calendar/DayCell.tsx` is also in: 001-bonfire-productivity-tracker, 006-subtle-atmosphere
- `src/components/Calendar/MonthGrid.tsx` is also in: 001-bonfire-productivity-tracker, 005-tiny-daily-memory
- `src/components/Calendar/ScorePickerBar.tsx` is also in: 001-bonfire-productivity-tracker, 007-fire-health
- `src/components/Settings/FlameRow.tsx` is also in: 002-achievement-flame-unlocks, 004-flame-visual-profiles
- `src/components/Settings/SettingsSheet.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles
- `src/domain/achievements.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere
- `src/domain/dates.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 007-fire-health
- `src/domain/fire.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks
- `src/domain/flames.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/hooks/useFlames.ts` is also in: 002-achievement-flame-unlocks, 004-flame-visual-profiles, 006-subtle-atmosphere
- `src/screens/BonfireScreen.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/theme/palettes.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory, 007-fire-health
- `src/theme/tokens.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks

<!-- gardener-generated: 01ac02f400 028712b46e 074b0a97c6 0a63188421 1439d77371 187774afea 194beb8f8e 199152b147 1dcc3c41b5 226dc824e4 2890267a6a 29e9c28b2b 2eb5c64f6b 30d461f7d2 3340219e91 3460de9b69 3657738dc2 3708a2216a 3d13c04659 42dc162ce8 4709bcf9c8 48514e12df 51ac99fc8e 529a7539b0 52d880bddc 5b09089c01 65e3788cee 6787fcecd2 7102694d81 745b576b18 7745bd2ded 7898dfb414 7ee3d76ebf 835b2d9e2c 85500f0bc9 886d0f18e1 8c4dd1f45c 8f537e5f62 8f902ba116 92f16c0208 948370d4d5 95c2736c93 967c1ee502 99ff67fbd4 9cf68629bc 9dea413e70 a3102fdd1b a3150b7a3c ae8f9e5234 b106e39660 b5b8045fd3 b8ef3e7305 c3f772695f dbd8b91a05 f32e1a6a0d f83036815d f87f0fb332 fb9872cc80 ff504f91a1 -->

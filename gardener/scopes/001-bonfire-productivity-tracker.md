<!-- gardener-constitution-proposal: v1 -->
# Scope: 001-bonfire-productivity-tracker

## Scope

- Specs: local: specs/001-bonfire-productivity-tracker
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `.specify/templates/plan-template.md` (spec_path)
- `specs/001-bonfire-productivity-tracker/spec.md` (spec_path)
- `src/components/Bonfire/Embers.tsx` (requirement, spec_path)
- `src/components/Bonfire/FireCaption.tsx` (spec_path)
- `src/components/Bonfire/Flame.tsx` (requirement, spec_path)
- `src/components/Bonfire/Hearth.tsx` (spec_path)
- `src/components/Bonfire/flameModel.ts` (requirement, spec_path)
- `src/components/Calendar/CalendarSheet.tsx` (requirement, spec_path)
- `src/components/Calendar/DayCell.tsx` (requirement, spec_path)
- `src/components/Calendar/MonthGrid.tsx` (requirement, spec_path)
- `src/components/Calendar/ScorePickerBar.tsx` (spec_path)
- `src/components/Settings/SettingsSheet.tsx` (requirement, spec_path)
- `src/data/entriesStore.ts` (spec_path)
- `src/data/settingsStore.ts` (requirement, spec_path)
- `src/domain/dates.ts` (requirement, spec_path)
- `src/domain/fire.ts` (requirement, spec_path)
- `src/hooks/useEntries.ts` (requirement, spec_path)
- `src/hooks/useSettings.ts` (spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `src/theme/palettes.ts` (spec_path)
- `src/theme/tokens.ts` (spec_path)
- `App.tsx` (requirement)
- `__tests__/BonfireScreen.test.tsx` (requirement)
- `__tests__/achievements.test.ts` (requirement)
- `jest.config.js` (requirement)
- `jest.setup.js` (requirement)
- `src/components/Bonfire/FireScene.tsx` (requirement)
- `src/components/Calendar/DayNoteEditor.tsx` (requirement)
- `src/components/Settings/FlameGallery.tsx` (requirement)
- `src/data/dayNotesStore.ts` (requirement)
- `src/domain/achievements.ts` (requirement)
- `src/domain/fireMetrics.ts` (requirement)
- `src/domain/flames.ts` (requirement)

## Requirements

- FR-001: The app MUST display, on a clean main view, an animated bonfire whose size/strength reflects the user's accumulated productivity, plus a settings button (top-right) and a calendar that is revealed on demand (see FR-016–FR-019). The flame is the focus; the calendar and settings are the only other surfaces.
- FR-002: Users MUST be able to assign an integer productivity score of 1 to 5 to any day that is today or in the past.
- FR-003: The app MUST reject scores outside the 1-5 integer range and MUST reject scores for future dates.
- FR-004: Users MUST be able to change or clear a previously assigned score for any past or current day.
- FR-005: A score of 1 MUST count the day as active (keeping the fire alive) but MUST add no strength to the fire. Scores of 2, 3, 4, and 5 MUST add increasing amounts of strength, with 5 adding the most. Any score (including 1) logged on an extinguished fire MUST relight it; a 1 relights it as a minimal lit fire at strength 0.
- FR-006: The fire's total strength MUST equal the cumulative sum of the strength contributions of every scored day in the current active (lit) run.
- FR-007: A single past day with no score MUST NOT cause the fire to go out.
- FR-008: Two consecutive past calendar days with no score MUST cause the fire to go out.
- FR-009: When the fire goes out, its accumulated strength MUST reset to zero; subsequent logging MUST start a new fire from zero.
- FR-010: The fire's state (lit/out and current strength) MUST be derived deterministically from the full calendar of scores evaluated against the current date, so that the result is identical regardless of the order in which scores were entered.
- FR-011: When a user adds, changes, or clears a score for any day (including past days), the app MUST recompute and re-render the fire to reflect the updated calendar.
- FR-012: The fire animation MUST visibly distinguish at least the states: unlit/spark, lit (with a range of sizes from small to large), and gone out. In the "gone out" state the app MUST show NO flame and NO embers/particles until the fire is relit; it MAY show cold charred logs and a thin, dissipating smoke wisp to convey that the fire recently went out.
- FR-013: The calendar MUST visually indicate which days have scores (and ideally the score or intensity) and which days were missed.
- FR-014: All recorded scores MUST persist locally between app sessions so the fire's history is retained when the app is reopened.
- FR-015: On launch, the app MUST display a loading placeholder until saved scores have finished loading, then render the fire from the loaded data. The fire MUST NOT show a premature "unlit" state during loading, and any score entered while loading is in progress MUST NOT be discarded by the load completing.
- FR-016: The main view MUST present a settings button in the top-right corner; activating it MUST open a settings surface.
- FR-017: Settings MUST let the user choose the fire's color from at least Amber, Crimson, and Sapphire. The selected color MUST be applied to the flame and MUST persist across app restarts. A default color MUST be used until the user picks one.
- FR-018: The main view MUST be clean by default — showing only the flame and the settings button, with the calendar NOT visible.
- FR-019: The user MUST be able to reveal the calendar with a swipe-up gesture and hide it with a swipe-down gesture.
- FR-020: The calendar MUST be month-focused (showing one month at a time). The user MUST be able to navigate backward through any number of past months to reach and edit any past day. The user MUST NOT be able to navigate into future months; forward navigation is allowed only up to the current month.
- FR-021: While the fire is lit, the flame MUST emit rising particles (embers/sparks); the amount/intensity MAY scale with the fire's strength.

## Out of Scope

- No persistence, no formatting, no React state, no per-day contribution map (the calendar colors cells from the raw score, not contributions). Persistence lives in `data/`, rendering in `components/`.

## Shared Seams

- `.specify/templates/plan-template.md` is also in: 002-achievement-flame-unlocks
- `App.tsx` is also in: 005-tiny-daily-memory, 007-fire-health
- `__tests__/BonfireScreen.test.tsx` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory
- `__tests__/achievements.test.ts` is also in: 002-achievement-flame-unlocks
- `jest.setup.js` is also in: 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere
- `src/components/Bonfire/Embers.tsx` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles
- `src/components/Bonfire/FireCaption.tsx` is also in: 007-fire-health
- `src/components/Bonfire/FireScene.tsx` is also in: 007-fire-health
- `src/components/Bonfire/Flame.tsx` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health, 008-user-handbook
- `src/components/Bonfire/Hearth.tsx` is also in: 003-ui-flame-polish
- `src/components/Bonfire/flameModel.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 007-fire-health
- `src/components/Calendar/CalendarSheet.tsx` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 005-tiny-daily-memory
- `src/components/Calendar/DayCell.tsx` is also in: 003-ui-flame-polish, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health
- `src/components/Calendar/DayNoteEditor.tsx` is also in: 005-tiny-daily-memory
- `src/components/Calendar/MonthGrid.tsx` is also in: 003-ui-flame-polish, 005-tiny-daily-memory, 007-fire-health
- `src/components/Calendar/ScorePickerBar.tsx` is also in: 003-ui-flame-polish, 007-fire-health
- `src/components/Settings/FlameGallery.tsx` is also in: 002-achievement-flame-unlocks
- `src/components/Settings/SettingsSheet.tsx` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/data/dayNotesStore.ts` is also in: 002-achievement-flame-unlocks, 005-tiny-daily-memory, 008-user-handbook
- `src/data/entriesStore.ts` is also in: 002-achievement-flame-unlocks
- `src/data/settingsStore.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles
- `src/domain/achievements.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 006-subtle-atmosphere
- `src/domain/dates.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/domain/fire.ts` is also in: 002-achievement-flame-unlocks
- `src/domain/fireMetrics.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/domain/flames.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health, 008-user-handbook
- `src/hooks/useEntries.ts` is also in: 005-tiny-daily-memory
- `src/hooks/useSettings.ts` is also in: 002-achievement-flame-unlocks, 004-flame-visual-profiles
- `src/screens/BonfireScreen.tsx` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/theme/palettes.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 005-tiny-daily-memory, 007-fire-health
- `src/theme/tokens.ts` is also in: 003-ui-flame-polish

<!-- gardener-generated: 074b0a97c6 0acadd05b2 0e8dba4b09 0f32ab50d0 13ad476fe4 1439d77371 18a527d286 1b44243d5a 226dc824e4 23810e90c6 29a4be4b18 29e81db977 2bdd488cc9 2eb5c64f6b 31f3684ebe 333d48486d 3708a2216a 37be7f8cd8 37e79440b1 38817b7d2d 40603d3136 46b2974c7b 4ce7893643 4d3b35218d 4e71387c83 4f2e587953 55461f57d5 5621dc0e6f 5c97596ca6 65e3788cee 66c4d7998c 6822483a15 68e5ba7944 6c35c0a423 6c9122e62a 72ba496bb0 74d0155fb5 7904916ee0 7a505dd791 7e0afe8a36 83f4dcee0a 8468f9faee 882a6dd336 8a3e1284e9 9012f34863 9030786596 9056336eb5 9b7732acbb 9bef45dabd a3150b7a3c a916ecb1d4 abbc9802c3 ac8aa4f793 afa6820a2b b000094445 b1ac18e9f2 b3bedbc28a b474db63a4 b81fac1947 b8390ea5da b8ef3e7305 bbf2df47e4 bcfa306c20 bd8bee8e7a bfd53f32f3 c3f772695f c53dcc5e50 c8d8c30519 c96062eb2b cb87f64d09 ce2deb6f20 d0837c6373 d5c4d50f05 db318c6487 dd76ac8f17 e0e05a3a9e e26a21f472 e4f1f10177 e7399b224b eac0fc5379 edb668e663 ef2c3a3892 f07210e232 f32e1a6a0d fd4508be92 fe519bac37 fe7c29225d febafeee05 -->

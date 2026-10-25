<!-- gardener-constitution-proposal: v1 -->
# Scope: 006-subtle-atmosphere

## Scope

- Specs: local: specs/006-subtle-atmosphere
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `src/components/Bonfire/Atmosphere.tsx` (requirement, spec_path)
- `src/domain/atmosphere.ts` (requirement, spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `__tests__/Atmosphere.test.tsx` (requirement)
- `__tests__/tokens.heat.test.ts` (requirement)
- `jest.setup.js` (requirement)
- `metro.config.js` (requirement)
- `src/components/Bonfire/Flame.tsx` (requirement)
- `src/components/Calendar/DayCell.tsx` (requirement)
- `src/domain/achievements.ts` (requirement)
- `src/domain/flames.ts` (requirement)
- `src/hooks/useFlamePulses.ts` (requirement)
- `src/hooks/useFlames.ts` (requirement)

## Requirements

- FR-001: The background MUST reflect the current time of day when the app opens.
- FR-002: The background MUST present daytime as light and nighttime as dark.
- FR-003: The background MUST transition smoothly between time-of-day states rather than switching abruptly.
- FR-004: The background MUST vary subtly across the year so that summer and winter feel different.
- FR-005: The seasonal variation MUST support both hemispheres.
- FR-006: The background MUST remain visually calm and subtle, using gradient-based sky mood rather than decorative world-building.
- FR-007: The background MUST preserve readability of the fire and fixed UI panels in all supported states.
- FR-008: The feature MUST not require the user to grant location access or complete a manual location setup step.
- FR-009: The background MUST be readable in a static screenshot, not only through motion over time.
- FR-010: Dawn MUST feel cooler than dusk, and dusk MUST feel warmer than dawn.
- FR-011: Winter MUST have the clearest seasonal identity, with longer dark periods than summer.
- FR-012: The atmosphere MUST refresh when the app regains focus so the view stays aligned with the current date and time.

## Shared Seams

- `__tests__/tokens.heat.test.ts` is also in: 003-ui-flame-polish
- `jest.setup.js` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 004-flame-visual-profiles, 005-tiny-daily-memory
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 007-fire-health
- `src/components/Calendar/DayCell.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish
- `src/domain/achievements.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory
- `src/domain/flames.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 007-fire-health
- `src/hooks/useFlames.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles
- `src/screens/BonfireScreen.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 007-fire-health

<!-- gardener-generated: 099ee6cfe7 11be4ec0f1 1db8b8b849 28cb01e3cf 2b3768deaf 305986fcb6 30d461f7d2 34ce3fabd4 4aff2f15a3 4b92060f90 4d3b35218d 4e4ed369b9 4ff8670edb 5f03bca482 61769217b3 669376f079 69903feacb 6b9546f7e1 7833b16bb8 7cd649b2da 81f7c0a895 8cd8a576b2 a3150b7a3c a4d88f404d a916ecb1d4 ae8f9e5234 bb009fed5d c3f772695f c62c0fde6f d71dad0430 d84861384e d8cf025a6f e73051e067 f32e1a6a0d fa2de9ff01 -->

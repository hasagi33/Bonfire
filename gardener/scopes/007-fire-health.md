<!-- gardener-constitution-proposal: v1 -->
# Scope: 007-fire-health

## Scope

- Specs: local: specs/007-fire-health
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `specs/007-fire-health/quickstart.md` (spec_path)
- `src/components/Bonfire/FireCaption.tsx` (requirement, spec_path)
- `src/components/Bonfire/FireScene.tsx` (spec_path)
- `src/components/Bonfire/Flame.tsx` (requirement, spec_path)
- `src/components/Bonfire/flameModel.ts` (requirement, spec_path)
- `src/domain/fireHealth.ts` (requirement, spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `App.tsx` (requirement)
- `__tests__/flames.catalog.test.ts` (requirement)
- `src/components/Calendar/ScorePickerBar.tsx` (requirement)
- `src/domain/dates.ts` (requirement)
- `src/domain/flamePulses.ts` (requirement)
- `src/domain/flames.ts` (requirement)
- `src/theme/palettes.ts` (requirement)

## Requirements

- FR-001: The fire MUST expose four named health states: Faint, Steady, Bright, and Radiant.
- FR-002: Fire Health MUST be derived primarily from the last 7 scored days, with newer scores weighted more heavily than older scores.
- FR-003: Fire Health MUST reflect recent score quality more than raw streak length, so a shorter 7-day history with stronger recent scores can appear healthier than a longer or older history with weaker recent scores.
- FR-004: Each health state MUST be visible through flame behavior that users can distinguish without reading score numbers or other hidden indicators.
- FR-005: The visual differences between states MUST communicate the expected feeling of the state: Faint as fragile or subdued, Steady as stable, Bright as lively and warm, and Radiant as the strongest and most vivid condition.
- FR-006: Fire Health MUST be visual-only and MUST NOT change streak survival rules, fire strength math, score totals, unlock outcomes, or any other gameplay result.
- FR-007: When recent score quality is insufficient to determine a strong or weak reading, the fire MUST display a defined default state rather than an ambiguous or broken state.
- FR-008: Low recent score quality MUST keep the fire alive when existing gameplay rules allow it, while still presenting a visibly weaker condition.

## Shared Seams

- `App.tsx` is also in: 001-bonfire-productivity-tracker, 005-tiny-daily-memory
- `__tests__/flames.catalog.test.ts` is also in: 003-ui-flame-polish, 004-flame-visual-profiles
- `src/components/Bonfire/FireCaption.tsx` is also in: 001-bonfire-productivity-tracker
- `src/components/Bonfire/FireScene.tsx` is also in: 001-bonfire-productivity-tracker, 005-tiny-daily-memory
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere
- `src/components/Bonfire/flameModel.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles
- `src/components/Calendar/ScorePickerBar.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish
- `src/domain/dates.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/domain/flamePulses.ts` is also in: 001-bonfire-productivity-tracker, 004-flame-visual-profiles
- `src/domain/flames.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere
- `src/screens/BonfireScreen.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere
- `src/theme/palettes.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory

<!-- gardener-generated: 00b46b7be3 00b9401d68 1f527660e8 1fe799c5b5 226dc824e4 22b25f11ea 31f3684ebe 3af1d744e0 48514e12df 678465ac76 6ed8cfe017 7352708c97 7c6a94d2e1 800eaefd50 80df2946dd 84363d53c1 8bd59f0589 95c2736c93 a1646fab6f a3150b7a3c a48acd2a20 a76ea93acb a916ecb1d4 abbc9802c3 b82c2131f9 b896001d98 bb684ab194 bb99905d39 c3f772695f c46baf89ee c73b13a31f c9bd34c517 ceff1c6156 d31e45b3e8 d4509a6e55 fe8ff3d7f0 -->

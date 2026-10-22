<!-- gardener-constitution-proposal: v1 -->
# Gardener Rules

## Protected Modules

- `src/domain/fire.ts` because Pure fire engine that is the test oracle for fire state; contract forbids I/O, React, or Date.now(), so changes can silently alter every derived fire state.
- `src/data/entriesStore.ts` because Sole persistence boundary for scores and notes; the contract requires loadEntries never to throw and a round trip to deep-equal saved data.
- `src/data/settingsStore.ts` because Persists the flame color preference; the contract requires invalid values to fall back to Amber and round trips to be exact.
- `src/hooks/useEntries.ts` because Enforces score validation (1..5, no future dates) and ordered persistence, and derives fire via useMemo; contract-mandated behavior lives here.
- `src/components/Bonfire/flameModel.ts` because Pure flame math with contract guarantees (intensity(0)===0, strict monotonicity, soft cap) checked by flameModel.test.ts.
- `src/domain/achievements.ts` because Derives unlockable flame styles from streak and time thresholds; changes can revoke or grant user progress.
- `src/domain/flames.ts` because Flame style catalog that achievements and settings depend on; renaming or removing ids breaks saved selections.
- `src/hooks/useSettings.ts` because Validates the flame color enum and persists it; flagged for ownership risk and tied to FR 016/017.
- `src/theme/palettes.ts` because Palettes are ported from the design source for visual parity; edits change the flame look that the spec and design expect.
- `src/components/Calendar/CalendarSheet.tsx` because Hosts the swipe-up calendar that is the only UI path for logging, editing, and clearing scores, so regressions block core use.
- `src/screens/BonfireScreen.tsx` because Top-level screen wiring stores, hooks, and the Skia scene together; flagged by analysis for import-cycle and ownership risk.
- `jest.setup.js` because Global test environment setup (including AsyncStorage mocking the contract tests rely on); changes can make all tests pass or fail spuriously.

## Never-Touch Paths

- `specs/**` because Product specs and contracts are the authoritative statement of scope and fix policy and are maintained by humans.
- `.agents/skills/**` because Agent skill files define project workflow instructions and are not application code.
- `.claude/skills/**` because Agent skill files define project workflow instructions and must stay in sync with the spec kit tooling.
- `src/data/**/v1 storage key literal` because The versioned AsyncStorage key is the migration anchor for saved scores; renaming it without a migration loses user data.
- `**/.env*` because secrets must never be modified by Gardener.
- `**/secrets/**` because secret material requires human handling.

## Autonomous Fixes Allowed

- Under the current no_autonomy classification, make no autonomous code changes; only report findings.
- If autonomy is later permitted, limit to prettier formatting and eslint --fix on non-protected files under src/components/Settings or __tests__ with no behavior change.

## Assisted Fixes Allowed

- Type-level fixes under strict TypeScript that preserve runtime behavior in src/components and src/hooks, reviewed by a maintainer.
- Adding missing unit tests for contract guarantees (for example, fire.ts behavior table rows or settingsStore invalid-color fallback) without changing production logic.
- Dependency patch updates for jest-expo, eslint-config-expo, or @types packages, verified by the full test run.

## Advisory-Only Areas

- Fire scoring rules (gap tolerance, strength contribution curve, extinguish policy) because they are product decisions defined in the spec.
- Skia and Reanimated rendering performance on device, which needs manual inspection.
- Achievement thresholds and unlock timing for collectible flame styles.
- Fire Health labels (Faint, Steady, Bright, Radiant) and atmosphere tuning from local time.

## Architecture Boundaries

- Keep src/domain/fire.ts pure: no React imports, no AsyncStorage, no Date.now(); today must be passed in as an ISO local date key.
- Only src/data/entriesStore.ts and src/data/settingsStore.ts may touch AsyncStorage; UI and hooks must go through them.
- Hooks (useEntries, useSettings) own state and persistence; components must not write storage directly.
- flameModel.ts stays framework-free math; Skia and Reanimated code stays in src/components/Bonfire.
- Theme tokens and palettes are the single source for colors; components must not hardcode heat or background hex values.
- Score validation (1..5, no future dates) must remain in the hook layer and not be duplicated ad hoc in components.

## Test Rules

- Run the Jest suite via jest-expo over __tests__ (BonfireScreen, CalendarSheet, achievements, fireMetrics, flameModel, flames.catalog) before any change is accepted.
- Mock AsyncStorage for store tests; round-trip tests must assert deep equality of saved and loaded data.
- Fire engine tests must follow the contract behavior table (empty, single score, consecutive, one-day gap, two-day miss) using a fixed today value.
- flameModel tests must keep intensity(0)===0, strict monotonicity in strength, and flameVisual height/glow rules for non-lit states.
- Run TypeScript strict type checking and eslint (eslint-config-expo) alongside tests; a change that fails either is rejected.
- Do not treat the checklist skill as a test source; checklists validate requirement quality, not implementation.

## Ignored Paths

- `node_modules/**`
- `coverage/**`
- `.expo/**`
- `dist/**`
- `web-build/**`
- `ios/build/**`
- `android/build/**`
- `android/.gradle/**`
- `Pods/**`

## Health Priorities

- Current entropy classification: `no_autonomy`.
- Current entropy score: `37.5`.
- Prefer focused, reviewable maintenance PRs.

## Trigger and PR Preferences

- Prefer small PRs scoped to one maintenance category.
- Do not auto-merge Gardener PRs.

## Verification Commands

- `npm run lint`
- `npx jest`
- `node qa-probe.js`

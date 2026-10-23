<!-- gardener-constitution-proposal: v1 -->
# Scope: 002-achievement-flame-unlocks

## Scope

- Specs: local: specs/002-achievement-flame-unlocks
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `.specify/templates/plan-template.md` (spec_path)
- `specs/002-achievement-flame-unlocks/quickstart.md` (spec_path)
- `specs/002-achievement-flame-unlocks/spec.md` (spec_path)
- `src/components/Bonfire/Flame.tsx` (requirement, spec_path)
- `src/components/Calendar/CalendarSheet.tsx` (requirement, spec_path)
- `src/components/Settings/FlameGallery.tsx` (requirement, spec_path)
- `src/components/Settings/FlameRow.tsx` (requirement, spec_path)
- `src/components/Settings/SettingsSheet.tsx` (requirement, spec_path)
- `src/data/settingsStore.ts` (spec_path)
- `src/domain/achievements.ts` (requirement, spec_path)
- `src/domain/dates.ts` (spec_path)
- `src/domain/fire.ts` (requirement, spec_path)
- `src/domain/fireMetrics.ts` (requirement, spec_path)
- `src/domain/flames.ts` (requirement, spec_path)
- `src/hooks/useFlames.ts` (requirement, spec_path)
- `src/hooks/useSettings.ts` (spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `src/theme/palettes.ts` (requirement, spec_path)
- `.specify/extensions/agent-context/extension.yml` (requirement)
- `__tests__/BonfireScreen.test.tsx` (requirement)
- `__tests__/achievements.test.ts` (requirement)
- `src/components/Bonfire/Embers.tsx` (requirement)
- `src/components/Bonfire/flameModel.ts` (requirement)
- `src/data/dayNotesStore.ts` (requirement)
- `src/data/entriesStore.ts` (requirement)
- `src/hooks/useFlamePulses.ts` (requirement)

## Requirements

- FR-001: The app MUST maintain a catalog of flame styles, each tied to exactly one achievement that unlocks it. Amber MUST always be unlocked and serves as the default style.
- FR-002: All flame styles except Amber — including Crimson and Sapphire — MUST be achievement-locked by default.
- FR-003: Each achievement MUST be classified as either streak-specific or time-specific.
- FR-004: A flame's unlock state MUST be derived deterministically from the full calendar of scores and the current date, recomputed on every change, so the result is order-independent (consistent with feature 001's fire computation). Unlock states MUST NOT be stored.
- FR-005: A streak-specific flame MUST be unlocked exactly while the current alive run satisfies its condition. It MUST relock when the fire goes out (the run ends and strength resets) or when an edit causes the run to no longer satisfy the condition.
- FR-006: A time-specific flame MUST unlock on its achievement day — the most recent calendar day that completes its condition, determined from the calendar and NOT from the current date.
- FR-007: A time-specific flame MUST remain unlocked only while BOTH (a) the current date is within its window — from the achievement day D through D + W inclusive (W = the flame's window length in days), expiring once the date passes D + W — AND (b) the fire is currently lit. After the window elapses with no re-completion, it MUST relock ("expire").
- FR-008: Re-completing a time-specific condition on a later calendar day MUST reset the window to count from that later day. The window MUST count only from the most recent completion; days MUST NOT be banked or accumulated across completions.
- FR-009: Re-completing a time condition while the flame is still in-window MUST extend availability (window restarts from the newer day); it MUST never shorten the remaining availability.
- FR-010: If a time-specific condition is completed only by a past (backfilled) day whose window has already elapsed relative to the current date, the flame MUST remain locked.
- FR-011: The catalog MUST order difficulty to match exoticness: harder achievements map to more exotic/exciting flames, and time-specific flames MUST be the most exotic tier (the hardest, most visually striking styles).
- FR-012: Users MUST be able to select any flame in the catalog as their active style, replacing the former simple color selection.
- FR-013: While the active flame is unlocked, the lit fire MUST render that flame's full style.
- FR-014: While the active flame is locked (never earned, streak relocked, or time-expired), the lit fire MUST render a dim, desaturated "embered" variant of that same flame until it is (re)earned, at which point it MUST return to full vibrancy automatically. Amber, always unlocked, MUST never render as embered.
- FR-015: When the fire is out, the existing out-state visuals (charred logs + smoke, no flame/embers) MUST take precedence over any equipped flame style.
- FR-016: The app MUST provide a flame gallery (reached from the settings surface) listing every flame in the catalog with its current unlocked/locked status.
- FR-017: For each locked flame, the gallery MUST show its name, its colors, and the achievement required to unlock it.
- FR-018: The gallery MUST show live progress toward each locked flame — for streak flames a progress measure toward the condition (e.g., current / required), and for time flames the days remaining in the window (computed as (D + W) − today, where D is the achievement day and W the window length), or, when expired, an indication of how to re-earn it.
- FR-019: Newly meeting an achievement MUST make the flame unlocked and equippable without requiring an app restart (reflected at the next render of the fire and gallery).
- FR-020: Adding, changing, or clearing any day's score MUST recompute all flame unlock states and update both the gallery and the rendered fire.
- FR-021: The user's active flame selection MUST persist across app restarts. (Because unlock states are derived, a selection may be locked on restart and render embered until re-earned.)
- FR-022: Every streak-specific and time-specific flame MUST be re-earnable indefinitely after relocking or expiry; no flame is consumed permanently by being earned once.
- FR-023: The app SHOULD give brief in-app feedback when a flame newly unlocks (for example, a subtle highlight or animation in the gallery and/or on the fire). No push notifications are in scope.
- FR-024: Each flame in the catalog MUST have a defined full style (its multicolor gradient / fade) and a defined embered variant derived from it.
- FR-025: The user MUST be able to open the calendar with an upward swipe begun anywhere on the closed main view (a full-screen "status-bar-shade" pull), not only from a small handle. Taps elsewhere (e.g. the settings button) MUST still work — the pull activates only on upward movement. (Refines feature 001's swipe-up/down calendar reveal.)

## Shared Seams

- `.specify/templates/plan-template.md` is also in: 001-bonfire-productivity-tracker
- `__tests__/BonfireScreen.test.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory
- `__tests__/achievements.test.ts` is also in: 001-bonfire-productivity-tracker
- `src/components/Bonfire/Embers.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 004-flame-visual-profiles
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/components/Bonfire/flameModel.ts` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 004-flame-visual-profiles, 007-fire-health
- `src/components/Calendar/CalendarSheet.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 005-tiny-daily-memory
- `src/components/Settings/FlameGallery.tsx` is also in: 001-bonfire-productivity-tracker
- `src/components/Settings/FlameRow.tsx` is also in: 003-ui-flame-polish, 004-flame-visual-profiles
- `src/components/Settings/SettingsSheet.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish
- `src/data/dayNotesStore.ts` is also in: 001-bonfire-productivity-tracker, 005-tiny-daily-memory
- `src/data/entriesStore.ts` is also in: 001-bonfire-productivity-tracker
- `src/data/settingsStore.ts` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 004-flame-visual-profiles
- `src/domain/achievements.ts` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 006-subtle-atmosphere
- `src/domain/dates.ts` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish
- `src/domain/fire.ts` is also in: 001-bonfire-productivity-tracker
- `src/domain/fireMetrics.ts` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish
- `src/domain/flames.ts` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health
- `src/hooks/useFlamePulses.ts` is also in: 006-subtle-atmosphere
- `src/hooks/useFlames.ts` is also in: 003-ui-flame-polish, 004-flame-visual-profiles, 006-subtle-atmosphere
- `src/hooks/useSettings.ts` is also in: 001-bonfire-productivity-tracker, 004-flame-visual-profiles
- `src/screens/BonfireScreen.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/theme/palettes.ts` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 005-tiny-daily-memory, 007-fire-health

<!-- gardener-generated: 013ce72946 053129daa8 074b0a97c6 099ee6cfe7 0e00eb7b14 0ef0463adb 13ad476fe4 1421f92e9e 1439d77371 187774afea 1e7eeb75b5 226dc824e4 24e15e9073 25069d96ae 2848b4bdef 28c3303bcb 28c5b65f12 2b040c27af 333df71399 35004ad441 3657738dc2 382b452d5c 4b89939e5d 4f8c454f13 53a7e6dc39 55adeddf37 561d687a29 56fcd111ce 5790957040 594786116c 61e6e49585 66c4d7998c 6bba34278f 6c711ad9ca 7425dee5df 752a430a32 778fb7a93b 7904916ee0 7bdd366bc4 7e85ca8dd0 835a59712a 886d0f18e1 8efd1cf2b3 9286d77f7b 951e49e268 973a92aad0 9ed0cd7191 a188459fe6 a3007505b0 a3150b7a3c a6c9d7a488 ae5d4b69f1 b106e39660 b8d7839ccb b8ef3e7305 baa8f3ab69 baac0f0492 bafe0bf108 befd55a319 c3f772695f c763a0528b c819444ced cae87fdaa4 cddc973089 d19b2e9c81 d1d9f65997 d5c4d50f05 dd76ac8f17 e0468d59f6 e9dd348bea f08bbb0a60 f113aaa64c f44d251e6f fb6dbf775c fbbc695cb3 fbf9f74cc1 -->

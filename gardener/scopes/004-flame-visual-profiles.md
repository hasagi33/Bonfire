<!-- gardener-constitution-proposal: v1 -->
# Scope: 004-flame-visual-profiles

## Scope

- Specs: local: specs/004-flame-visual-profiles
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `specs/004-flame-visual-profiles/contracts/particle-variants.md` (spec_path)
- `specs/004-flame-visual-profiles/contracts/renderer-profile-contract.md` (spec_path)
- `specs/004-flame-visual-profiles/contracts/visual-profile-data.md` (spec_path)
- `specs/004-flame-visual-profiles/data-model.md` (spec_path)
- `specs/004-flame-visual-profiles/plan.md` (spec_path)
- `specs/004-flame-visual-profiles/quickstart.md` (spec_path)
- `specs/004-flame-visual-profiles/research.md` (spec_path)
- `specs/004-flame-visual-profiles/spec.md` (spec_path)
- `src/components/Bonfire/Embers.tsx` (requirement, spec_path)
- `src/components/Bonfire/Flame.tsx` (requirement, spec_path)
- `src/components/Bonfire/flameModel.ts` (requirement, spec_path)
- `src/data/settingsStore.ts` (spec_path)
- `src/domain/flames.ts` (requirement, spec_path)
- `src/hooks/useFlames.ts` (requirement, spec_path)
- `src/hooks/useSettings.ts` (spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `__tests__/BonfireScreen.test.tsx` (requirement)
- `jest.setup.js` (requirement)
- `src/components/Calendar/DayCell.tsx` (requirement)
- `src/components/Settings/FlameRow.tsx` (requirement)

## Requirements

- FR-001: Each of the existing 20 flame styles MUST include a visual profile containing shape, motion, particles, aura, accents, palette intent, and profile-specific scale data where those traits exist in BonfireDesign.
- FR-002: Visual profiles MUST be data-driven per flame style so each flame's rendering can be changed by profile data without changing unlock rules, stored settings, gallery eligibility, or fire strength math.
- FR-003: BonfireDesign MUST be treated as the authoritative visual source for the 20 flame profiles; product visuals MUST match its designed silhouettes, layer composition, motion families, aura kinds, accents, particles, opacity, inversion, footprint, and core-scale intent.
- FR-004: Shape data MUST describe tongue count, tongue transforms, edge treatment, width multiplier, height multiplier, footprint, core scale when applicable, and one or more visual variants such as classic, lance, split, forked, twin, wide, warped, detached, squat, layered, crystal, crown, solar, inverted, ribbon, or wing.
- FR-005: Motion data MUST describe flicker family, flicker speed, sway, stretch, pulse, float, warp, ribbon wave, hue drift, phase lag, and whether each motion reads as smooth, harsh, low-gravity, unstable, or powerful according to BonfireDesign.
- FR-006: Particle data MUST describe motif, count, size, rise behavior, drift behavior, color source, and combinations of motifs such as sparks, motes, ash, bubbles, shards, wisps, stars, flare particles, aurora bands, or orbiting motes.
- FR-007: Aura and accent data MUST describe halo shape and intensity, dim or crisp modifiers, secondary glows, ground glow, circular outlines, shock pulses, aurora bands, afterimages, orbit rings, and void rings as specified by BonfireDesign.
- FR-008: The 20 flame styles MUST follow the BonfireDesign catalog map: - Amber: common #01 classic balanced bonfire; single rounded teardrop, warm cream core, oval warm halo, standard sparks, soft baseline flicker. - Crimson: common #02 sharper faster flame; classic pointed tongue tips, hot peach core, stronger red oval halo, heavier red sparks, faster pulse. - Sapphire: common #03 tall cool flame; slender teardrop roughly one-third taller than Amber, elongated blue-white core, tall halo, sparse blue-wh
- FR-009: Product flame visuals MUST pass a design-parity review against BonfireDesign for each flame's silhouette, core, aura, particles, motion, accent behavior, relative scale, and rarity expression.
- FR-010: Rarer flames MUST provide visibly more exotic shape, particle, or aura behavior than common flames, while common flames remain readable as enhanced bonfire variants.
- FR-011: Existing flame unlock logic MUST remain unchanged; adding visual profiles MUST NOT add, remove, weaken, or strengthen any achievement condition.
- FR-012: Existing flame selection storage MUST remain unchanged; visual profile data MUST NOT require new persisted user data.
- FR-013: Existing gallery behavior MUST remain unchanged, including locked flame display, selection eligibility, active-state display, and any rejection behavior for unavailable flames.
- FR-014: Existing fire strength math MUST remain unchanged; each visual profile MAY define its own response to strength, including size and non-size visual changes, only if the same strength value and thresholds continue to produce the same gameplay state.
- FR-015: Rendering MUST handle every flame profile without visible blank states, broken particles, missing aura artifacts, or loss of the designed BonfireDesign identity.
- FR-016: Visual profile effects MUST preserve >=120 FPS flame rendering and >=60 FPS UI interactions during normal flame viewing, flame switching, and gallery interaction.
- FR-017: Visual profile data MUST keep enough design metadata for reviewers to trace each product flame back to its BonfireDesign silhouette, core, aura, particle, motion, and implementation-intent notes.

## Shared Seams

- `__tests__/BonfireScreen.test.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 005-tiny-daily-memory
- `jest.setup.js` is also in: 001-bonfire-productivity-tracker, 005-tiny-daily-memory, 006-subtle-atmosphere
- `src/components/Bonfire/Embers.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health, 008-user-handbook
- `src/components/Bonfire/flameModel.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 007-fire-health
- `src/components/Calendar/DayCell.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 006-subtle-atmosphere, 007-fire-health
- `src/components/Settings/FlameRow.tsx` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/data/settingsStore.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/domain/flames.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 006-subtle-atmosphere, 007-fire-health, 008-user-handbook
- `src/hooks/useFlames.ts` is also in: 002-achievement-flame-unlocks, 003-ui-flame-polish, 006-subtle-atmosphere
- `src/hooks/useSettings.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks
- `src/screens/BonfireScreen.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health

<!-- gardener-generated: 02777c5443 037cffe737 062e84aa5f 09aac76aea 0b3a662580 0ce2ed7868 0ff58ddce3 11574edf5f 159c1a8397 15decef11a 187774afea 20556d6d8c 2162b37df1 226dc824e4 235c580493 276523bb82 2d11823fde 31f2d33312 3276818a7b 3708a2216a 3e01f8b686 42f07fe7f3 4a8b4cba4f 4d3b35218d 5f012fbea1 669376f079 67081a9462 6852f13917 702c3709ec 730636b40b 760ee60244 7904916ee0 7dc1f5e10b 7e85ca8dd0 7f465ed2df 9bcc1b1e1e 9fb85a3d21 a3150b7a3c a9397f1865 abbc9802c3 b734ed91b1 b8ef3e7305 b917e8ca32 baa8f3ab69 c167009469 c3dee92246 c3f772695f dd3781018e ec1cf70cf5 ecd57da8b0 f7451d799a -->

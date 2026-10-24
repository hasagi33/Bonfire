<!-- gardener-constitution-proposal: v1 -->
# Scope: 008-user-handbook

## Scope

- Specs: local: specs/008-user-handbook
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `docs/handbook/getting-started.md` (spec_path)
- `.specify/workflows/speckit/workflow.yml` (requirement)
- `__tests__/DayNoteEditor.test.tsx` (requirement)
- `src/components/Bonfire/Flame.tsx` (requirement)
- `src/data/dayNotesStore.ts` (requirement)
- `src/domain/flames.ts` (requirement)

## Requirements

- FR-001: The handbook files under `docs/handbook/` are published, legally reviewed user-facing text. They are approved by the product owner and the store reviewer before every release, so they must never be modified by automated tools or bots, including maintenance bots. Only the product owner edits them, by hand.
- FR-002: The in-app help screen renders `docs/handbook/getting-started.md` verbatim.

## Shared Seams

- `__tests__/DayNoteEditor.test.tsx` is also in: 005-tiny-daily-memory
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 005-tiny-daily-memory, 006-subtle-atmosphere, 007-fire-health
- `src/data/dayNotesStore.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 005-tiny-daily-memory
- `src/domain/flames.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health

<!-- gardener-generated: 27f56edbae 69903feacb 7a22b8c27f 7c622e700e 9af89e578e a45a7bf81e a916ecb1d4 af847e983d b191d8c114 c3f772695f da902b6e2b dd76ac8f17 f3297d9ee8 f70fabdae1 -->

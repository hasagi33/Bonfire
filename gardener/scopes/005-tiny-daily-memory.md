<!-- gardener-constitution-proposal: v1 -->
# Scope: 005-tiny-daily-memory

## Scope

- Specs: local: specs/005-tiny-daily-memory
- Follow every requirement and accepted decision below when changing a file of this scope. Out-of-scope items must not be added.

## Code Footprint

- `specs/005-tiny-daily-memory/quickstart.md` (spec_path)
- `src/components/Calendar/CalendarSheet.tsx` (requirement, spec_path)
- `src/components/Calendar/DayNoteEditor.tsx` (requirement, spec_path)
- `src/components/Calendar/MonthGrid.tsx` (spec_path)
- `src/data/dayNotesStore.ts` (requirement, spec_path)
- `src/hooks/useDayNotes.ts` (requirement, spec_path)
- `src/screens/BonfireScreen.tsx` (requirement, spec_path)
- `App.tsx` (requirement)
- `__tests__/BonfireScreen.test.tsx` (requirement)
- `__tests__/DayNoteEditor.test.tsx` (requirement)
- `jest.setup.js` (requirement)
- `src/components/Bonfire/Flame.tsx` (requirement)
- `src/hooks/useEntries.ts` (requirement)
- `src/theme/palettes.ts` (requirement)

## Requirements

- FR-001: The user MUST be able to add an optional personal note to a day after assigning a score.
- FR-002: The user MUST be able to view the saved note when opening that day in day detail.
- FR-003: The user MUST be able to edit or replace a saved note from day detail.
- FR-004: A note MUST be stored with the day so that it remains available after leaving and returning to the calendar.
- FR-005: Notes MUST appear only in day detail and MUST NOT appear in the monthly calendar view, any timeline view, or any other overview surface.
- FR-006: The app MUST NOT generate summaries, sentiment labels, coaching text, or other automatic interpretation from note content.
- FR-007: The app MUST show note text as user-entered content and MUST NOT rewrite, score, or reframe it.
- FR-008: Notes MUST be optional; a day with no note MUST remain fully usable.
- FR-009: Blank or whitespace-only note input MUST NOT be stored as a note.
- FR-010: Notes MUST NOT add memory marks, badges, icons, or other note indicators to the month calendar surface.

## Out of Scope

- No summary generation.
- No sentiment analysis.
- No monthly note timeline.
- No memory badges or marks in the month grid.

## Shared Seams

- `App.tsx` is also in: 001-bonfire-productivity-tracker, 007-fire-health
- `__tests__/BonfireScreen.test.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles
- `__tests__/DayNoteEditor.test.tsx` is also in: 008-user-handbook
- `jest.setup.js` is also in: 001-bonfire-productivity-tracker, 004-flame-visual-profiles, 006-subtle-atmosphere
- `src/components/Bonfire/Flame.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health, 008-user-handbook
- `src/components/Calendar/CalendarSheet.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish
- `src/components/Calendar/DayNoteEditor.tsx` is also in: 001-bonfire-productivity-tracker
- `src/components/Calendar/MonthGrid.tsx` is also in: 001-bonfire-productivity-tracker, 003-ui-flame-polish, 007-fire-health
- `src/data/dayNotesStore.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 008-user-handbook
- `src/hooks/useEntries.ts` is also in: 001-bonfire-productivity-tracker
- `src/screens/BonfireScreen.tsx` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 004-flame-visual-profiles, 006-subtle-atmosphere, 007-fire-health
- `src/theme/palettes.ts` is also in: 001-bonfire-productivity-tracker, 002-achievement-flame-unlocks, 003-ui-flame-polish, 007-fire-health

<!-- gardener-generated: 018d9c8099 056ae6eb07 074b0a97c6 148843fcf5 1a88ab0fc1 200037df70 29863abc9b 29b617cef5 2cc3d59109 31f3684ebe 3b9cc283f9 4037763562 436640047c 4837107f5c 4d3b35218d 4d6d2a9482 5a3237deda 5b3716c40c 5ed4140f8e 5feb965319 60390aba61 60ee06206c 69903feacb 876d035efa 8ec5d3cedd 9b19257a2a a3150b7a3c af847e983d b8ef3e7305 b8ff72dd3b c093726aad c3f772695f cf9ee40869 d4509a6e55 d80aaf2251 d80c10d0e4 df898050c5 e0f116c8c8 e1400aab3e e6b523a19e ead2b69e75 f469e58b69 -->

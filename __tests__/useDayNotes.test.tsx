/**
 * useDayNotes.test.tsx — hook tests for selected-day note state.
 *
 * A tiny probe component exposes hook state through props so tests can drive
 * selected-day changes, draft edits, saving, and clearing without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDayNotes, type UseDayNotes } from '../src/hooks/useDayNotes';
import type { DateKey } from '../src/domain/dates';

let latest!: UseDayNotes;
let setSelected!: React.Dispatch<React.SetStateAction<DateKey | null>>;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const [selected, updateSelected] = React.useState<DateKey | null>('2026-06-10');
  const notes = useDayNotes(selected);
  React.useEffect(() => {
    latest = notes;
    setSelected = updateSelected;
  }, [notes, updateSelected]);
  return <Text>{notes.draft}</Text>;
}

async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

beforeEach(async () => {
  await AsyncStorage.clear();
  latest = undefined as unknown as UseDayNotes;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('syncs the draft when the selected day changes', async () => {
  await AsyncStorage.setItem(
    'bonfire.dayNotes.v1',
    JSON.stringify({
      '2026-06-10': 'first day',
      '2026-06-11': 'second day',
    }),
  );
  await renderProbe();

  expect(latest.draft).toBe('first day');

  await act(async () => {
    setSelected('2026-06-11');
  });

  expect(latest.draft).toBe('second day');
});

test('autosaves edited draft text for the selected day', async () => {
  await renderProbe();

  await act(async () => {
    latest.setDraft('exact words stay here');
  });

  expect(JSON.parse((await AsyncStorage.getItem('bonfire.dayNotes.v1'))!)).toEqual({
    '2026-06-10': 'exact words stay here',
  });
  expect(latest.savedText).toBe('exact words stay here');
});

test('empty autosave clears selected day note without touching other notes', async () => {
  await AsyncStorage.setItem(
    'bonfire.dayNotes.v1',
    JSON.stringify({
      '2026-06-10': 'delete me',
      '2026-06-11': 'keep me',
    }),
  );
  await renderProbe();

  await act(async () => {
    latest.setDraft('');
  });

  expect(JSON.parse((await AsyncStorage.getItem('bonfire.dayNotes.v1'))!)).toEqual({
    '2026-06-11': 'keep me',
  });
  expect(latest.draft).toBe('');
  expect(latest.savedText).toBe('');
});

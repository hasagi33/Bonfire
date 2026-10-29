/**
 * dayNotesStore.test.ts — local note persistence regression tests.
 *
 * These tests pin the storage contract: notes survive reload, blank input is
 * not stored, replacement overwrites the same day, and corrupt data is ignored.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearDayNote,
  loadDayNotes,
  saveDayNote,
  saveDayNotes,
} from '../src/data/dayNotesStore';

const STORAGE_KEY = 'bonfire.dayNotes.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
});

test('saves then reopens the same note text', async () => {
  await saveDayNote('2026-06-10', 'felt focused after lunch');

  expect(await loadDayNotes()).toEqual({
    '2026-06-10': 'felt focused after lunch',
  });
});

test('rejects empty note input', async () => {
  await saveDayNote('2026-06-10', '');

  expect(await loadDayNotes()).toEqual({});
});

test('saving again replaces the previous note for that day', async () => {
  await saveDayNote('2026-06-10', 'first note');
  await saveDayNote('2026-06-10', 'replacement note');

  expect(await loadDayNotes()).toEqual({
    '2026-06-10': 'replacement note',
  });
});

test('clearing removes the note for one day only', async () => {
  await saveDayNotes({
    '2026-06-10': 'keep this',
    '2026-06-11': 'remove this',
  });

  await clearDayNote('2026-06-11');

  expect(await loadDayNotes()).toEqual({
    '2026-06-10': 'keep this',
  });
});

test('returns an empty map on malformed or unusable storage', async () => {
  await AsyncStorage.setItem(STORAGE_KEY, 'not-json');
  expect(await loadDayNotes()).toEqual({});

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(['not', 'a', 'map']));
  expect(await loadDayNotes()).toEqual({});
});

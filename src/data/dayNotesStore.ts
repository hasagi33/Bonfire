/**
 * dayNotesStore.ts — local persistence boundary for day notes.
 *
 * The calendar stores one optional plain-text note per day. This module keeps
 * notes separate from score entries so note data never affects fire scoring or
 * month rendering. Callers work with a small date-key map; storage details stay
 * isolated here.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DateKey } from '../domain/dates';

const STORAGE_KEY = 'bonfire.dayNotes.v1';

export type DayNotes = Record<DateKey, string>;

function cleanNotes(parsed: unknown): DayNotes {
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  const clean: DayNotes = {};
  for (const [dateKey, text] of Object.entries(parsed)) {
    if (typeof text === 'string' && text.length > 0) {
      clean[dateKey] = text;
    }
  }
  return clean;
}

/**
 * Load notes from local storage. Bad or missing stored data resolves to an empty
 * map so the calendar can always open without blocking the rest of the app.
 */
export async function loadDayNotes(): Promise<DayNotes> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    return cleanNotes(JSON.parse(raw) as unknown);
  } catch {
    return {};
  }
}

/** Persist the full day-note map, replacing the previous local value. */
export async function saveDayNotes(notes: DayNotes): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleanNotes(notes)));
}

/**
 * Save or replace a single note. Empty text removes the note
 * for that day; other text is stored verbatim with no trimming or analysis.
 */
export async function saveDayNote(dateKey: DateKey, text: string): Promise<DayNotes> {
  const notes = await loadDayNotes();
  const next = { ...notes };
  if (text.length === 0) {
    delete next[dateKey];
  } else {
    next[dateKey] = text;
  }
  await saveDayNotes(next);
  return next;
}

/** Remove a single day's note and return the updated map. */
export async function clearDayNote(dateKey: DateKey): Promise<DayNotes> {
  return saveDayNote(dateKey, '');
}

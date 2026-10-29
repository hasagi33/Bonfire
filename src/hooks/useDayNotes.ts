/**
 * useDayNotes.ts — selected-day note state for the calendar sheet.
 *
 * The hook loads all local notes once, mirrors the selected day's saved note
 * into an editable draft, and autosaves each edit. It keeps validation tiny:
 * empty drafts clear storage, while any other draft persists exactly
 * as typed.
 */

import { useCallback, useEffect, useState } from 'react';
import type { DateKey } from '../domain/dates';
import {
  loadDayNotes,
  saveDayNote,
  type DayNotes,
} from '../data/dayNotesStore';

interface DraftState {
  dateKey: DateKey | null;
  text: string;
}

export interface UseDayNotes {
  notes: DayNotes;
  draft: string;
  savedText: string;
  ready: boolean;
  setDraft: (text: string) => void;
}

export function useDayNotes(selectedDate: DateKey | null): UseDayNotes {
  const [notes, setNotes] = useState<DayNotes>({});
  const [draftState, setDraftState] = useState<DraftState>({
    dateKey: null,
    text: '',
  });
  const [ready, setReady] = useState(false);

  // Load once; notes are small and local, so one map read covers all selected
  // days without scanning during month rendering.
  useEffect(() => {
    let active = true;
    loadDayNotes().then(loaded => {
      if (active) {
        setNotes(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const savedText = selectedDate ? notes[selectedDate] ?? '' : '';
  const draft = draftState.dateKey === selectedDate ? draftState.text : savedText;

  const setDraft = useCallback(
    (text: string) => {
      if (!selectedDate) {
        return;
      }
      const dateKey = selectedDate;
      setDraftState({ dateKey, text });
      setNotes(prev => {
        const next = { ...prev };
        if (text.length === 0) {
          delete next[dateKey];
        } else {
          next[dateKey] = text;
        }
        saveDayNote(dateKey, text).catch(() => {});
        return next;
      });
    },
    [selectedDate],
  );

  return { notes, draft, savedText, ready, setDraft };
}

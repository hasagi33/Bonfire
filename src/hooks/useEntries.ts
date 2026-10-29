/**
 * useEntries.ts — the React hook that ties storage and the fire engine together.
 *
 * Components use this hook to read the current entries + derived fire state, and
 * to change scores. It:
 *   - loads saved entries once on mount (and flips `ready` to true),
 *   - validates and applies score changes,
 *   - recomputes the fire (via the pure engine) whenever entries or today change.
 *
 * The fire is always DERIVED from entries — never stored separately — so there
 * is a single source of truth and the display can't drift out of sync.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { isFuture, type DateKey } from '../domain/dates';
import {
  computeFire,
  isScore,
  type Entries,
  type FireState,
  type Score,
} from '../domain/fire';
import { loadEntries } from '../data/entriesStore';

export interface UseEntries {
  entries: Entries; // raw date -> score map
  fire: FireState; // derived bonfire description
  ready: boolean; // false until the first load finishes
  setScore: (date: DateKey, score: Score) => void; // add/replace a day's score
  clearScore: (date: DateKey) => void; // remove a day's score
}

/**
 * @param today the current local date key; passed in so the hook and fire
 *              engine stay testable.
 */
export function useEntries(today: DateKey): UseEntries {
  const [entries, setEntries] = useState<Entries>({});
  const [ready, setReady] = useState(false);

  // Load persisted entries once, when the hook first runs.
  useEffect(() => {
    let active = true; // guards against setting state after unmount
    loadEntries().then(loaded => {
      if (active) {
        setEntries(loaded);
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Add or replace a day's score. Rejects invalid scores and future dates so
  // bad data can never reach the fire engine; the UI updates at once.
  const setScore = useCallback(
    (date: DateKey, score: Score) => {
      if (!isScore(score) || isFuture(date, today)) {
        return; // ignore invalid input (FR-003)
      }
      setEntries(prev => ({ ...prev, [date]: score }));
    },
    [today],
  );

  // Remove a day's score (the day becomes "missed" again).
  const clearScore = useCallback((date: DateKey) => {
    setEntries(prev => {
      if (!(date in prev)) {
        return prev; // nothing to remove
      }
      const next = { ...prev };
      delete next[date];
      return next;
    });
  }, []);

  // Recompute the fire only when the inputs actually change (memoized for perf).
  const fire = useMemo(() => computeFire(entries, today), [entries, today]);

  return { entries, fire, ready, setScore, clearScore };
}

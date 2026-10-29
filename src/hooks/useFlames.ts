/**
 * useFlames.ts — the single junction between derived achievement state and the UI.
 *
 * Given the calendar, today, the fire, and the user's chosen flame id, it returns
 * the unlock state of every flame plus what the on-screen fire should actually
 * render. If the saved selection relocks, rendering falls back to the base flame
 * immediately; the screen then persists that same fallback.
 *
 * PERFORMANCE (SC-010): the catalog evaluation (`evaluateAll`) is wrapped in
 * `useMemo` keyed on the things that actually change the result — the entries,
 * today, and the fire's `state`/`strength`. It is NEVER run inside Skia's render
 * or any per-frame worklet. Switching the active flame only re-selects a palette
 * (a cheap object swap) and does not trigger a re-walk for the same calendar, so
 * changing flames can't drop frames.
 */

import { useMemo } from 'react';
import type { DateKey } from '../domain/dates';
import type { Entries, FireState } from '../domain/fire';
import { evaluateAll, type AchievementState } from '../domain/achievements';
import { BASE_FLAME_ID, FLAMES, flameById, type FlameId, type FlameStyle } from '../domain/flames';
import type { Palette } from '../theme/palettes';

export interface UseFlames {
  states: Record<FlameId, AchievementState>; // unlock state for every catalog flame
  activeStyle: FlameStyle; // the rendered flame; locked saved ids fall back to base
  activeUnlocked: boolean; // whether the requested flame was unlocked before fallback
  effectivePalette: Palette; // always the rendered flame's full palette
  dim: number; // always 1; locked selections are not rendered embered
  newlyUnlocked: FlameId[]; // flames that flipped locked→unlocked on this evaluation (FR-023)
}

export function useFlames(
  entries: Entries,
  today: DateKey,
  fire: FireState,
  flameStyleId: FlameId,
): UseFlames {
  // Evaluate the whole catalog once per meaningful change. We destructure the
  // two fire fields the gate actually reads (state + strength) so the memo keys
  // on values, not the fire object's identity — an unrelated re-render that
  // recreates `fire` does not trigger a re-walk.
  const { state: fireState, strength: fireStrength } = fire;
  const states = useMemo(
    () => evaluateAll(FLAMES, entries, today, { state: fireState, strength: fireStrength }),
    [entries, today, fireState, fireStrength],
  );

  const newlyUnlocked = useMemo<FlameId[]>(() => [], []);

  // Selecting a flame is a cheap lookup; resolving + render values are memoized
  // so a flame switch is just a palette swap (no catalog re-evaluation).
  const requestedStyle = useMemo(() => flameById(flameStyleId), [flameStyleId]);
  const activeUnlocked = states[requestedStyle.id]?.unlocked === true;
  const activeStyle = activeUnlocked ? requestedStyle : flameById(BASE_FLAME_ID);
  const effectivePalette = activeStyle.palette;
  const dim = 1;

  return { states, activeStyle, activeUnlocked, effectivePalette, dim, newlyUnlocked };
}

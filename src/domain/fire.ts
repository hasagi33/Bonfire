/**
 * fire.ts — the pure "fire engine" at the heart of the app.
 *
 * NO React, NO storage — just functions that turn the user's calendar of scores
 * into a description of the bonfire. It is a faithful TypeScript port of
 * `BonfireDesign/logic.js`, so the app behaves exactly like the reference
 * design. Because it is pure (same inputs → same output, and "today" is passed
 * in rather than read from the clock) it can be tested exhaustively.
 *
 * Rules (from the spec / logic.js):
 *  - Each day can have a score 1–5. Strength added per day: 1→0, 2→1, 3→2,
 *    4→3, 5→4. A score of 1 keeps the fire alive but adds no size.
 *  - The fire's strength is the running total of contributions in the CURRENT
 *    alive run.
 *  - Up to two missed PAST days are survivable. THREE missed past days in a row put the
 *    fire OUT and reset its strength to 0. A later score relights it from 0.
 *  - "Today", while unscored, is not a miss yet.
 *  - The result depends only on the (date, score) pairs and today, so editing /
 *    back-filling past days recomputes deterministically and order-independently.
 */

import { addDays, isPast, ymd, type DateKey } from './dates';

// A productivity score is an integer from 1 to 5.
export type Score = 1 | 2 | 3 | 4 | 5;

// All stored data: a map of date key → score. A date with no entry is "missed".
export type Entries = Record<DateKey, Score>;

// The three things the fire can be.
export type FireStatus = 'unlit' | 'lit' | 'out';

// How a single calendar day is classified for the grid.
export type DayKind = 'future' | 'scored' | 'today' | 'missed';

// A short caption describing the fire (mirrors the design's wording).
export interface FireLabel {
  word: string;
  sub: string;
}

// A full description of the bonfire, derived from Entries + today.
export interface FireState {
  state: FireStatus; // 'unlit' = never lit; 'out' = was lit then extinguished
  strength: number; // ≥ 0; size of the current alive run (0 when not lit)
  everLit: boolean; // any scored day exists (distinguishes unlit vs out)
  label: FireLabel; // caption from fireLabel
}

/**
 * Map a score to the strength it contributes.
 * 1→0 (maintain only), 2→1, 3→2, 4→3, 5→4 — i.e. `max(0, score − 1)`.
 */
export function contribution(score: Score): number {
  return Math.max(0, score - 1);
}

// Type guard: is this a valid 1–5 score? Guards against corrupt stored data.
export function isScore(value: unknown): value is Score {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/**
 * Compute the full fire state from all entries, evaluated against `today`.
 *
 * Walk every calendar day from the earliest scored day through today:
 *  - A scored day adds its contribution; if the fire was out/unlit it first
 *    relights from a spark (strength 0) then adds.
 *  - A past day with no score is a miss; today unscored is NOT a miss.
 *  - Three consecutive missed past days extinguish the fire (strength → 0).
 * Whatever run is alive at today is the fire we show. (Mirrors logic.js.)
 */
export function computeFire(entries: Entries, today: DateKey): FireState {
  // Sort keys so the walk is independent of insertion order.
  const keys = Object.keys(entries)
    .filter(key => isScore(entries[key]))
    .sort();

  if (keys.length === 0) {
    return { state: 'unlit', strength: 0, everLit: false, label: fireLabel('unlit', 0) };
  }

  let cur = keys[0];
  let alive = false;
  let everLit = false;
  let strength = 0;
  let consMiss = 0;

  while (cur <= today) {
    const score = entries[cur];
    if (isScore(score)) {
      if (!alive) {
        // Relight from a fresh spark.
        alive = true;
        strength = 0;
      }
      strength += contribution(score);
      everLit = true;
      consMiss = 0;
    } else if (isPast(cur, today)) {
      // A past day with no score = a miss.
      consMiss += 1;
      if (consMiss >= 3 && alive) {
        alive = false;
        strength = 0;
      }
    }
    // today (cur === today) unscored: not a miss, do nothing.
    cur = addDays(cur, 1);
  }

  let state: FireStatus;
  if (alive) state = 'lit';
  else if (everLit) state = 'out';
  else state = 'unlit';

  return { state, strength, everLit, label: fireLabel(state, strength) };
}

/** Classify a single calendar date for display in the grid. */
export function classifyDay(entries: Entries, dateKey: DateKey, today: DateKey): DayKind {
  // Keys are zero-padded "YYYY-MM-DD", so string comparison is calendar order.
  if (dateKey > today) return 'future';
  if (isScore(entries[dateKey])) return 'scored';
  if (dateKey === today) return 'today';
  return 'missed'; // past, unscored
}

/** A human label + descriptor for the current fire (mirrors logic.js). */
export function fireLabel(state: FireStatus, strength: number): FireLabel {
  if (state === 'unlit') return { word: 'Unlit', sub: 'tap a day to spark it' };
  if (state === 'out') return { word: 'Out', sub: 'three days missed' };
  if (strength <= 0) return { word: 'A spark', sub: 'just catching' };
  if (strength < 6) return { word: 'Kindling', sub: 'finding its feet' };
  if (strength < 14) return { word: 'Steady', sub: 'burning well' };
  if (strength < 26) return { word: 'Blazing', sub: 'going strong' };
  if (strength < 42) return { word: 'Roaring', sub: 'a real bonfire' };
  return { word: 'Inferno', sub: 'unstoppable' };
}

// Re-export `ymd` for callers that build keys (kept here for convenience).
export { ymd };

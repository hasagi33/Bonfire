/**
 * scoring.ts — how much a single logged day adds to the bonfire.
 *
 * Pure and tiny; shared by the fire engine and the run metrics walk so both
 * always agree on the per-day amount.
 */

import type { Score } from './fire';

/**
 * Map a score to the strength it adds.
 * 1→0 (maintain only), 2→1, 3→2, 4→3, 5→4 — i.e. `max(0, score − 1)`.
 */
export function strengthForScore(score: Score): number {
  return Math.max(0, score - 1);
}

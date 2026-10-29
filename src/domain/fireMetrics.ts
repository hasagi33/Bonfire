/**
 * fireMetrics.ts — richer, pure calendar metrics for the achievement layer.
 *
 * Feature 001's `computeFire` answers "is the fire lit and how strong". The
 * achievement system needs MORE detail about the current run and the whole
 * history (how many scored days, the trailing unbroken chain, a per-day
 * timeline) so each flame's unlock condition can be evaluated.
 *
 * Rather than churn `computeFire` (and its oracle tests), this module does ONE
 * extra deterministic walk over the same sorted day keys, using the SAME rules
 * (relight from a spark, one miss survivable, two consecutive past misses put
 * the fire out and zero its strength, today-unscored is not a miss). Because
 * `today` is injected and keys are sorted, the result is fully order-independent
 * — editing/back-filling past days recomputes identically (FR-004, SC-005).
 *
 * NO React, NO storage — just data in, metrics out, so it is exhaustively
 * unit-testable (`__tests__/fireMetrics.test.ts`).
 */

import { addDays, diffDays, isPast, type DateKey } from './dates';
import { isScore, type Entries, type Score } from './fire';
import { strengthForScore } from './scoring';

/**
 * One calendar day's snapshot AFTER it was processed in the walk. Time-specific
 * achievements scan this timeline to find the exact day a condition completed
 * (e.g. "the day the run first crossed strength 100", "a fully scored week").
 */
export interface DayPoint {
  date: DateKey;
  score?: Score; // present only if the day was scored
  alive: boolean; // was the fire alive at the end of this day?
  strength: number; // current-run strength at the end of this day
  consMiss: number; // consecutive missed-past-days count at this day
}

/** Everything the achievement evaluators need, from a single walk. */
export interface RunMetrics {
  runStart: DateKey | null; // first scored day of the current alive run (null if not lit)
  runDays: number; // scored days in the current run ("an N-day run" ⇒ runDays ≥ N)
  runSpanDays: number; // calendar days runStart..today inclusive
  unbrokenChain: number; // consecutive scored days (no gaps) ending at the latest scored day
  strongDaysInRun: number; // scored ≥ 4 in the run
  perfectDaysInRun: number; // scored === 5 in the run
  scoreSumInRun: number; // Σ score over scored days in the run
  timeline: DayPoint[]; // per-day snapshots from the first scored day through today
}

/** The metrics for a fire that is not currently lit: every run-scoped value is empty. */
function emptyMetrics(): RunMetrics {
  return {
    runStart: null,
    runDays: 0,
    runSpanDays: 0,
    unbrokenChain: 0,
    strongDaysInRun: 0,
    perfectDaysInRun: 0,
    scoreSumInRun: 0,
    timeline: [],
  };
}

/**
 * Compute all run/history metrics from the calendar, evaluated against `today`.
 * Mirrors `computeFire`'s walk so the two never disagree about lit/out/strength.
 */
export function computeMetrics(entries: Entries, today: DateKey): RunMetrics {
  // Same sorted, validated key set the fire engine uses (insertion-order free).
  const keys = Object.keys(entries)
    .filter(key => isScore(entries[key]))
    .sort();

  // No scored days at all (or all in the future) → nothing is lit.
  if (keys.length === 0 || keys[0] > today) {
    return emptyMetrics();
  }

  // ---- Walk state (mirrors computeFire) ----
  let cur = keys[0];
  let alive = false;
  let strength = 0;
  let consMiss = 0;

  // Trailing run of consecutive scored days, and whether yesterday was scored.
  let chain = 0;
  let prevScored = false;

  // Current-run accumulators — RESET on every relight (a fresh spark).
  let runStart: DateKey | null = null;
  let runDays = 0;
  let strongDays = 0;
  let perfectDays = 0;
  let scoreSum = 0;

  const timeline: DayPoint[] = [];

  while (cur <= today) {
    const score = entries[cur];

    if (isScore(score)) {
      if (!alive) {
        // Relight from a fresh spark.
        alive = true;
        strength = 0;
        runStart = cur;
        runDays = 0;
        strongDays = 0;
        perfectDays = 0;
        scoreSum = 0;
      }
      strength += strengthForScore(score);
      consMiss = 0;

      // Unbroken chain: extend if yesterday was scored, else start a new run of 1.
      chain = prevScored ? chain + 1 : 1;

      // Accumulate current-run stats.
      runDays += 1;
      scoreSum += score;
      if (score >= 4) strongDays += 1; // "strong" day
      if (score === 5) perfectDays += 1; // "perfect" day

      prevScored = true;
    } else if (isPast(cur, today)) {
      // A past day with no score is a miss; two in a row extinguish the fire.
      consMiss += 1;
      if (consMiss >= 2 && alive) {
        alive = false;
        strength = 0;
      }
      prevScored = false;
    } else {
      // `cur === today` and unscored: not a miss yet, just breaks the chain count.
      prevScored = false;
    }

    timeline.push({
      date: cur,
      score: isScore(score) ? score : undefined,
      alive,
      strength,
      consMiss,
    });
    cur = addDays(cur, 1);
  }

  // If the fire is not lit at `today`, every run-scoped metric is zero/null;
  // history timeline is still returned for time-achievement scans.
  if (!alive) {
    return { ...emptyMetrics(), timeline };
  }

  return {
    runStart,
    runDays,
    runSpanDays: runStart ? diffDays(today, runStart) + 1 : 0,
    unbrokenChain: chain,
    strongDaysInRun: strongDays,
    perfectDaysInRun: perfectDays,
    scoreSumInRun: scoreSum,
    timeline,
  };
}

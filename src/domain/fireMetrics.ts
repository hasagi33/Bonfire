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
import { contribution, isScore, type Entries, type Score } from './fire';

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

/** Mutable state threaded through the day-by-day walk. */
interface WalkState {
  alive: boolean;
  strength: number;
  consMiss: number;
  chain: number;
  prevScored: boolean;
  runStart: DateKey | null;
  runDays: number;
  strongDays: number;
  perfectDays: number;
  scoreSum: number;
}

function initialWalkState(): WalkState {
  return {
    alive: false,
    strength: 0,
    consMiss: 0,
    chain: 0,
    prevScored: false,
    runStart: null,
    runDays: 0,
    strongDays: 0,
    perfectDays: 0,
    scoreSum: 0,
  };
}

/** Relight from a fresh spark: reset run accumulators and start a new run at `cur`. */
function relight(state: WalkState, cur: DateKey): void {
  state.alive = true;
  state.strength = 0;
  state.runStart = cur;
  state.runDays = 0;
  state.strongDays = 0;
  state.perfectDays = 0;
  state.scoreSum = 0;
}

/** Record a scored day into the chain and the current-run accumulators. */
function accumulateScore(state: WalkState, score: Score): void {
  state.strength += contribution(score);
  state.consMiss = 0;
  // Unbroken chain: extend if yesterday was scored, else start a new run of 1.
  state.chain = state.prevScored ? state.chain + 1 : 1;
  state.runDays += 1;
  state.scoreSum += score;
  if (score >= 4) state.strongDays += 1; // "strong" day
  if (score === 5) state.perfectDays += 1; // "perfect" day
  state.prevScored = true;
}

/** Record a past unscored day; two in a row extinguish a lit fire. */
function recordPastMiss(state: WalkState): void {
  state.consMiss += 1;
  if (state.consMiss >= 2 && state.alive) {
    state.alive = false;
    state.strength = 0;
  }
  state.prevScored = false;
}

/** Snapshot the end-of-day state for the timeline. */
function snapshotDay(state: WalkState, cur: DateKey, score: unknown): DayPoint {
  return {
    date: cur,
    score: isScore(score) ? score : undefined,
    alive: state.alive,
    strength: state.strength,
    consMiss: state.consMiss,
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
  const state = initialWalkState();
  const timeline: DayPoint[] = [];
  let cur = keys[0];

  while (cur <= today) {
    const score = entries[cur];

    if (isScore(score)) {
      if (!state.alive) relight(state, cur);
      accumulateScore(state, score);
    } else if (isPast(cur, today)) {
      recordPastMiss(state);
    } else {
      // `cur === today` and unscored: not a miss yet, just breaks the chain count.
      state.prevScored = false;
    }

    timeline.push(snapshotDay(state, cur, score));
    cur = addDays(cur, 1);
  }

  // If the fire is not lit at `today`, every run-scoped metric is zero/null;
  // history timeline is still returned for time-achievement scans.
  if (!state.alive) {
    return { ...emptyMetrics(), timeline };
  }

  return {
    runStart: state.runStart,
    runDays: state.runDays,
    runSpanDays: state.runStart ? diffDays(today, state.runStart) + 1 : 0,
    unbrokenChain: state.chain,
    strongDaysInRun: state.strongDays,
    perfectDaysInRun: state.perfectDays,
    scoreSumInRun: state.scoreSum,
    timeline,
  };
}

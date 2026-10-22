/**
 * achievements.ts — the ONLY place a flame's lock/unlock is decided.
 *
 * Pure and deterministic: given the catalog, the calendar (`entries`), the
 * injected `today`, and the fire state, it returns one `AchievementState` per
 * flame. Nothing here is stored — unlock is always re-derived (FR-004), so it is
 * order-independent and recomputes correctly after any backfill/edit (SC-005).
 *
 * Two gates:
 *  - streak flames unlock WHILE the current run satisfies their condition AND the
 *    fire is lit; the fire going out (or an edit dropping the run) relocks them.
 *  - time flames unlock on the calendar day their condition completes (D) and
 *    stay unlocked through D + windowDays (inclusive) while the fire is lit; past
 *    that they expire until re-earned (no day-banking — the LATEST completion
 *    always wins).
 *
 * Each condition kind is a tiny pure evaluator (below). Time evaluators scan the
 * per-day `timeline` for the LATEST day the condition completes, plus a "best
 * partial" value so the gallery can show progress.
 */

import { addDays, diffDays, startOfWeek, type DateKey } from './dates';
import type { FireState } from './fire';
import type { DayPoint, RunMetrics } from './fireMetrics';
import { computeMetrics } from './fireMetrics';
import type { Achievement, FlameId, FlameStyle } from './flames';

// The gate only ever reads these two fire fields; accepting just them lets
// callers (the useFlames memo) depend on exactly what changes the result.
export type FireSnapshot = Pick<FireState, 'state' | 'strength'>;

/** Per-flame derived unlock state (never stored). */
export interface AchievementState {
  flameId: FlameId;
  unlocked: boolean;
  progress: { value: number; target: number };
  achievementDay: DateKey | null; // time only: latest completion day D
  daysLeft: number | null; // time only: (D + window) − today; < 0 ⇒ expired
  expired: boolean; // time only: completed once but now past the window
}

// What every condition evaluator returns.
interface CondResult {
  complete: boolean; // streak: condition holds now. time: ever completed (D set).
  progress: { value: number; target: number };
  completionDay?: DateKey; // time only: the LATEST day the condition completed
}

// ---------------------------------------------------------------------------
// Shared scan helpers (pure)
// ---------------------------------------------------------------------------

/**
 * Find the LATEST day that ends a run of ≥ `n` consecutive calendar days all
 * satisfying `pred`, and the longest such run seen (for progress). Gaps (and any
 * day failing `pred`) reset the run — the timeline holds every calendar day.
 */
function latestChainEnd(
  timeline: DayPoint[],
  n: number,
  pred: (dp: DayPoint) => boolean,
): { day: DateKey | null; best: number } {
  let run = 0;
  let best = 0;
  let day: DateKey | null = null;
  for (const dp of timeline) {
    if (pred(dp)) {
      run += 1;
      if (run > best) best = run;
      if (run >= n) day = dp.date; // latest completion wins
    } else {
      run = 0;
    }
  }
  return { day, best };
}

// One calendar week (Mon–Sun) summarised against a `minScore` bar.
interface WeekInfo {
  sunday: DateKey;
  daysMeeting: number; // days scored ≥ minScore (max 7)
  perfectDays: number; // days scored exactly 5
  qualifies: boolean; // all 7 days scored ≥ minScore
}

/**
 * Summarise every completed Mon–Sun week from the first scored day through
 * `today`, scoring each against `minScore`. Only weeks whose Sunday is ≤ today
 * are included (the current partial week can't complete yet).
 */
function summariseWeeks(timeline: DayPoint[], today: DateKey, minScore: number): WeekInfo[] {
  if (timeline.length === 0) return [];
  const scoreOf = new Map<DateKey, number>();
  for (const dp of timeline) if (dp.score !== undefined) scoreOf.set(dp.date, dp.score);

  const weeks: WeekInfo[] = [];
  const lastMonday = startOfWeek(today);
  for (let monday = startOfWeek(timeline[0].date); monday <= lastMonday; monday = addDays(monday, 7)) {
    const sunday = addDays(monday, 6);
    if (sunday > today) break; // the in-progress week is not yet completable
    let daysMeeting = 0;
    let perfectDays = 0;
    for (let i = 0; i < 7; i++) {
      const s = scoreOf.get(addDays(monday, i));
      if (s !== undefined && s >= minScore) daysMeeting += 1;
      if (s === 5) perfectDays += 1;
    }
    weeks.push({ sunday, daysMeeting, perfectDays, qualifies: daysMeeting === 7 });
  }
  return weeks;
}

// ---------------------------------------------------------------------------
// Condition evaluators — one per ConditionKind
// ---------------------------------------------------------------------------

type ConditionEvaluator = (
  p: any,
  m: RunMetrics,
  fire: FireSnapshot,
  today: DateKey,
) => CondResult;

/** Build a time-kind result from an optional completion day and best partial. */
function timeResult(day: DateKey | null, best: number, target: number): CondResult {
  return { complete: day !== null, progress: { value: best, target }, completionDay: day ?? undefined };
}

// ---- streak kinds (read the current run / strength) ----

function evalRunDays(p: any, m: RunMetrics): CondResult {
  return { complete: m.runDays >= p.n, progress: { value: m.runDays, target: p.n } };
}

function evalRunStrength(p: any, _m: RunMetrics, fire: FireSnapshot): CondResult {
  return { complete: fire.strength >= p.n, progress: { value: fire.strength, target: p.n } };
}

function evalStrongDaysInRun(p: any, m: RunMetrics): CondResult {
  return {
    complete: m.strongDaysInRun >= p.n,
    progress: { value: m.strongDaysInRun, target: p.n },
  };
}

function evalRunStrengthAndDays(p: any, m: RunMetrics, fire: FireSnapshot): CondResult {
  const complete = fire.strength >= p.s && m.runDays >= p.n;
  // Show the sub-goal the user is further from (the lesser fraction).
  const fracS = fire.strength / p.s;
  const fracD = m.runDays / p.n;
  const progress =
    fracS <= fracD
      ? { value: fire.strength, target: p.s }
      : { value: m.runDays, target: p.n };
  return { complete, progress };
}

// ---- time kinds (scan the timeline for the latest completion) ----

function evalConsecutivePerfect(p: any, m: RunMetrics): CondResult {
  const { day, best } = latestChainEnd(m.timeline, p.n, dp => dp.score === 5);
  return timeResult(day, best, p.n);
}

function evalUnbrokenChain(p: any, m: RunMetrics): CondResult {
  const { day, best } = latestChainEnd(m.timeline, p.n, dp => dp.score !== undefined);
  return timeResult(day, best, p.n);
}

function evalUnbrokenChainMinScore(p: any, m: RunMetrics): CondResult {
  const { day, best } = latestChainEnd(
    m.timeline,
    p.n,
    dp => dp.score !== undefined && dp.score >= p.min,
  );
  return timeResult(day, best, p.n);
}

function evalPerfectCalendarWeek(p: any, m: RunMetrics, _fire: FireSnapshot, today: DateKey): CondResult {
  const weeks = summariseWeeks(m.timeline, today, p.minScore);
  let day: DateKey | null = null;
  let best = 0;
  for (const w of weeks) {
    if (w.daysMeeting > best) best = w.daysMeeting;
    if (w.qualifies) day = w.sunday; // latest fully-scored week wins
  }
  return timeResult(day, best, 7);
}

function evalConsecutivePerfectWeeks(p: any, m: RunMetrics, _fire: FireSnapshot, today: DateKey): CondResult {
  const weeks = summariseWeeks(m.timeline, today, p.minScore);
  const recent: { sunday: DateKey; perfectDays: number }[] = [];
  let day: DateKey | null = null;
  let bestRun = 0;
  for (const w of weeks) {
    if (!w.qualifies) {
      recent.length = 0; // a non-qualifying week breaks the streak of weeks
      continue;
    }
    recent.push({ sunday: w.sunday, perfectDays: w.perfectDays });
    if (recent.length > bestRun) bestRun = recent.length;
    if (recent.length >= p.weeks) {
      const window = recent.slice(recent.length - p.weeks);
      const perfectSum = window.reduce((acc, x) => acc + x.perfectDays, 0);
      if (perfectSum >= p.minPerfect) day = w.sunday;
    }
  }
  return timeResult(day, bestRun, p.weeks);
}

function evalCrossStrength(p: any, m: RunMetrics): CondResult {
  // Latest scored day where the live run is at/above n. This keeps threshold
  // flames available while the user continues maintaining that strong run.
  let day: DateKey | null = null;
  let best = 0;
  const t = m.timeline;
  for (let i = 0; i < t.length; i++) {
    if (t[i].strength > best) best = t[i].strength;
    if (t[i].score !== undefined && t[i].alive && t[i].strength >= p.n) day = t[i].date;
  }
  return timeResult(day, best, p.n);
}

/**
 * Dispatch table: one small pure evaluator per ConditionKind. A kind absent
 * from this table falls through to the exhaustiveness guard in evalCondition.
 */
const CONDITION_EVALUATORS: Partial<Record<Achievement['kind'], ConditionEvaluator>> = {
  runDays: evalRunDays,
  runStrength: evalRunStrength,
  strongDaysInRun: evalStrongDaysInRun,
  runStrengthAndDays: evalRunStrengthAndDays,
  consecutivePerfect: evalConsecutivePerfect,
  unbrokenChain: evalUnbrokenChain,
  unbrokenChainMinScore: evalUnbrokenChainMinScore,
  perfectCalendarWeek: evalPerfectCalendarWeek,
  consecutivePerfectWeeks: evalConsecutivePerfectWeeks,
  crossStrength: evalCrossStrength,
};

function evalCondition(
  ach: Achievement,
  m: RunMetrics,
  fire: FireSnapshot,
  today: DateKey,
): CondResult {
  const evaluator = CONDITION_EVALUATORS[ach.kind];
  // Exhaustiveness guard: a new kind without an evaluator never silently
  // unlocks a flame.
  if (!evaluator) return { complete: false, progress: { value: 0, target: 1 } };
  return evaluator(ach.params, m, fire, today);
}

// ---------------------------------------------------------------------------
// The final gate
// ---------------------------------------------------------------------------

/** Evaluate one flame's unlock state against the metrics + fire. */
export function evaluateFlame(
  flame: FlameStyle,
  m: RunMetrics,
  fire: FireSnapshot,
  today: DateKey,
): AchievementState {
  // Base flame: always unlocked, no condition.
  if (!flame.achievement) {
    return {
      flameId: flame.id,
      unlocked: true,
      progress: { value: 1, target: 1 },
      achievementDay: null,
      daysLeft: null,
      expired: false,
    };
  }

  const ach = flame.achievement;
  const cond = evalCondition(ach, m, fire, today);

  if (ach.type === 'streak') {
    return {
      flameId: flame.id,
      // A streak flame is unlocked only while the fire is lit AND the run holds.
      unlocked: fire.state === 'lit' && cond.complete,
      progress: cond.progress,
      achievementDay: null,
      daysLeft: null,
      expired: false,
    };
  }

  return timeAchievementState(flame, ach, cond, fire, today);
}

/** Time flame: window D + windowDays inclusive, gated on the fire being lit. */
function timeAchievementState(
  flame: FlameStyle,
  ach: Achievement,
  cond: CondResult,
  fire: FireSnapshot,
  today: DateKey,
): AchievementState {
  const D = cond.completionDay ?? null;
  const lastDay = windowEnd(D, ach.windowDays ?? 0);
  return {
    flameId: flame.id,
    unlocked: isInWindow(lastDay, today) && fire.state === 'lit',
    progress: cond.progress,
    achievementDay: D,
    daysLeft: lastDay !== null ? diffDays(lastDay, today) : null, // (D+W) − today
    expired: isExpired(D, lastDay, today),
  };
}

/** Last in-window day (D + windowDays), or null when never completed. */
function windowEnd(D: DateKey | null, windowDays: number): DateKey | null {
  return D !== null ? addDays(D, windowDays) : null;
}

/** True while today has not passed the window's last day. */
function isInWindow(lastDay: DateKey | null, today: DateKey): boolean {
  return lastDay !== null && today <= lastDay;
}

/** Completed once, but today is now past the window. */
function isExpired(D: DateKey | null, lastDay: DateKey | null, today: DateKey): boolean {
  return D !== null && lastDay !== null && today > lastDay;
}

/**
 * Evaluate the whole catalog at once. Computes the metrics a single time, then
 * gates every flame. This is what `useFlames` memoizes — it must stay OFF the
 * render/animation path (SC-010).
 */
export function evaluateAll(
  flames: readonly FlameStyle[],
  entries: Parameters<typeof computeMetrics>[0],
  today: DateKey,
  fire: FireSnapshot,
): Record<FlameId, AchievementState> {
  const m = computeMetrics(entries, today);
  const out: Record<FlameId, AchievementState> = {};
  for (const flame of flames) {
    out[flame.id] = evaluateFlame(flame, m, fire, today);
  }
  return out;
}

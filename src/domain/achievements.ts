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

type Evaluator = (
  ach: Achievement,
  m: RunMetrics,
  fire: FireSnapshot,
  today: DateKey,
) => CondResult;

/** Build a time-kind result from a completion day and best partial value. */
function timeResult(day: DateKey | null, best: number, target: number): CondResult {
  return {
    complete: day !== null,
    progress: { value: best, target },
    completionDay: day ?? undefined,
  };
}

// ---- streak evaluators (read the current run / strength) ----

function evalRunDays(ach: Achievement, m: RunMetrics): CondResult {
  const p = ach.params as { n: number };
  return { complete: m.runDays >= p.n, progress: { value: m.runDays, target: p.n } };
}

function evalRunStrength(ach: Achievement, fire: FireSnapshot): CondResult {
  const p = ach.params as { n: number };
  return { complete: fire.strength >= p.n, progress: { value: fire.strength, target: p.n } };
}

function evalStrongDaysInRun(ach: Achievement, m: RunMetrics): CondResult {
  const p = ach.params as { n: number };
  return {
    complete: m.strongDaysInRun >= p.n,
    progress: { value: m.strongDaysInRun, target: p.n },
  };
}

function evalRunStrengthAndDays(ach: Achievement, m: RunMetrics, fire: FireSnapshot): CondResult {
  const p = ach.params as { s: number; n: number };
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

// ---- time evaluators (scan the timeline for the latest completion) ----

function evalConsecutivePerfect(ach: Achievement, m: RunMetrics): CondResult {
  const p = ach.params as { n: number };
  const { day, best } = latestChainEnd(m.timeline, p.n, dp => dp.score === 5);
  return timeResult(day, best, p.n);
}

function evalUnbrokenChain(ach: Achievement, m: RunMetrics): CondResult {
  const p = ach.params as { n: number };
  const { day, best } = latestChainEnd(m.timeline, p.n, dp => dp.score !== undefined);
  return timeResult(day, best, p.n);
}

function evalUnbrokenChainMinScore(ach: Achievement, m: RunMetrics): CondResult {
  const p = ach.params as { n: number; min: number };
  const { day, best } = latestChainEnd(
    m.timeline,
    p.n,
    dp => dp.score !== undefined && dp.score >= p.min,
  );
  return timeResult(day, best, p.n);
}

function evalPerfectCalendarWeek(ach: Achievement, m: RunMetrics, today: DateKey): CondResult {
  const p = ach.params as { minScore: number };
  const weeks = summariseWeeks(m.timeline, today, p.minScore);
  let day: DateKey | null = null;
  let best = 0;
  for (const w of weeks) {
    if (w.daysMeeting > best) best = w.daysMeeting;
    if (w.qualifies) day = w.sunday; // latest fully-scored week wins
  }
  return timeResult(day, best, 7);
}

function evalConsecutivePerfectWeeks(ach: Achievement, m: RunMetrics, today: DateKey): CondResult {
  const p = ach.params as { weeks: number; minScore: number; minPerfect: number };
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

function evalCrossStrength(ach: Achievement, m: RunMetrics): CondResult {
  // Latest scored day where the live run is at/above n. This keeps threshold
  // flames available while the user continues maintaining that strong run.
  const p = ach.params as { n: number };
  let day: DateKey | null = null;
  let best = 0;
  const t = m.timeline;
  for (let i = 0; i < t.length; i++) {
    if (t[i].strength > best) best = t[i].strength;
    if (t[i].score !== undefined && t[i].alive && t[i].strength >= p.n) day = t[i].date;
  }
  return timeResult(day, best, p.n);
}

// Dispatch table: one evaluator per ConditionKind. A kind missing here falls
// through to the fallback below, so it never silently unlocks a flame.
const EVALUATORS: Partial<Record<Achievement['kind'], Evaluator>> = {
  runDays: (a, m) => evalRunDays(a, m),
  runStrength: (a, m, fire) => evalRunStrength(a, fire),
  strongDaysInRun: (a, m) => evalStrongDaysInRun(a, m),
  runStrengthAndDays: (a, m, fire) => evalRunStrengthAndDays(a, m, fire),
  consecutivePerfect: (a, m) => evalConsecutivePerfect(a, m),
  unbrokenChain: (a, m) => evalUnbrokenChain(a, m),
  unbrokenChainMinScore: (a, m) => evalUnbrokenChainMinScore(a, m),
  perfectCalendarWeek: (a, m, _fire, today) => evalPerfectCalendarWeek(a, m, today),
  consecutivePerfectWeeks: (a, m, _fire, today) => evalConsecutivePerfectWeeks(a, m, today),
  crossStrength: (a, m) => evalCrossStrength(a, m),
};

function evalCondition(
  ach: Achievement,
  m: RunMetrics,
  fire: FireSnapshot,
  today: DateKey,
): CondResult {
  const evaluator = EVALUATORS[ach.kind];
  if (!evaluator) {
    // Exhaustiveness guard: a new kind without an evaluator never silently
    // unlocks a flame.
    return { complete: false, progress: { value: 0, target: 1 } };
  }
  return evaluator(ach, m, fire, today);
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

  // time flame: window D + windowDays inclusive, gated on the fire being lit.
  const D = cond.completionDay ?? null;
  const window = ach.windowDays ?? 0;
  const lastDay = D !== null ? addDays(D, window) : null;
  const inWindow = D !== null && lastDay !== null && today <= lastDay;
  return {
    flameId: flame.id,
    unlocked: inWindow && fire.state === 'lit',
    progress: cond.progress,
    achievementDay: D,
    daysLeft: lastDay !== null ? diffDays(lastDay, today) : null, // (D+W) − today
    expired: D !== null && lastDay !== null && today > lastDay,
  };
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

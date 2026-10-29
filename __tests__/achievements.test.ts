/**
 * achievements.test.ts — the unlock-gate oracle (contracts/achievement-engine.md
 * rows #1–#10). Calendars are built relative to a fixed injected `today`, and the
 * fire + metrics are derived exactly as the app does, so these prove the streak
 * relock, time window (D … D+W−1), re-earn, and backfill-expired rules.
 */

import { computeFire, type Entries, type Score } from '../src/domain/fire';
import { computeMetrics } from '../src/domain/fireMetrics';
import { evaluateFlame, evaluateAll } from '../src/domain/achievements';
import { FLAMES, flameById } from '../src/domain/flames';
import { addDays } from '../src/domain/dates';
import { deriveFireHealth } from '../src/domain/fireHealth';

const TODAY = '2026-06-15';
const day = (o: number): string => addDays(TODAY, o);

function build(pairs: [number, Score][]): Entries {
  const e: Entries = {};
  for (const [o, s] of pairs) e[day(o)] = s;
  return e;
}

// Evaluate one flame against a calendar, deriving fire + metrics like the app.
function evalFlame(id: string, entries: Entries, today = TODAY) {
  const fire = computeFire(entries, today);
  const m = computeMetrics(entries, today);
  return evaluateFlame(flameById(id), m, fire, today);
}

test('#1 streak condition met and lit → unlocked', () => {
  // Crimson: run strength ≥ 5. Three 5s → strength 12, fire lit.
  const entries = build([
    [-2, 5],
    [-1, 5],
    [0, 5],
  ]);
  expect(evalFlame('crimson', entries).unlocked).toBe(true);
});

test('#2 streak met, then the fire goes out → relocked (FR-005)', () => {
  // Strength reached, then three missed days extinguish the fire.
  const entries = build([
    [-6, 5],
    [-5, 5],
    [-4, 5],
    // -3, -2, -1 missed → out; today unscored
  ]);
  const st = evalFlame('crimson', entries);
  expect(computeFire(entries, TODAY).state).toBe('out');
  expect(st.unlocked).toBe(false);
});

test('#3 streak below threshold (e.g. after clearing a day) → locked (US5.2)', () => {
  // Sapphire needs a 5-day run; only 4 scored days are present.
  const entries = build([
    [-3, 3],
    [-2, 3],
    [-1, 3],
    [0, 3],
  ]);
  const st = evalFlame('sapphire', entries);
  expect(st.unlocked).toBe(false);
  expect(st.progress).toEqual({ value: 4, target: 5 });
});

test('#4 time condition completed today, lit → unlocked, daysLeft = W', () => {
  // Toxic: 3 perfect days in a row, window 7.
  const entries = build([
    [-2, 5],
    [-1, 5],
    [0, 5],
  ]);
  const st = evalFlame('toxic', entries);
  expect(st.unlocked).toBe(true);
  expect(st.achievementDay).toBe(day(0));
  expect(st.daysLeft).toBe(7);
  expect(st.expired).toBe(false);
});

test('#5 time completed D, today = D+W → expired, daysLeft = 0', () => {
  // D = day(-7); fill the gap with non-perfect scores to stay lit without re-earning.
  const entries = build([
    [-9, 5],
    [-8, 5],
    [-7, 5], // D
    [-6, 3],
    [-5, 3],
    [-4, 3],
    [-3, 3],
    [-2, 3],
    [-1, 3],
    [0, 3], // today = D + 7
  ]);
  const st = evalFlame('toxic', entries);
  expect(st.achievementDay).toBe(day(-7));
  expect(st.unlocked).toBe(false);
  expect(st.expired).toBe(true);
  expect(st.daysLeft).toBe(0);
});

test('#6 time completed D, today = D+W+1 → expired and locked (FR-007)', () => {
  const entries = build([
    [-10, 5],
    [-9, 5],
    [-8, 5], // D
    [-7, 3],
    [-6, 3],
    [-5, 3],
    [-4, 3],
    [-3, 3],
    [-2, 3],
    [-1, 3],
    [0, 3], // today = D + 8
  ]);
  const st = evalFlame('toxic', entries);
  expect(st.achievementDay).toBe(day(-8));
  expect(st.unlocked).toBe(false);
  expect(st.expired).toBe(true);
  expect(st.daysLeft).toBe(-1);
});

test('#7 time in-window but fire out → locked; relight within window → unlocked (FR-007a)', () => {
  // D = day(-4), window 7 (lastDay in the future), then two misses → out.
  const out = build([
    [-6, 5],
    [-5, 5],
    [-4, 5], // D
    // -3, -2 missed → out; -1, today unscored
  ]);
  const stOut = evalFlame('toxic', out);
  expect(computeFire(out, TODAY).state).toBe('out');
  expect(stOut.achievementDay).toBe(day(-4));
  expect(stOut.expired).toBe(false); // still inside the window
  expect(stOut.unlocked).toBe(false); // but the fire is out

  // Relight today (a single 5 doesn't re-complete the 3-in-a-row, so D is unchanged).
  const relit = { ...out, [day(0)]: 5 as Score };
  const stRelit = evalFlame('toxic', relit);
  expect(stRelit.achievementDay).toBe(day(-4));
  expect(stRelit.unlocked).toBe(true);
});

test('#8 expired then re-completed at D2 → unlocked, window restarts from D2 (FR-008)', () => {
  const entries = build([
    [-12, 5],
    [-11, 5],
    [-10, 5], // D1 (would have expired)
    [-9, 3],
    [-8, 3],
    [-7, 3],
    [-6, 3],
    [-5, 3],
    [-4, 3],
    [-3, 3],
    [-2, 5],
    [-1, 5],
    [0, 5], // D2 = today
  ]);
  const st = evalFlame('toxic', entries);
  expect(st.achievementDay).toBe(day(0));
  expect(st.unlocked).toBe(true);
  expect(st.daysLeft).toBe(7);
});

test('#9 completed only by an old backfilled day, today > D+W → stays locked (FR-010)', () => {
  const entries = build([
    [-12, 5],
    [-11, 5],
    [-10, 5], // D; nothing after → fire goes out and window lapses
  ]);
  const st = evalFlame('toxic', entries);
  expect(st.achievementDay).toBe(day(-10));
  expect(st.expired).toBe(true);
  expect(st.unlocked).toBe(false);
});

test('FR-022 a time flame is re-earnable indefinitely: earn → expire → earn again', () => {
  // One calendar, evaluated at three points in time. Two triple-5 completions
  // (D1 and D2) are separated by low-but-lit days so the window lapses between.
  const base = '2026-07-01';
  const d = (o: number): string => addDays(base, o);
  const entries: Entries = {};
  [0, 1, 2].forEach(o => (entries[d(o)] = 5)); // D1 completes at base+2
  for (let o = 3; o <= 10; o++) entries[d(o)] = 3; // keep lit, no new completion
  [11, 12, 13].forEach(o => (entries[d(o)] = 5)); // D2 completes at base+13

  // Earned: right on the first completion day.
  expect(evalFlame('toxic', entries, d(2)).unlocked).toBe(true);

  // Lost: window 7 elapsed (base+2 + 7 = base+9 < base+10), fire still lit.
  const expired = evalFlame('toxic', entries, d(10));
  expect(expired.unlocked).toBe(false);
  expect(expired.expired).toBe(true);

  // Earned again: a fresh completion at base+13 restarts the window.
  const reearned = evalFlame('toxic', entries, d(13));
  expect(reearned.unlocked).toBe(true);
  expect(reearned.achievementDay).toBe(d(13));
  expect(reearned.daysLeft).toBe(7);
});

test('crossStrength time flames refresh while the current run stays above threshold', () => {
  // Spectral used to expire 10 days after the first threshold crossing even
  // though the run stayed lit and far above strength 30.
  const spectralEntries = build(Array.from({ length: 20 }, (_, i) => [i - 19, 5] as [number, Score]));
  const spectral = evalFlame('spectral', spectralEntries);
  expect(computeFire(spectralEntries, TODAY).strength).toBeGreaterThanOrEqual(30);
  expect(spectral.unlocked).toBe(true);
  expect(spectral.achievementDay).toBe(day(0));
  expect(spectral.daysLeft).toBe(10);
  expect(spectral.expired).toBe(false);

  // Solfire has the same condition kind at a higher threshold, so verify the
  // 100-strength flame also refreshes from the latest scored day.
  const solfireEntries = build(Array.from({ length: 40 }, (_, i) => [i - 39, 5] as [number, Score]));
  const solfire = evalFlame('solfire', solfireEntries);
  expect(computeFire(solfireEntries, TODAY).strength).toBeGreaterThanOrEqual(100);
  expect(solfire.unlocked).toBe(true);
  expect(solfire.achievementDay).toBe(day(0));
  expect(solfire.daysLeft).toBe(14);
  expect(solfire.expired).toBe(false);
});

test('#10 two orderings of the same edits → identical state map (SC-005)', () => {
  const pairs: [number, Score][] = [
    [-6, 5],
    [-5, 4],
    [-4, 5],
    [-3, 5],
    [-2, 3],
    [-1, 4],
    [0, 5],
  ];
  const a = build(pairs);
  const b = build([...pairs].reverse());
  const fireA = computeFire(a, TODAY);
  const fireB = computeFire(b, TODAY);
  expect(evaluateAll(FLAMES, a, TODAY, fireA)).toEqual(evaluateAll(FLAMES, b, TODAY, fireB));
});

test('Fire Health derivation does not change unlock outcomes', () => {
  const entries = build([
    [-6, 5],
    [-5, 4],
    [-4, 5],
    [-3, 5],
    [-2, 3],
    [-1, 4],
    [0, 5],
  ]);
  const fire = computeFire(entries, TODAY);
  const before = evaluateAll(FLAMES, entries, TODAY, fire);

  deriveFireHealth(entries, fire, TODAY);

  expect(evaluateAll(FLAMES, entries, TODAY, fire)).toEqual(before);
});

test('US5.2 clearing a past day drops the run below a streak condition → relock', () => {
  // Five scored days → Sapphire (5-day run) unlocked.
  const full = build([
    [-4, 3],
    [-3, 3],
    [-2, 3],
    [-1, 3],
    [0, 3],
  ]);
  expect(evalFlame('sapphire', full).unlocked).toBe(true);

  // Clear ONE middle day (a single gap keeps the fire lit, but runDays drops to 4).
  const edited = { ...full };
  delete edited[day(-2)];
  const st = evalFlame('sapphire', edited);
  expect(computeFire(edited, TODAY).state).toBe('lit');
  expect(st.unlocked).toBe(false);
  expect(st.progress).toEqual({ value: 4, target: 5 });
});

test('US5 backfilling an old day mid-history yields the same states as logging it live', () => {
  // "Live" calendar: all seven days entered.
  const live = build([
    [-6, 5],
    [-5, 5],
    [-4, 5],
    [-3, 4],
    [-2, 4],
    [-1, 4],
    [0, 4],
  ]);
  // "Backfilled": the day(-4) score arrives last, after everything else.
  const backfilled = build([
    [-6, 5],
    [-5, 5],
    [-3, 4],
    [-2, 4],
    [-1, 4],
    [0, 4],
  ]);
  backfilled[day(-4)] = 5;
  const fireLive = computeFire(live, TODAY);
  const fireBack = computeFire(backfilled, TODAY);
  expect(evaluateAll(FLAMES, backfilled, TODAY, fireBack)).toEqual(
    evaluateAll(FLAMES, live, TODAY, fireLive),
  );
});

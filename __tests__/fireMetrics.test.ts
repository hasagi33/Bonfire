/**
 * fireMetrics.test.ts — oracle for the run/history metrics walk.
 *
 * Calendars are built relative to a fixed injected `today` so the tests are
 * deterministic and never touch the real clock. We assert the documented metric
 * table (contracts/achievement-engine.md) plus order-independence (SC-005).
 */

import { computeMetrics } from '../src/domain/fireMetrics';
import { addDays } from '../src/domain/dates';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import { readEmberMood } from '../src/components/Bonfire/emberMood';

const TODAY = '2026-06-15';
const day = (offset: number): string => addDays(TODAY, offset);

// Build an Entries map from [dayOffset, score] pairs (offset 0 = today).
function build(pairs: [number, Score][]): Entries {
  const e: Entries = {};
  for (const [offset, score] of pairs) e[day(offset)] = score;
  return e;
}

test('7 straight scored days including today', () => {
  const entries = build([
    [-6, 3],
    [-5, 4],
    [-4, 5],
    [-3, 2],
    [-2, 4],
    [-1, 5],
    [0, 3],
  ]);
  const m = computeMetrics(entries, TODAY);
  expect(m.runDays).toBe(7);
  expect(m.unbrokenChain).toBe(7);
  expect(m.runStart).toBe(day(-6));
  expect(m.runSpanDays).toBe(7);
  expect(m.strongDaysInRun).toBe(4); // scores 4,5,4,5
  expect(m.perfectDaysInRun).toBe(2); // two 5s
  expect(m.scoreSumInRun).toBe(3 + 4 + 5 + 2 + 4 + 5 + 3);
});

test('one tolerated gap: run continues but the unbroken chain resets', () => {
  // scored, gap1, scored×5 (still lit — a single miss is survivable).
  const entries = build([
    [-6, 4],
    // -5 missed
    [-4, 4],
    [-3, 4],
    [-2, 4],
    [-1, 4],
    [0, 4],
  ]);
  const m = computeMetrics(entries, TODAY);
  expect(m.runDays).toBe(6); // all six scored days count toward the run
  expect(m.unbrokenChain).toBe(5); // only the trailing five are consecutive
});

test('two-day gap extinguishes, then a score today relights a fresh run', () => {
  const entries = build([
    [-3, 5],
    // -2, -1 missed → out at -1
    [0, 3],
  ]);
  const m = computeMetrics(entries, TODAY);
  expect(m.runDays).toBe(1);
  expect(m.unbrokenChain).toBe(1);
  expect(m.runStart).toBe(day(0));
});

test('fire out with no relight → all run metrics zero/null', () => {
  const entries = build([
    [-3, 5],
    // -2, -1 missed → out; today unscored
  ]);
  const m = computeMetrics(entries, TODAY);
  expect(m.runStart).toBeNull();
  expect(m.runDays).toBe(0);
  expect(m.unbrokenChain).toBe(0);
  expect(m.strongDaysInRun).toBe(0);
  expect(m.perfectDaysInRun).toBe(0);
  expect(m.scoreSumInRun).toBe(0);
});

test('empty calendar → empty metrics', () => {
  const m = computeMetrics({}, TODAY);
  expect(m.runStart).toBeNull();
  expect(m.timeline).toHaveLength(0);
});

test('order-independent: insertion order does not change the metrics', () => {
  const pairs: [number, Score][] = [
    [-6, 4],
    [-4, 5],
    [-3, 2],
    [-2, 4],
    [-1, 5],
    [0, 3],
  ];
  const forward = build(pairs);
  const reversed = build([...pairs].reverse());
  expect(computeMetrics(reversed, TODAY)).toEqual(computeMetrics(forward, TODAY));
});

test('Fire Health derivation does not alter run metrics', () => {
  const entries = build([
    [-6, 5],
    [-5, 4],
    [-4, 4],
    [-3, 3],
    [-2, 5],
    [-1, 2],
    [0, 5],
  ]);
  const before = computeMetrics(entries, TODAY);

  readEmberMood(entries, computeFire(entries, TODAY), TODAY);

  expect(computeMetrics(entries, TODAY)).toEqual(before);
});

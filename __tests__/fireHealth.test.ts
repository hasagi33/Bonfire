/**
 * fireHealth.test.ts — deterministic oracle for the visual-only Fire Health
 * model. It pins the weighted recent-score window, sparse-history fallback,
 * thresholds, and suppression when the fire is not lit.
 */

import { addDays } from '../src/domain/dates';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import {
  deriveFireHealth,
  fireHealthSamples,
  fireHealthVisualModifiers,
} from '../src/domain/fireHealth';

const TODAY = '2026-06-15';
const day = (offset: number): string => addDays(TODAY, offset);

function build(pairs: [number, Score][]): Entries {
  const entries: Entries = {};
  for (const [offset, score] of pairs) entries[day(offset)] = score;
  return entries;
}

const litFire = computeFire(build([[0, 3]]), TODAY);

test('uses latest 7 scored days, newest first, with descending weights', () => {
  const entries = build([
    [-10, 5],
    [-9, 5],
    [-8, 5],
    [-6, 1],
    [-5, 2],
    [-4, 3],
    [-3, 4],
    [-2, 5],
    [-1, 1],
    [0, 2],
  ]);

  const samples = fireHealthSamples(entries, addDays(TODAY, 1));
  expect(samples.map(sample => sample.date)).toEqual([
    day(0),
    day(-1),
    day(-2),
    day(-3),
    day(-4),
    day(-5),
    day(-6),
  ]);
  expect(samples.map(sample => sample.weight)).toEqual([7, 6, 5, 4, 3, 2, 1]);
});

test('always ends the health window one day before today', () => {
  const entries = build([
    [-2, 3],
    [-1, 3],
    [0, 3],
    [1, 5],
    [2, 5],
  ]);

  expect(fireHealthSamples(entries, TODAY).map(sample => sample.date)).toEqual([day(-1), day(-2)]);
});

test('drops corrupt non-integer scores from the health window', () => {
  const entries = {
    [day(-2)]: 3,
    [day(-1)]: 2.5,
  } as unknown as Entries;

  expect(fireHealthSamples(entries, TODAY).map(sample => sample.date)).toEqual([day(-2)]);
});

test('defaults to Steady for sparse histories with fewer than 3 scored days', () => {
  const health = deriveFireHealth(build([[0, 5]]), litFire, addDays(TODAY, 1));
  expect(health).toMatchObject({
    name: 'steady',
    label: 'Steady',
    qualityIndex: 0.5,
    sampleCount: 1,
    visible: true,
  });
});

test('maps weighted quality into Faint, Steady, and Bright', () => {
  expect(deriveFireHealth(build([[-2, 1], [-1, 1], [0, 2]]), litFire, addDays(TODAY, 1)).name).toBe('faint');
  expect(deriveFireHealth(build([[-2, 2], [-1, 3], [0, 3]]), litFire, addDays(TODAY, 1)).name).toBe('steady');
  expect(deriveFireHealth(build([[-2, 3], [-1, 3], [0, 4]]), litFire, addDays(TODAY, 1)).name).toBe('bright');
  expect(deriveFireHealth(build([[-2, 4], [-1, 4], [0, 5]]), litFire, addDays(TODAY, 1)).name).toBe('bright');
});

test('newer high scores outweigh older low scores inside the 7-score window', () => {
  const improving = deriveFireHealth(
    build([[-6, 1], [-5, 1], [-4, 2], [-3, 3], [-2, 4], [-1, 5], [0, 5]]),
    litFire,
    addDays(TODAY, 1),
  );
  const fading = deriveFireHealth(
    build([[-6, 5], [-5, 5], [-4, 4], [-3, 3], [-2, 2], [-1, 1], [0, 1]]),
    litFire,
    addDays(TODAY, 1),
  );

  expect(improving.qualityIndex).toBeGreaterThan(fading.qualityIndex);
  expect(improving.name).toBe('bright');
  expect(fading.name).toBe('faint');
});

test('suppresses visibility and returns neutral visual modifiers when fire is out', () => {
  const outFire = computeFire(build([[-4, 5]]), TODAY);
  const health = deriveFireHealth(build([[-6, 5], [-5, 5], [-4, 5], [-3, 5]]), outFire, TODAY);

  expect(outFire.state).toBe('out');
  expect(health.visible).toBe(false);
  expect(fireHealthVisualModifiers(health)).toEqual({
    glow: 1,
    warmth: 1,
    energy: 1,
    density: 1,
    captionTone: 'steady',
  });
});

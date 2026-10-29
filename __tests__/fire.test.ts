/**
 * fire.test.ts — exhaustive tests for the pure fire engine.
 *
 * Mirrors the behavior table in contracts/fire-engine.md and `BonfireDesign/
 * logic.js`, covering every streak / extinguish / back-fill edge case from the
 * spec. The engine is pure and takes `today` as input, so we build precise
 * calendars and assert the exact resulting fire state.
 */

import { addDays } from '../src/domain/dates';
import {
  classifyDay,
  computeFire,
  fireLabel,
  type Entries,
  type Score,
} from '../src/domain/fire';
import { strengthForScore } from '../src/domain/scoring';
import { readEmberMood } from '../src/components/Bonfire/emberMood';

// A fixed "today" for all tests, plus a helper to name days relative to it.
const TODAY = '2026-06-15';
const day = (offset: number) => addDays(TODAY, offset); // day(-1) = yesterday

describe('strengthForScore', () => {
  test('maps 1->0 and 2..5 to strictly increasing values', () => {
    expect(strengthForScore(1)).toBe(0);
    expect(strengthForScore(2)).toBe(1);
    expect(strengthForScore(3)).toBe(2);
    expect(strengthForScore(4)).toBe(3);
    expect(strengthForScore(5)).toBe(4);
  });
});

describe('computeFire — basic lit/unlit', () => {
  test('no entries -> unlit, strength 0, not everLit', () => {
    const fire = computeFire({}, TODAY);
    expect(fire.state).toBe('unlit');
    expect(fire.strength).toBe(0);
    expect(fire.everLit).toBe(false);
  });

  test('a single score today=5 -> lit with strength 4', () => {
    const fire = computeFire({ [TODAY]: 5 }, TODAY);
    expect(fire.state).toBe('lit');
    expect(fire.strength).toBe(4);
  });

  test('score 1 only -> lit but strength 0 (maintain)', () => {
    const fire = computeFire({ [TODAY]: 1 }, TODAY);
    expect(fire.state).toBe('lit');
    expect(fire.strength).toBe(0);
  });

  test('three consecutive 5s -> strength 12', () => {
    const entries: Entries = { [day(-2)]: 5, [day(-1)]: 5, [TODAY]: 5 };
    expect(computeFire(entries, TODAY).strength).toBe(12);
  });
});

describe('computeFire — the streak / miss rule (US2)', () => {
  test('one missed day between scores survives; both days count', () => {
    const entries: Entries = { [day(-2)]: 3, [TODAY]: 4 };
    const fire = computeFire(entries, TODAY);
    expect(fire.state).toBe('lit');
    expect(fire.strength).toBe(strengthForScore(3) + strengthForScore(4)); // 2 + 3 = 5
  });

  test('three consecutive missed past days -> fire goes out, strength 0, everLit', () => {
    const entries: Entries = { [day(-4)]: 5 };
    const fire = computeFire(entries, TODAY);
    expect(fire.state).toBe('out');
    expect(fire.strength).toBe(0);
    expect(fire.everLit).toBe(true);
  });

  test('unscored today does not extinguish a lit fire', () => {
    const entries: Entries = { [day(-1)]: 5 };
    const fire = computeFire(entries, TODAY);
    expect(fire.state).toBe('lit');
    expect(fire.strength).toBe(4);
  });

  test('out then relight starts a fresh run from zero', () => {
    const entries: Entries = { [day(-5)]: 5, [day(-1)]: 4, [TODAY]: 5 };
    const fire = computeFire(entries, TODAY);
    expect(fire.state).toBe('lit');
    expect(fire.strength).toBe(7); // new run only: 4->3 + 5->4
  });
});

describe('computeFire — back-fill and clearing (US3, FR-010/FR-011)', () => {
  test('back-filling a missed day repairs the streak', () => {
    const broken: Entries = { [day(-4)]: 5 };
    expect(computeFire(broken, TODAY).state).toBe('out');

    const repaired: Entries = { [day(-4)]: 5, [day(-3)]: 3 };
    const fire = computeFire(repaired, TODAY);
    expect(fire.state).toBe('lit');
    expect(fire.strength).toBe(strengthForScore(5) + strengthForScore(3)); // 4 + 2 = 6
  });

  test('removing a score can create three misses and extinguish the fire', () => {
    const lit: Entries = { [day(-4)]: 5, [day(-3)]: 5 };
    expect(computeFire(lit, TODAY).state).toBe('lit');

    const cleared: Entries = { [day(-4)]: 5 };
    expect(computeFire(cleared, TODAY).state).toBe('out');
  });

  test('order independence: same pairs in any order -> identical fire', () => {
    const a: Entries = { [day(-2)]: 3, [day(-1)]: 4, [TODAY]: 5 };
    const b: Entries = { [TODAY]: 5, [day(-2)]: 3, [day(-1)]: 4 };
    expect(computeFire(a, TODAY)).toEqual(computeFire(b, TODAY));
  });

  test('does not mutate the input entries', () => {
    const entries: Entries = { [day(-1)]: 4, [TODAY]: 5 };
    const snapshot = { ...entries };
    computeFire(entries, TODAY);
    expect(entries).toEqual(snapshot);
  });

  test('Fire Health derivation does not alter fire state, strength, or labels', () => {
    const entries: Entries = { [day(-2)]: 5, [day(-1)]: 1, [TODAY]: 5 };
    const before = computeFire(entries, TODAY);

    readEmberMood(entries, before, TODAY);

    expect(computeFire(entries, TODAY)).toEqual(before);
    expect(fireLabel(before.state, before.strength)).toEqual(before.label);
  });
});

describe('computeFire — ignores invalid/future data', () => {
  test('future scored days do not contribute', () => {
    const entries = { [addDays(TODAY, 3)]: 5 } as Entries;
    expect(computeFire(entries, TODAY).state).toBe('unlit');
  });

  test('out-of-range scores are ignored', () => {
    const entries = { [TODAY]: 9 as unknown as Score };
    expect(computeFire(entries, TODAY).state).toBe('unlit');
  });
});

describe('classifyDay', () => {
  test('future / scored / today / missed', () => {
    const entries: Entries = { [day(-2)]: 3 };
    expect(classifyDay(entries, addDays(TODAY, 1), TODAY)).toBe('future');
    expect(classifyDay(entries, day(-2), TODAY)).toBe('scored');
    expect(classifyDay(entries, TODAY, TODAY)).toBe('today');
    expect(classifyDay(entries, day(-1), TODAY)).toBe('missed');
  });
});

describe('fireLabel', () => {
  test('matches the design wording across the ramp', () => {
    expect(fireLabel('unlit', 0).word).toBe('Unlit');
    expect(fireLabel('out', 0).word).toBe('Out');
    expect(fireLabel('lit', 0).word).toBe('A spark');
    expect(fireLabel('lit', 4).word).toBe('Kindling');
    expect(fireLabel('lit', 10).word).toBe('Steady');
    expect(fireLabel('lit', 20).word).toBe('Blazing');
    expect(fireLabel('lit', 30).word).toBe('Roaring');
    expect(fireLabel('lit', 57).word).toBe('Inferno');
  });

  test('computeFire attaches the matching label', () => {
    const fire = computeFire({ [TODAY]: 5 }, TODAY);
    expect(fire.label.word).toBe('Kindling'); // strength 4
  });
});

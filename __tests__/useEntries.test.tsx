/**
 * useEntries.test.tsx — hook tests for the entries state and fire derivation.
 *
 * A tiny probe component exposes the hook's return value through a mutable
 * `latest` variable so tests can call setScore/clearScore and inspect entries,
 * fire, and ready without any native UI. AsyncStorage is never touched: the
 * entries store module is mocked so loads return fixtures and saves are spied.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import type { DateKey } from '../src/domain/dates';
import type { Entries, FireState } from '../src/domain/fire';
import { computeFire } from '../src/domain/fire';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';

// Replace the storage module so no AsyncStorage access happens in these tests.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so every test is deterministic and independent of wall-clock time.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: mounts the hook and copies its return value out for assertions.
function Probe({ today }: { today: DateKey }) {
  const value = useEntries(today);
  React.useEffect(() => {
    latest = value;
  });
  latest = value;
  return <Text>{value.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and wait for the mocked load promise to settle.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  mockedLoad.mockResolvedValue({});
  mockedSave.mockResolvedValue(undefined);
  latest = undefined as unknown as UseEntries;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useEntries initial load', () => {
  test('starts not ready and becomes ready with loaded entries', async () => {
    const fixture: Entries = { '2026-06-08': 4, '2026-06-09': 3 };
    mockedLoad.mockResolvedValue(fixture);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(fixture);
  });

  test('derives fire from the loaded entries', async () => {
    const fixture: Entries = { '2026-06-08': 5, '2026-06-09': 2 };
    mockedLoad.mockResolvedValue(fixture);

    await renderHook();

    expect(latest.fire).toEqual(computeFire(fixture, TODAY));
  });

  test('handles an empty stored calendar', async () => {
    mockedLoad.mockResolvedValue({});

    await renderHook();

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5] as const)(
    'accepts valid score %i for today and persists deep-equal data',
    async score => {
      await renderHook();

      await act(async () => {
        latest.setScore(TODAY, score);
      });

      expect(latest.entries).toEqual({ [TODAY]: score });
      expect(mockedSave).toHaveBeenCalledTimes(1);
      expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: score });
    },
  );

  test('accepts a valid score for a past date', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-01' as DateKey, 3);
    });

    expect(latest.entries).toEqual({ '2026-06-01': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-01': 3 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 2 });
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'ignores invalid score %p without saving',
    async score => {
      await renderHook();

      await act(async () => {
        latest.setScore(TODAY, score as never);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('ignores a score for a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11' as DateKey, 4);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('does not throw when saveEntries rejects', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the remaining data', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4, [TODAY]: 3 });
    await renderHook();

    await act(async () => {
      latest.clearScore(TODAY);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op for an absent date and does not save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  // Contract behavior table, evaluated against the fixed TODAY value.
  test('empty calendar yields an extinguished fire', async () => {
    await renderHook();

    expect(latest.fire).toEqual(computeFire({}, TODAY));
    expect(latest.fire.lit).toBe(false);
  });

  test('a single score on today lights the fire', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 3 });
    await renderHook();

    expect(latest.fire.lit).toBe(true);
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 3 }, TODAY));
  });

  test('consecutive scored days keep the fire lit', async () => {
    const entries: Entries = { '2026-06-08': 3, '2026-06-09': 4, [TODAY]: 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire.lit).toBe(true);
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('a single unscored past day does not extinguish the fire', async () => {
    // Day 06-09 is missing; scores on 06-08 and today.
    const entries: Entries = { '2026-06-08': 4, [TODAY]: 4 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire.lit).toBe(true);
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('two consecutive unscored past days extinguish the fire', async () => {
    // Days 06-08 and 06-09 are both missing before a score from 06-07.
    const entries: Entries = { '2026-06-07': 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire.lit).toBe(false);
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('fire updates when a score is added through setScore', async () => {
    await renderHook();
    expect(latest.fire.lit).toBe(false);

    await act(async () => {
      latest.setScore(TODAY, 2);
    });

    expect(latest.fire).toEqual(computeFire({ [TODAY]: 2 }, TODAY));
    expect(latest.fire.lit).toBe(true);
  });
});

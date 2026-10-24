/**
 * useEntries.test.tsx — hook tests for entry loading, score changes, and derived fire state.
 *
 * The persistence layer (entriesStore) is mocked so AsyncStorage is never touched.
 * A tiny probe component exposes the hook's return value through a ref so tests can
 * drive setScore/clearScore and inspect entries, fire, and ready without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result in a module variable so tests can read it.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Renders the probe inside act() and waits for the initial load promise to settle.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
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
  test('starts not ready with empty entries while loading', async () => {
    let resolve!: (value: Entries) => void;
    mockedLoad.mockReturnValueOnce(new Promise<Entries>(r => (resolve = r)));

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});

    await act(async () => {
      resolve({ '2026-06-09': 3 });
    });
    expect(latest.ready).toBe(true);
  });

  test('flips ready to true and populates entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 2 };
    mockedLoad.mockResolvedValueOnce(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('does not call saveEntries during the initial load', async () => {
    await renderHook();
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries setScore', () => {
  test('stores a valid score for a past date and saves the deep-equal next map', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 3);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('accepts score 1 through 5 for today', async () => {
    await renderHook();

    for (const score of [1, 2, 3, 4, 5] as const) {
      await act(async () => {
        latest.setScore(TODAY, score);
      });
      expect(latest.entries[TODAY]).toBe(score);
    }
    expect(mockedSave).toHaveBeenCalledTimes(5);
  });

  test('replaces an existing score for the same date', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p without saving', async score => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, score as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11' as DateKey, 4);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries clearScore', () => {
  test('removes an existing day and saves the resulting map', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-08': 4, '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op for a missing day: same reference and no save', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-08': 4 });
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries derived fire', () => {
  test('empty entries yield the engine result for an empty calendar', async () => {
    await renderHook();
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });

  test('a single score lights the fire', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-10': 3 });
    await renderHook();
    expect(latest.fire).toEqual(computeFire({ '2026-06-10': 3 }, TODAY));
  });

  test('consecutive scored days keep the fire lit', async () => {
    const entries: Entries = { '2026-06-08': 3, '2026-06-09': 4, '2026-06-10': 2 };
    mockedLoad.mockResolvedValueOnce(entries);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('a single unscored past day does not extinguish the fire', async () => {
    const entries: Entries = { '2026-06-08': 3, '2026-06-10': 3 };
    mockedLoad.mockResolvedValueOnce(entries);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('two consecutive unscored past days extinguish the fire', async () => {
    const entries: Entries = { '2026-06-07': 5 };
    mockedLoad.mockResolvedValueOnce(entries);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('fire recomputes after setScore changes the calendar', async () => {
    await renderHook();
    const before = latest.fire;

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 }, TODAY));
  });
});

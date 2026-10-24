/**
 * useEntries.test.tsx — hook tests for score entry state and derived fire state.
 *
 * The persistence layer (entriesStore) is mocked so AsyncStorage is never
 * touched directly. A tiny probe component exposes hook state through a
 * mutable ref so tests can drive loading, setScore, and clearScore without
 * native UI. All dates are relative to a fixed `today` for determinism.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module with jest mocks so no AsyncStorage access happens.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so every date comparison and fire calculation is deterministic.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and copies its result into `latest`.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and let the mocked load promise resolve.
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

describe('useEntries: initial load', () => {
  test('starts not ready and becomes ready after loading', async () => {
    mockedLoad.mockResolvedValue({});
    await renderHook();
    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
  });

  test('populates entries from the stored map', async () => {
    const stored: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
    mockedLoad.mockResolvedValue(stored);
    await renderHook();
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(stored);
  });

  test('derives fire state from the loaded entries', async () => {
    const stored: Entries = { '2026-06-09': 4, '2026-06-10': 2 };
    mockedLoad.mockResolvedValue(stored);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(stored, TODAY));
  });
});

describe('useEntries: setScore', () => {
  test('accepts a valid score for a past day and persists the new map', async () => {
    await renderHook();
    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 4);
    });
    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 4 });
  });

  test('accepts a score for today', async () => {
    await renderHook();
    await act(async () => {
      latest.setScore(TODAY, 1);
    });
    expect(latest.entries).toEqual({ [TODAY]: 1 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 1 });
  });

  test('accepts every boundary score from 1 through 5', async () => {
    await renderHook();
    for (const score of [1, 2, 3, 4, 5] as const) {
      await act(async () => {
        latest.setScore(('2026-06-0' + score) as DateKey, score);
      });
    }
    expect(Object.keys(latest.entries)).toHaveLength(5);
    expect(mockedSave).toHaveBeenCalledTimes(5);
  });

  test.each([0, 6, 2.5, -1])('ignores invalid score %p without saving', async score => {
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
      latest.setScore('2026-06-11' as DateKey, 3);
    });
    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();
    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });
    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 5 });
  });
});

describe('useEntries: clearScore', () => {
  test('removes an existing day and persists the reduced map', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();
    await act(async () => {
      latest.clearScore('2026-06-08' as DateKey);
    });
    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 4 });
  });

  test('is a no-op for an absent date', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 4 });
    await renderHook();
    await act(async () => {
      latest.clearScore('2026-06-07' as DateKey);
    });
    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries: derived fire state', () => {
  test('empty calendar yields an unlit fire', async () => {
    await renderHook();
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });

  test('a single score on today lights the fire', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 3 });
    await renderHook();
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 3 }, TODAY));
  });

  test('consecutive scored days keep the fire lit', async () => {
    const stored: Entries = { '2026-06-08': 2, '2026-06-09': 3, [TODAY]: 4 };
    mockedLoad.mockResolvedValue(stored);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(stored, TODAY));
  });

  test('a one-day gap does not extinguish the fire', async () => {
    const stored: Entries = { '2026-06-08': 3, [TODAY]: 3 };
    mockedLoad.mockResolvedValue(stored);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(stored, TODAY));
  });

  test('a two-day miss extinguishes the fire', async () => {
    const stored: Entries = { '2026-06-07': 5 };
    mockedLoad.mockResolvedValue(stored);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(stored, TODAY));
  });

  test('fire updates after setScore changes the calendar', async () => {
    await renderHook();
    const before = latest.fire;
    await act(async () => {
      latest.setScore(TODAY, 5);
    });
    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 }, TODAY));
  });
});

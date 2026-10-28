/**
 * useEntries.test.tsx — hook tests for the entries state machine.
 *
 * A tiny probe component exposes hook state through a ref so tests can drive
 * loading, score changes, and clearing without native UI. The persistence
 * layer (src/data/entriesStore) is mocked so no AsyncStorage is touched and
 * every run is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module with jest mocks so no real AsyncStorage is used.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so every date-dependent result is deterministic.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and publishes its result to `latest`.
function Probe({ today }: { today: DateKey }) {
  const state = useEntries(today);
  React.useEffect(() => {
    latest = state;
  });
  return <Text>{state.ready ? 'ready' : 'loading'}</Text>;
}

// Renders the probe and waits for the initial async load to settle.
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

describe('initial load', () => {
  test('starts not ready and becomes ready with loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 3 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('loads an empty calendar when nothing is persisted', async () => {
    await renderHook();

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
  });

  test('does not save anything on initial load', async () => {
    await renderHook();

    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('setScore', () => {
  test('accepts a valid score for a past day and persists it', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 3);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('accepts today and every score from 1 to 5', async () => {
    await renderHook();

    for (const score of [1, 2, 3, 4, 5] as const) {
      act(() => {
        latest.setScore(TODAY, score);
      });
      expect(latest.entries[TODAY]).toBe(score);
    }
  });

  test('replacing an existing score persists the full updated map', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test('persisted data deep-equals the in-memory entries', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-08' as DateKey, 1);
      latest.setScore('2026-06-09' as DateKey, 4);
    });

    const lastSaved = mockedSave.mock.calls[mockedSave.mock.calls.length - 1][0];
    expect(lastSaved).toEqual(latest.entries);
  });

  test('ignores a score outside the 1..5 range without saving', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 0 as never);
      latest.setScore('2026-06-09' as DateKey, 6 as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a non-integer score without saving', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 2.5 as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 5);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a storage failure does not break the in-memory state', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 4);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op for an absent date: no save and same reference', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 });
    await renderHook();
    const before = latest.entries;

    act(() => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('empty calendar gives an unlit fire', async () => {
    await renderHook();

    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });

  test('a single score lights the fire', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-10': 3 });
    await renderHook();

    expect(latest.fire).toEqual(computeFire({ '2026-06-10': 3 }, TODAY));
  });

  test('consecutive scored days keep the fire alive', async () => {
    const entries: Entries = { '2026-06-08': 2, '2026-06-09': 3, '2026-06-10': 4 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('a single unscored past day does not extinguish the fire', async () => {
    const entries: Entries = { '2026-06-07': 3, '2026-06-09': 4 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('two consecutive unscored past days extinguish the fire', async () => {
    const entries: Entries = { '2026-06-06': 5, '2026-06-07': 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('fire updates when a score is added', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 4 }, TODAY));
  });
});

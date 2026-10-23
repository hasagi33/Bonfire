/**
 * useEntries.test.tsx — hook tests for the score/fire state container.
 *
 * A tiny probe component exposes hook state through a module-level handle so
 * tests can drive setScore/clearScore and inspect entries, fire, and ready.
 * The entriesStore module is mocked so AsyncStorage is never touched directly,
 * and `today` is a fixed DateKey so results are deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module with jest mocks; no real AsyncStorage access.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so every date comparison is deterministic.
const TODAY = '2026-06-10' as DateKey;

// Handle filled in by the probe on every render so tests can read latest state.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and mirrors its return value into `latest`.
function Probe({ today }: { today: DateKey }) {
  const state = useEntries(today);
  React.useEffect(() => {
    latest = state;
  });
  return <Text>{state.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and wait for the initial load promise to settle.
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
  test('starts not ready and becomes ready with loaded entries', async () => {
    const saved: Entries = { '2026-06-09': 4 as Score };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('empty storage yields ready with no entries and the empty-calendar fire', async () => {
    await renderHook();

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

describe('setScore', () => {
  test('accepts a valid score on a past day and persists the updated map', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 3 as Score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('accepts a score for today', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(latest.entries[TODAY]).toBe(5);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 as Score });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5 as Score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p without saving', async bad => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, bad as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11' as DateKey, 4 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('round-trip: saved map deep-equals what a fresh load returns', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-08' as DateKey, 2 as Score);
      latest.setScore('2026-06-09' as DateKey, 4 as Score);
    });

    const saved = mockedSave.mock.calls[mockedSave.mock.calls.length - 1][0];
    mockedLoad.mockResolvedValue(saved);

    act(() => {
      rendered?.unmount();
    });
    rendered = null;
    await renderHook();

    expect(latest.entries).toEqual(saved);
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the remaining map', async () => {
    mockedLoad.mockResolvedValue({
      '2026-06-08': 3 as Score,
      '2026-06-09': 4 as Score,
    });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op for a missing date and does not save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 as Score });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('fire is derived from entries and recomputed when entries change', async () => {
    await renderHook();
    const before = latest.fire;

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5 as Score);
    });

    expect(latest.fire).not.toBe(before);
    expect(latest.fire).toEqual(computeFire({ '2026-06-09': 5 as Score }, TODAY));
  });

  test('fire is memoized: unchanged inputs return the same object', async () => {
    await renderHook();
    const first = latest.fire;

    // Re-render with the same today and no entry change.
    await act(async () => {
      rendered?.update(<Probe today={TODAY} />);
    });

    expect(latest.fire).toBe(first);
  });

  test('fire recomputes when today changes', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 4 as Score });
    await renderHook(TODAY);
    const first = latest.fire;

    await act(async () => {
      rendered?.update(<Probe today={'2026-06-12' as DateKey} />);
    });

    expect(latest.fire).not.toBe(first);
  });
});

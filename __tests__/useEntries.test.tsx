/**
 * useEntries.test.tsx — hook tests for the entries state layer.
 *
 * A tiny probe component exposes hook state through a mutable ref so tests can
 * drive setScore/clearScore and inspect entries, fire, and ready without any
 * native UI. The entriesStore module is mocked so AsyncStorage is never touched
 * and no network or wall-clock behavior is involved.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries, Score, FireState } from '../src/domain/fire';

// Mock the storage layer so no AsyncStorage calls happen in these tests.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so date comparisons are deterministic.
const TODAY = '2026-06-10' as DateKey;

// Holds the latest hook result from the probe component.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and copies its result out for assertions.
function Probe({ today }: { today: DateKey }) {
  const result = useEntries(today);
  React.useEffect(() => {
    latest = result;
  });
  return <Text>{result.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and flush the pending loadEntries promise.
async function renderHook(today: DateKey = TODAY, initial: Entries = {}) {
  mockedLoad.mockResolvedValue(initial);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

// Helper: a fire state is considered lit when it has a defined value. The
// engine's exact shape is not relied upon beyond being a defined object.
function isLit(fire: FireState): boolean {
  return fire !== undefined && fire !== null;
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
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
  test('starts not ready and then becomes ready with loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 4 as Score };
    await renderHook(TODAY, saved);

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('exposes a fire state derived from the loaded entries', async () => {
    await renderHook(TODAY, { [TODAY]: 3 as Score });

    expect(latest.fire).toBeDefined();
    expect(isLit(latest.fire)).toBe(true);
  });

  test('does not save anything during the initial load', async () => {
    await renderHook(TODAY, { '2026-06-09': 2 as Score });

    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i on today and persists', async score => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, score as Score);
    });

    expect(latest.entries[TODAY]).toBe(score);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: score });
  });

  test('accepts a past date and persists the deep-equal merged map', async () => {
    const existing: Entries = { '2026-06-08': 2 as Score };
    await renderHook(TODAY, existing);

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5 as Score);
    });

    const expected = { '2026-06-08': 2, '2026-06-09': 5 };
    expect(latest.entries).toEqual(expected);
    expect(mockedSave).toHaveBeenCalledWith(expected);
  });

  test('replaces an existing score for the same day', async () => {
    await renderHook(TODAY, { [TODAY]: 1 as Score });

    await act(async () => {
      latest.setScore(TODAY, 4 as Score);
    });

    expect(latest.entries[TODAY]).toBe(4);
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: 4 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p without saving', async bad => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, bad as unknown as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11' as DateKey, 3 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the remaining map', async () => {
    const existing: Entries = {
      '2026-06-08': 3 as Score,
      '2026-06-09': 5 as Score,
    };
    await renderHook(TODAY, existing);

    await act(async () => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op and does not save when the date has no score', async () => {
    await renderHook(TODAY, { '2026-06-08': 2 as Score });

    await act(async () => {
      latest.clearScore('2026-06-05' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 2 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('fire is recomputed after a score is added', async () => {
    await renderHook();
    const before = latest.fire;

    await act(async () => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(latest.fire).not.toBe(before);
    expect(isLit(latest.fire)).toBe(true);
  });

  test('fire is recomputed when today changes', async () => {
    await renderHook(TODAY, { '2026-06-08': 4 as Score });
    const before = latest.fire;

    await act(async () => {
      rendered?.update(<Probe today={'2026-06-12' as DateKey} />);
    });

    expect(latest.fire).not.toBe(before);
  });

  test('fire is memoized and stable across re-renders with unchanged inputs', async () => {
    await renderHook(TODAY, { [TODAY]: 3 as Score });
    const first = latest.fire;

    await act(async () => {
      rendered?.update(<Probe today={TODAY} />);
    });

    expect(latest.fire).toBe(first);
  });
});

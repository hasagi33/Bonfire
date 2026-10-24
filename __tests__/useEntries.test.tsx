/**
 * useEntries.test.tsx — hook tests for entry loading, score validation,
 * persistence, and derived fire state.
 *
 * A tiny probe component exposes hook state through a mutable ref so tests can
 * drive setScore/clearScore and inspect results without native UI. The
 * entriesStore module is mocked so AsyncStorage is never touched directly.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';
import type { Entries, Score } from '../src/domain/fire';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so tests never depend on the wall clock.
const TODAY = '2026-06-10' as DateKey;

// Holds the most recent hook result so tests can read and call it.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and mirrors its result into `latest`.
function Probe() {
  const result = useEntries(TODAY);
  latest = result;
  return <Text>{result.ready ? 'ready' : 'loading'}</Text>;
}

// Mounts the probe and waits for the initial load promise to resolve.
async function renderHook() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSave.mockResolvedValue(undefined);
  mockedLoad.mockResolvedValue({});
  latest = undefined as unknown as UseEntries;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useEntries initial load', () => {
  test('starts not ready with empty entries before load resolves', () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));
    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });

  test('sets ready=true and entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-09': 4 as Score, '2026-06-08': 1 as Score };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('derives fire state from loaded entries', async () => {
    const saved: Entries = { '2026-06-09': 5 as Score };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(latest.fire).toEqual(computeFire(saved, TODAY));
  });
});

describe('useEntries setScore', () => {
  test('adds a valid score on a past day and persists the updated map', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 3 as Score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('accepts today as a valid date', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('replaces an existing score and persists the merged map', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 as Score });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5 as Score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p without saving', async score => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, score as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a future date without saving', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 4 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows save failures so the UI state still updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 2 as Score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 2 });
  });
});

describe('useEntries clearScore', () => {
  test('removes an existing score and persists the remaining map', async () => {
    mockedLoad.mockResolvedValue({
      '2026-06-08': 4 as Score,
      '2026-06-09': 3 as Score,
    });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op with no save for an absent date', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4 as Score });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries derived fire', () => {
  test('recomputes fire when a score is added', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5 as Score);
    });

    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(computeFire({ '2026-06-09': 5 as Score }, TODAY));
  });

  test('recomputes fire when a score is cleared', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 5 as Score });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

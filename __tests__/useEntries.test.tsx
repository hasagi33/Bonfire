/**
 * useEntries.test.tsx — hook tests for the score entries and derived fire state.
 *
 * Storage is mocked so AsyncStorage is never touched directly. A small probe
 * component exposes the hook's return value through a module-level variable so
 * tests can drive setScore/clearScore and inspect entries, fire, and ready.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import type { DateKey } from '../src/domain/dates';
import { computeFire, type Entries } from '../src/domain/fire';
import { loadEntries, saveEntries } from '../src/data/entriesStore';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" keeps every date comparison deterministic.
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result in a module variable on every render.
function Probe() {
  latest = useEntries(TODAY);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and wait for the initial async load to settle.
async function renderHook() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
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
  test('sets ready true and entries from loadEntries', async () => {
    const saved: Entries = { [PAST]: 3, [OLDER]: 5 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('is not ready before the load resolves', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({});
    });

    expect(latest.ready).toBe(true);
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i for today and past dates', async score => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, score as 1 | 2 | 3 | 4 | 5);
    });
    act(() => {
      latest.setScore(PAST, score as 1 | 2 | 3 | 4 | 5);
    });

    expect(latest.entries[TODAY]).toBe(score);
    expect(latest.entries[PAST]).toBe(score);
  });

  test('persists the updated entries with deep-equal data', async () => {
    mockedLoad.mockResolvedValue({ [OLDER]: 2 });
    await renderHook();

    act(() => {
      latest.setScore(PAST, 4 as 4);
    });

    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenLastCalledWith({ [OLDER]: 2, [PAST]: 4 });
  });

  test('replaces an existing score for the same date', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 2 });
    await renderHook();

    act(() => {
      latest.setScore(PAST, 5 as 5);
    });

    expect(latest.entries[PAST]).toBe(5);
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p and does not save', async bad => {
    await renderHook();

    act(() => {
      latest.setScore(PAST, bad as 1);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores future dates and does not save', async () => {
    await renderHook();

    act(() => {
      latest.setScore(FUTURE, 3 as 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows save failures without throwing', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    expect(() => {
      act(() => {
        latest.setScore(PAST, 3 as 3);
      });
    }).not.toThrow();
    expect(latest.entries[PAST]).toBe(3);
  });
});

describe('clearScore', () => {
  test('removes an existing date and persists the result', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3, [OLDER]: 4 });
    await renderHook();

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 4 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [OLDER]: 4 });
  });

  test('is a no-op for a missing date: same state object and no save', async () => {
    mockedLoad.mockResolvedValue({ [OLDER]: 4 });
    await renderHook();
    const before = latest.entries;

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire', () => {
  test('is derived from entries via computeFire', async () => {
    mockedLoad.mockResolvedValue({ [OLDER]: 3, [PAST]: 5 });
    await renderHook();

    expect(latest.fire).toEqual(computeFire({ [OLDER]: 3, [PAST]: 5 }, TODAY));
  });

  test('updates when entries change', async () => {
    await renderHook();
    const emptyFire = latest.fire;

    act(() => {
      latest.setScore(PAST, 5 as 5);
    });

    expect(latest.fire).not.toBe(emptyFire);
    expect(latest.fire).toEqual(computeFire({ [PAST]: 5 }, TODAY));
  });
});

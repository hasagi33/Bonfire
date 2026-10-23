/**
 * useEntries.test.tsx — hook tests for score state, persistence, and derived fire.
 *
 * A tiny probe component exposes hook state through a mutable ref so tests can
 * call setScore/clearScore and inspect the result. The entriesStore module is
 * mocked so AsyncStorage is never touched and tests stay deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';
import { loadEntries, saveEntries } from '../src/data/entriesStore';

// Replace the storage module so no real AsyncStorage access happens in tests.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so date-based logic is deterministic.
const TODAY: DateKey = '2026-06-10';

// Holds the most recent hook result so tests can read and drive it.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and mirrors its result into `latest`.
function Probe({ today }: { today: DateKey }) {
  const value = useEntries(today);
  latest = value;
  return <Text>{value.ready ? 'ready' : 'loading'}</Text>;
}

// Mounts the probe and flushes pending promises so the initial load settles.
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

describe('initial load', () => {
  test('sets ready true and entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 2 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready while the load is pending', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});

    await act(async () => {
      resolveLoad({ '2026-06-10': 3 });
    });

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({ '2026-06-10': 3 });
  });

  test('unmounting before the load resolves does not set state', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    const snapshot = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ '2026-06-10': 5 });
    });

    // No state update after unmount means the hook result is unchanged.
    expect(latest).toBe(snapshot);
    expect(snapshot.ready).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('setScore', () => {
  test('accepts valid scores 1..5 for today and past dates and persists them', async () => {
    await renderHook();

    for (const score of [1, 2, 3, 4, 5] as const) {
      const date: DateKey = `2026-06-0${score}`;
      await act(async () => {
        latest.setScore(date, score);
      });
      expect(latest.entries[date]).toBe(score);
    }

    expect(latest.entries['2026-06-10']).toBeUndefined();
    expect(mockedSave).toHaveBeenLastCalledWith({
      '2026-06-01': 1,
      '2026-06-02': 2,
      '2026-06-03': 3,
      '2026-06-04': 4,
      '2026-06-05': 5,
    });
  });

  test('accepts a score for today itself', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 3);
    });

    expect(latest.entries).toEqual({ [TODAY]: 3 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 3 });
  });

  test('ignores non-integer scores without state change or save', async () => {
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.setScore('2026-06-09', 2.5 as unknown as 1);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores out-of-range scores without state change or save', async () => {
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.setScore('2026-06-09', 0 as unknown as 1);
      latest.setScore('2026-06-09', 6 as unknown as 1);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores future dates without state change or save', async () => {
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.setScore('2026-06-11', 4);
    });

    expect(latest.entries).toBe(before);
    expect(latest.entries['2026-06-11']).toBeUndefined();
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.entries['2026-06-09']).toBe(5);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 5 });
  });

  test('derives fire state from the updated entries', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.fire).toEqual(computeFire({ '2026-06-09': 5 }, TODAY));
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op for an absent date without state change or save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 });
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.clearScore('2026-06-01');
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('empty calendar yields an unlit fire', async () => {
    await renderHook();

    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });

  test('single score lights the fire', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-10': 4 });
    await renderHook();

    expect(latest.fire).toEqual(computeFire({ '2026-06-10': 4 }, TODAY));
  });

  test('consecutive scored days keep the fire lit', async () => {
    const entries: Entries = { '2026-06-08': 3, '2026-06-09': 3, '2026-06-10': 3 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('a one-day gap does not put the fire out', async () => {
    const entries: Entries = { '2026-06-08': 3, '2026-06-10': 3 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('a two-day miss puts the fire out', async () => {
    const entries: Entries = { '2026-06-07': 5, '2026-06-08': 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });
});

describe('unmounting', () => {
  test('unmounting after load completes does not throw', async () => {
    await renderHook();

    expect(() => {
      act(() => {
        rendered?.unmount();
      });
    }).not.toThrow();
    rendered = null;
  });
});

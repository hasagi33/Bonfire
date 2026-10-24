/**
 * useEntries.test.tsx — hook tests for score entries and derived fire state.
 *
 * A tiny probe component exposes the hook's return value through a ref-like
 * holder so tests can drive setScore/clearScore and inspect entries, fire, and
 * ready without any native UI. The entries store is mocked so AsyncStorage is
 * never touched and every test is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { computeFire, type Entries } from '../src/domain/fire';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module so no real AsyncStorage calls happen in tests.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockLoadEntries = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockSaveEntries = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so date comparisons and fire math are fully deterministic.
const TODAY = '2026-06-10' as DateKey;

// Holds the most recent hook result so tests can read it after each render.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and stores its result for the test to inspect.
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
  mockLoadEntries.mockResolvedValue({});
  mockSaveEntries.mockResolvedValue(undefined);
  latest = undefined as unknown as UseEntries;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('initial load', () => {
  test('sets ready to true and populates entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 3 };
    mockLoadEntries.mockResolvedValue(saved);

    await renderHook();

    expect(mockLoadEntries).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready and empty before the load resolves', () => {
    mockLoadEntries.mockReturnValue(new Promise(() => {}));

    act(() => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });

  test('does not set state if unmounted before the load resolves', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockLoadEntries.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    const snapshot = latest;
    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ '2026-06-09': 5 });
    });

    // Hook result must not have changed after unmount, and React must not warn.
    expect(latest).toBe(snapshot);
    expect(snapshot.ready).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('setScore', () => {
  test('adds a valid score for today and persists the full entries map', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 3);
    });

    expect(latest.entries).toEqual({ [TODAY]: 3 });
    expect(mockSaveEntries).toHaveBeenCalledTimes(1);
    expect(mockSaveEntries).toHaveBeenCalledWith({ [TODAY]: 3 });
  });

  test('adds a valid score for a past date and persists it', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockSaveEntries).toHaveBeenCalledWith({ '2026-06-09': 5 });
  });

  test.each([1, 2, 3, 4, 5])('accepts boundary-valid score %i', async score => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, score as 1 | 2 | 3 | 4 | 5);
    });

    expect(latest.entries[TODAY]).toBe(score);
    expect(mockSaveEntries).toHaveBeenCalledTimes(1);
  });

  test('replaces an existing score for the same date', async () => {
    mockLoadEntries.mockResolvedValue({ [TODAY]: 2 });
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockSaveEntries).toHaveBeenLastCalledWith({ [TODAY]: 4 });
  });

  test.each([0, 6, -1, 2.5, NaN, Infinity])(
    'ignores invalid score %p without saving',
    async score => {
      await renderHook();

      await act(async () => {
        latest.setScore(TODAY, score as never);
      });

      expect(latest.entries).toEqual({});
      expect(mockSaveEntries).not.toHaveBeenCalled();
    },
  );

  test('ignores a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11' as DateKey, 4);
    });

    expect(latest.entries).toEqual({});
    expect(mockSaveEntries).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing date and persists the remaining entries', async () => {
    mockLoadEntries.mockResolvedValue({
      '2026-06-08': 4,
      '2026-06-09': 3,
    });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockSaveEntries).toHaveBeenCalledTimes(1);
    expect(mockSaveEntries).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op and does not save when the date is absent', async () => {
    mockLoadEntries.mockResolvedValue({ '2026-06-08': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockSaveEntries).not.toHaveBeenCalled();
  });
});

describe('fire', () => {
  test('matches computeFire over the current entries and today', async () => {
    const saved: Entries = {
      '2026-06-07': 3,
      '2026-06-08': 5,
      '2026-06-09': 4,
    };
    mockLoadEntries.mockResolvedValue(saved);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(saved, TODAY));
  });

  test('re-derives fire after a score is added', async () => {
    await renderHook();
    const before = latest.fire;

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 }, TODAY));
    expect(latest.fire).not.toEqual(before);
  });

  test('re-derives fire when today changes', async () => {
    mockLoadEntries.mockResolvedValue({ '2026-06-08': 4, '2026-06-09': 4 });
    await renderHook(TODAY);

    const entries = latest.entries;
    act(() => {
      rendered?.update(<Probe today={'2026-06-12' as DateKey} />);
    });

    expect(latest.fire).toEqual(computeFire(entries, '2026-06-12' as DateKey));
  });
});

/**
 * useEntries.test.tsx — hook tests for the entries state machine.
 *
 * A tiny probe component exposes hook state through a module-level ref so
 * tests can call setScore/clearScore and inspect entries, fire, and ready
 * without any native UI. The entries store is mocked so AsyncStorage is never
 * touched and every test is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, isScore, type Entries } from '../src/domain/fire';
import { isFuture, type DateKey } from '../src/domain/dates';

// Keep the store out of the picture: no AsyncStorage, no disk, no network.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so future-date checks and fire derivation are deterministic.
const TODAY: DateKey = '2026-06-10';

// Holds the latest hook result so tests can drive it between renders.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe({ today }: { today: DateKey }) {
  const result = useEntries(today);
  React.useEffect(() => {
    latest = result;
  });
  return <Text>{result.ready ? 'ready' : 'loading'}</Text>;
}

// Mount the probe and let the async load resolve inside act().
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

describe('useEntries — initial load', () => {
  test('starts not ready, then becomes ready with loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 2 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('derives fire from the loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(latest.fire).toEqual(computeFire(saved, TODAY));
  });
});

describe('useEntries — setScore', () => {
  test('adds a valid score for a past day and persists the deep-equal payload', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 4);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 4 });
  });

  test('accepts a score for today (not a future date)', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'ignores out-of-range or non-integer score %p',
    async bad => {
      await renderHook();
      expect(isScore(bad as never)).toBe(false);

      await act(async () => {
        latest.setScore('2026-06-09', bad as never);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('ignores a score for a future date', async () => {
    await renderHook();
    const future: DateKey = '2026-06-11';
    expect(isFuture(future, TODAY)).toBe(true);

    await act(async () => {
      latest.setScore(future, 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows save failures so the UI state still updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 3);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
  });
});

describe('useEntries — clearScore', () => {
  test('removes an existing day and persists the remaining entries', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4, '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op for a day with no score', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-01');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries — derived fire', () => {
  test('is empty when there are no entries', async () => {
    await renderHook();

    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });

  test('matches computeFire for a single score', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 3 });
    await renderHook();

    expect(latest.fire).toEqual(computeFire({ [TODAY]: 3 }, TODAY));
  });

  test('matches computeFire for consecutive scored days', async () => {
    const entries: Entries = { '2026-06-08': 2, '2026-06-09': 4, [TODAY]: 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('stays lit across a one-day gap', async () => {
    const entries: Entries = { '2026-06-07': 3, [TODAY]: 3 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('goes out after a two-day miss', async () => {
    const entries: Entries = { '2026-06-06': 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('recomputes after setScore changes the calendar', async () => {
    await renderHook();
    const before = latest.fire;

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(computeFire({ '2026-06-09': 5 }, TODAY));
  });
});

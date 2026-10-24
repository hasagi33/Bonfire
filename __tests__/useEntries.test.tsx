/**
 * useEntries.test.tsx — hook tests for score entries and derived fire state.
 *
 * A tiny probe component exposes hook state through a ref so tests can drive
 * setScore/clearScore and inspect results without any native UI. The entries
 * store is mocked so no AsyncStorage or network access happens.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import type { DateKey } from '../src/domain/dates';
import type { Entries, Score } from '../src/domain/fire';
import { computeFire } from '../src/domain/fire';
import { loadEntries, saveEntries } from '../src/data/entriesStore';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so tests never depend on the wall clock.
const TODAY: DateKey = '2026-06-10';
const PAST: DateKey = '2026-06-09';
const FUTURE: DateKey = '2026-06-11';

let latest: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: copies the hook result into a shared variable so tests
// can read the latest state and call the returned actions.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return null;
}

// Render the probe and let the initial async load settle.
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
  test('sets ready=true and entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-08': 4 as Score, [PAST]: 3 as Score };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready and empty before the load resolves', () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));

    act(() => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test('adds a valid score for today and persists the next map', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('accepts a score for a past day', async () => {
    await renderHook();

    act(() => {
      latest.setScore(PAST, 2 as Score);
    });

    expect(latest.entries).toEqual({ [PAST]: 2 });
    expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 2 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'ignores invalid score %p without saving or changing state',
    async bad => {
      await renderHook();
      const before = latest.entries;

      act(() => {
        latest.setScore(TODAY, bad as Score);
      });

      expect(mockedSave).not.toHaveBeenCalled();
      expect(latest.entries).toBe(before);
    },
  );

  test('ignores a future date without saving or changing state', async () => {
    await renderHook();
    const before = latest.entries;

    act(() => {
      latest.setScore(FUTURE, 3 as Score);
    });

    expect(mockedSave).not.toHaveBeenCalled();
    expect(latest.entries).toBe(before);
    expect(latest.entries).not.toHaveProperty(FUTURE);
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 1 as Score });
    await renderHook();

    act(() => {
      latest.setScore(PAST, 4 as Score);
    });

    expect(latest.entries).toEqual({ [PAST]: 4 });
    expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 4 });
  });

  test('does not throw when saveEntries rejects (fire-and-forget)', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    expect(() => {
      act(() => {
        latest.setScore(TODAY, 3 as Score);
      });
    }).not.toThrow();
    expect(latest.entries).toEqual({ [TODAY]: 3 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 as Score, [TODAY]: 5 as Score });
    await renderHook();

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('is a no-op with no save when the date is absent', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 5 as Score });
    await renderHook();
    const before = latest.entries;

    act(() => {
      latest.clearScore(PAST);
    });

    expect(mockedSave).not.toHaveBeenCalled();
    expect(latest.entries).toBe(before);
  });
});

describe('fire derivation', () => {
  test('fire equals computeFire(entries, today)', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 4 as Score, [TODAY]: 2 as Score });
    await renderHook();

    expect(latest.fire).toEqual(
      computeFire({ [PAST]: 4 as Score, [TODAY]: 2 as Score }, TODAY),
    );
  });

  test('fire updates after setScore changes the calendar', async () => {
    await renderHook();
    const emptyFire = latest.fire;

    act(() => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 as Score }, TODAY));
    expect(latest.fire).not.toEqual(emptyFire);
  });
});

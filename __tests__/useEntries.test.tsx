/**
 * useEntries.test.tsx — hook tests for the score/fire state owner.
 *
 * A tiny probe component exposes the hook's return value through a ref-like
 * variable so tests can drive setScore/clearScore and read derived fire state.
 * The entries store is mocked so no real AsyncStorage or network is used, and
 * `today` is a fixed DateKey so results are deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries, Score } from '../src/domain/fire';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so every test is independent of the wall clock.
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook's latest return value so tests can read it.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return null;
}

// Render the probe inside act() so effects and state updates flush synchronously.
function renderHook(today: DateKey = TODAY) {
  act(() => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
}

// Let pending promise callbacks (loadEntries.then) run inside act.
async function flushLoad() {
  await act(async () => {
    await Promise.resolve();
  });
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

describe('useEntries loading', () => {
  test('ready is false before the load resolves and true after', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    renderHook();
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({ [PAST]: 3 } as Entries);
      await Promise.resolve();
    });

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({ [PAST]: 3 });
  });

  test('derives fire state from the loaded entries', async () => {
    mockedLoad.mockResolvedValueOnce({ [PAST]: 4 } as Entries);

    renderHook();
    await flushLoad();

    expect(latest.fire.strength).toBeGreaterThan(0);
  });

  test('does not set state when unmounted before the load resolves', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderHook();
    const snapshot = latest;
    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ [PAST]: 5 } as Entries);
      await Promise.resolve();
    });

    // The hook must not have written the loaded value after unmount.
    expect(latest).toBe(snapshot);
    expect(snapshot.ready).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('useEntries.setScore', () => {
  test('adds a valid score for a past day and persists it', async () => {
    renderHook();
    await flushLoad();

    act(() => {
      latest.setScore(PAST, 3 as Score);
    });

    expect(latest.entries[PAST]).toBe(3);
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 3 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValueOnce({ [PAST]: 2 } as Entries);
    renderHook();
    await flushLoad();

    act(() => {
      latest.setScore(PAST, 5 as Score);
    });

    expect(latest.entries[PAST]).toBe(5);
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 5 });
  });

  test('accepts today as a valid day', async () => {
    renderHook();
    await flushLoad();

    act(() => {
      latest.setScore(TODAY, 1 as Score);
    });

    expect(latest.entries[TODAY]).toBe(1);
  });

  test('ignores scores outside the 1-5 integer range', async () => {
    renderHook();
    await flushLoad();

    act(() => {
      latest.setScore(PAST, 0 as Score);
      latest.setScore(PAST, 6 as Score);
      latest.setScore(PAST, 2.5 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores scores for future dates', async () => {
    renderHook();
    await flushLoad();

    act(() => {
      latest.setScore(FUTURE, 4 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows storage failures so the UI state still updates', async () => {
    mockedSave.mockRejectedValueOnce(new Error('disk full'));
    renderHook();
    await flushLoad();

    expect(() => {
      act(() => {
        latest.setScore(PAST, 4 as Score);
      });
    }).not.toThrow();
    expect(latest.entries[PAST]).toBe(4);
  });
});

describe('useEntries.clearScore', () => {
  test('removes an existing score and persists the change', async () => {
    mockedLoad.mockResolvedValueOnce({ [PAST]: 3, [OLDER]: 2 } as Entries);
    renderHook();
    await flushLoad();

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 2 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [OLDER]: 2 });
  });

  test('returns the same state object when the date has no score', async () => {
    mockedLoad.mockResolvedValueOnce({ [OLDER]: 2 } as Entries);
    renderHook();
    await flushLoad();
    const before = latest.entries;

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries.fire', () => {
  test('recomputes when entries change', async () => {
    renderHook();
    await flushLoad();
    const emptyFire = latest.fire;

    act(() => {
      latest.setScore(PAST, 4 as Score);
    });
    expect(latest.fire).not.toBe(emptyFire);
    expect(latest.fire.strength).toBeGreaterThan(emptyFire.strength);

    act(() => {
      latest.clearScore(PAST);
    });
    expect(latest.fire.strength).toBe(emptyFire.strength);
  });
});

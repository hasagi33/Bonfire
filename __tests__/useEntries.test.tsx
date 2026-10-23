/**
 * useEntries.test.tsx — hook tests for score entries and derived fire state.
 *
 * The persistence layer is mocked so no AsyncStorage or network is touched.
 * A tiny probe component exposes hook state through a ref so tests can drive
 * score changes and inspect the results deterministically.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { isFuture, type DateKey } from '../src/domain/dates';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import { loadEntries, saveEntries } from '../src/data/entriesStore';

// Replace the real storage module with jest mocks. This keeps tests
// deterministic and guarantees AsyncStorage is never touched.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

// The latest hook result, updated by the probe on every render.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and copies its result into `latest`
// so tests can read and act on it.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and wait for pending effects (the initial load) to settle.
async function renderHook(today: DateKey = TODAY, initial: Entries = {}) {
  mockedLoad.mockResolvedValue(initial);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSave.mockResolvedValue(undefined);
  latest = undefined as unknown as UseEntries;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useEntries initial state', () => {
  test('starts with empty entries and not ready before load resolves', async () => {
    // Hold the load promise open so we can observe the pre-load state.
    let resolveLoad: (value: Entries) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.entries).toEqual({});
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({});
    });
    expect(latest.ready).toBe(true);
  });

  test('exposes loaded entries once the load resolves', async () => {
    await renderHook(TODAY, { [PAST]: 3 as Score });

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({ [PAST]: 3 });
  });

  test('derives fire state from the loaded entries', async () => {
    const loaded: Entries = { [PAST]: 4 as Score };
    await renderHook(TODAY, loaded);

    expect(latest.fire).toEqual(computeFire(loaded, TODAY));
  });
});

describe('useEntries setScore', () => {
  test('adds a valid score for a past day and saves the new map', async () => {
    await renderHook(TODAY, {});

    await act(async () => {
      latest.setScore(PAST, 5 as Score);
    });

    expect(latest.entries).toEqual({ [PAST]: 5 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 5 });
  });

  test('accepts a score for today', async () => {
    await renderHook(TODAY, {});

    await act(async () => {
      latest.setScore(TODAY, 2 as Score);
    });

    expect(latest.entries).toEqual({ [TODAY]: 2 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 2 });
  });

  test('replaces an existing score for the same day', async () => {
    await renderHook(TODAY, { [PAST]: 2 as Score });

    await act(async () => {
      latest.setScore(PAST, 4 as Score);
    });

    expect(latest.entries).toEqual({ [PAST]: 4 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 4 });
  });

  test('ignores a non-score value without saving', async () => {
    await renderHook(TODAY, {});

    await act(async () => {
      latest.setScore(PAST, 9 as unknown as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a fractional score without saving', async () => {
    await renderHook(TODAY, {});

    await act(async () => {
      latest.setScore(PAST, 2.5 as unknown as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook(TODAY, {});
    expect(isFuture(FUTURE, TODAY)).toBe(true);

    await act(async () => {
      latest.setScore(FUTURE, 3 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries clearScore', () => {
  test('removes an existing score and saves the reduced map', async () => {
    await renderHook(TODAY, { [PAST]: 3 as Score, [OLDER]: 4 as Score });

    await act(async () => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 4 });
    expect(mockedSave).toHaveBeenCalledWith({ [OLDER]: 4 });
  });

  test('on a missing date leaves state unchanged and does not save', async () => {
    const initial: Entries = { [PAST]: 3 as Score };
    await renderHook(TODAY, initial);
    const before = latest.entries;

    await act(async () => {
      latest.clearScore(OLDER);
    });

    expect(latest.entries).toBe(before);
    expect(latest.entries).toEqual(initial);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries fire derivation', () => {
  test('fire changes when entries change', async () => {
    await renderHook(TODAY, {});
    const emptyFire = latest.fire;

    await act(async () => {
      latest.setScore(PAST, 5 as Score);
    });

    expect(latest.fire).not.toEqual(emptyFire);
    expect(latest.fire).toEqual(computeFire({ [PAST]: 5 as Score }, TODAY));
  });

  test('fire recomputes after a score is cleared', async () => {
    await renderHook(TODAY, { [PAST]: 5 as Score });
    const litFire = latest.fire;

    await act(async () => {
      latest.clearScore(PAST);
    });

    expect(latest.fire).not.toEqual(litFire);
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

describe('useEntries unmount during load', () => {
  test('does not set state when unmounted before load resolves', async () => {
    let resolveLoad: (value: Entries) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ [PAST]: 3 as Score });
    });

    // No "state update on an unmounted component" warning should fire.
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// Keep the imported save/load mocks referenced for type checking.
void mockedLoad;
void mockedSave;

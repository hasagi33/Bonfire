/**
 * useEntries.test.tsx — hook tests for score entries and derived fire state.
 *
 * A tiny probe component renders the hook and exposes its latest return value
 * so tests can drive setScore/clearScore and check persistence, validation,
 * fire derivation, and unmount safety without any native UI or network.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, isScore, type Entries } from '../src/domain/fire';
import { isFuture, type DateKey } from '../src/domain/dates';

// Replace the storage module so tests never touch AsyncStorage or the network.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" keeps every test deterministic (no wall-clock reads).
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

let latest: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and stores its return value for assertions.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe inside act() so effects and pending state updates flush.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
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
  test('starts not ready and becomes ready with stored entries', async () => {
    const stored: Entries = { [PAST]: 4, [OLDER]: 2 };
    mockedLoad.mockResolvedValue(stored);

    // Before the load promise resolves, the hook reports not ready.
    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});

    // Let the load resolve, then the hook should expose the stored entries.
    await act(async () => {});
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(stored);
    expect(mockedLoad).toHaveBeenCalledTimes(1);

    act(() => {
      renderer.unmount();
    });
    rendered = null;
  });
});

describe('setScore', () => {
  test('adds a valid score for a past day and persists the next map', async () => {
    await renderHook();
    await act(async () => {});

    act(() => {
      latest.setScore(PAST, 3);
    });

    expect(latest.entries).toEqual({ [PAST]: 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 3 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 1 });
    await renderHook();
    await act(async () => {});

    act(() => {
      latest.setScore(PAST, 5);
    });

    expect(latest.entries).toEqual({ [PAST]: 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 5 });
  });

  test('accepts a score for today', async () => {
    await renderHook();
    await act(async () => {});

    act(() => {
      latest.setScore(TODAY, 2);
    });

    expect(latest.entries).toEqual({ [TODAY]: 2 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: 2 });
  });

  test('ignores scores outside the 1-5 integer range', async () => {
    await renderHook();
    await act(async () => {});
    const before = latest.entries;

    // Pick invalid values, confirming each one is rejected by isScore.
    const invalid = [0, 6, 2.5, -1] as unknown as Parameters<UseEntries['setScore']>[1][];
    for (const value of invalid) {
      expect(isScore(value)).toBe(false);
      act(() => {
        latest.setScore(PAST, value);
      });
    }

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores scores for future dates', async () => {
    await renderHook();
    await act(async () => {});
    const before = latest.entries;

    expect(isFuture(FUTURE, TODAY)).toBe(true);
    act(() => {
      latest.setScore(FUTURE, 4);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the reduced map', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 4, [OLDER]: 3 });
    await renderHook();
    await act(async () => {});

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenLastCalledWith({ [OLDER]: 3 });
  });

  test('is a no-op for a missing day: same reference, no save', async () => {
    mockedLoad.mockResolvedValue({ [OLDER]: 3 });
    await renderHook();
    await act(async () => {});
    const before = latest.entries;

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('fire equals computeFire over entries and updates when entries change', async () => {
    await renderHook();
    await act(async () => {});

    // Empty calendar: fire should match the engine's own result for no entries.
    expect(latest.fire).toEqual(computeFire({}, TODAY));

    act(() => {
      latest.setScore(PAST, 5);
    });
    expect(latest.fire).toEqual(computeFire({ [PAST]: 5 }, TODAY));

    act(() => {
      latest.clearScore(PAST);
    });
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

describe('unmount safety', () => {
  test('does not update state when the load resolves after unmount', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    let renderer!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      renderer = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    act(() => {
      renderer.unmount();
    });

    // Resolve after unmount; the active guard should prevent any state update.
    await act(async () => {
      resolveLoad({ [PAST]: 2 });
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

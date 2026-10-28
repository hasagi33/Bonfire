/**
 * useEntries.test.tsx — hook tests for the entries state and fire derivation.
 *
 * The persistence layer (entriesStore) is mocked so AsyncStorage is never touched
 * directly and the tests stay deterministic. A tiny probe component exposes the
 * hook's return value through a mutable variable so tests can drive setScore/clearScore
 * and inspect state without any native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries, Score } from '../src/domain/fire';

// Replace the real storage module with jest mock functions.
// The mock path must match the module path imported by the hook (relative to
// src/hooks/useEntries.ts, which resolves to src/data/entriesStore).
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so every date comparison is deterministic.
const TODAY = '2026-06-10' as DateKey;

// Holds the most recent hook result so tests can call its methods.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and stashes its return value.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and flush pending effects/promises so `ready` is settled.
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
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useEntries — initial load', () => {
  test('loads saved entries and sets ready to true', async () => {
    const saved: Entries = { '2026-06-08': 3, '2026-06-09': 5 } as Entries;
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts with empty entries and ready=false before load resolves', async () => {
    // Never-resolving load keeps the hook in its pre-load state.
    mockedLoad.mockReturnValue(new Promise(() => {}));

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });
});

describe('useEntries — setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i and persists it', async score => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, score as Score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': score });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': score });
  });

  test('accepts today as a valid date', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 4 as Score);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 4 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 } as Entries);
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5 as Score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'rejects invalid score %p without saving or changing state',
    async score => {
      await renderHook();

      act(() => {
        latest.setScore('2026-06-09' as DateKey, score as Score);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('rejects a future date without saving or changing state', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 3 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries — clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 5 } as Entries);
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op for an absent day and does not save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 } as Entries);
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries — derived fire', () => {
  test('fire is defined for no entries', async () => {
    await renderHook();

    expect(latest.entries).toEqual({});
    expect(latest.fire).toBeDefined();
  });

  test('fire recomputes when entries change', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(latest.fire).not.toBe(before);
  });

  test('fire keeps the same reference when entries are unchanged', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 4 } as Entries);
    await renderHook();
    const first = latest.fire;

    // Re-render with the same today; memoized fire should not change identity.
    await act(async () => {
      rendered?.update(<Probe today={TODAY} />);
    });

    expect(latest.fire).toBe(first);
  });
});

describe('useEntries — round-trip persistence', () => {
  test('saved data deep-equals the entries held in state', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-08' as DateKey, 2 as Score);
      latest.setScore('2026-06-09' as DateKey, 4 as Score);
    });

    const savedArg = mockedSave.mock.calls.at(-1)?.[0];
    expect(savedArg).toEqual(latest.entries);
  });

  test('reloading previously saved data yields deep-equal entries', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-07' as DateKey, 1 as Score);
      latest.setScore('2026-06-08' as DateKey, 3 as Score);
    });

    const persisted = mockedSave.mock.calls.at(-1)![0];

    // Simulate a fresh app launch that reads back what was written.
    jest.clearAllMocks();
    mockedLoad.mockResolvedValue(persisted);
    act(() => {
      rendered?.unmount();
    });
    rendered = null;
    await renderHook();

    expect(latest.entries).toEqual(persisted);
  });
});

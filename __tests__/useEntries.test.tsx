/**
 * useEntries.test.tsx — hook tests for the score/entries state machine.
 *
 * The data layer (entriesStore) is mocked so no AsyncStorage is touched.
 * A tiny probe component exposes hook state through a mutable holder so tests
 * can drive loading, score changes, clearing, and derived fire state without
 * native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module with jest mocks so no real persistence happens.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" keeps every test deterministic (no wall-clock reliance).
const TODAY: DateKey = '2026-06-10';

// Holder that the probe writes to on every render, so tests can read the latest hook value.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe({ today }: { today: DateKey }) {
  const value = useEntries(today);
  // Record the most recent hook value for assertions.
  latest = value;
  return <Text>{value.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe inside act() and let pending effects (the initial load) settle.
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

describe('useEntries initial load', () => {
  test('starts not ready and becomes ready once entries load', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({ '2026-06-09': 3 });
    });
    expect(latest.ready).toBe(true);
  });

  test('populates entries from the stored data', async () => {
    const stored: Entries = { '2026-06-08': 4, '2026-06-09': 5 };
    mockedLoad.mockResolvedValueOnce(stored);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.entries).toEqual(stored);
    expect(latest.ready).toBe(true);
  });

  test('starts with empty entries when storage is empty', async () => {
    await renderHook();

    expect(latest.entries).toEqual({});
    expect(latest.ready).toBe(true);
  });
});

describe('setScore', () => {
  test('adds a valid score for a past day and persists the new map', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 3);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('accepts a score for today', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 4);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 4 });
  });

  test('ignores scores outside the 1-5 integer range', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 0 as never);
      latest.setScore('2026-06-09', 6 as never);
      latest.setScore('2026-06-09', 2.5 as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores scores for future dates', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11', 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('tolerates a failing save without breaking state', async () => {
    mockedSave.mockRejectedValueOnce(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 1);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 1 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the reduced map', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-08': 4, '2026-06-09': 3 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op for a missing day and does not save', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-08': 4 });
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('fire matches computeFire over the current entries and today', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-08': 3, '2026-06-09': 5 });
    await renderHook();

    expect(latest.fire).toEqual(computeFire(latest.entries, TODAY));
  });

  test('fire updates after a score is added', async () => {
    await renderHook();
    const emptyFire = latest.fire;

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.fire).not.toBe(emptyFire);
    expect(latest.fire).toEqual(computeFire({ '2026-06-09': 5 }, TODAY));
  });
});

/**
 * useEntries.test.tsx — hook tests for the score/fire state owner.
 *
 * A tiny probe component exposes hook state through a module-level variable so
 * tests can drive loading, score changes, and clears without native UI.
 * The entries store is mocked so AsyncStorage is never touched directly.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries } from '../src/domain/fire';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY: DateKey = '2026-06-10';

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result in a module variable so tests can read
// the latest state and call its functions directly.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  // Flush the resolved loadEntries promise so `ready` flips to true.
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

describe('useEntries', () => {
  test('initial load sets ready=true and entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready while loading is pending', async () => {
    // Never-resolving load keeps the hook in its loading state.
    mockedLoad.mockReturnValue(new Promise(() => {}));

    await renderHook();

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });

  test('setScore accepts valid scores 1..5 for a past date and persists', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 4);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 4 });
  });

  test('setScore accepts a score for today', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 1);
    });

    expect(latest.entries).toEqual({ [TODAY]: 1 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: 1 });
  });

  test('setScore accepts every valid score from 1 to 5', async () => {
    await renderHook();

    for (const score of [1, 2, 3, 4, 5] as const) {
      await act(async () => {
        latest.setScore('2026-06-01', score);
      });
      expect(latest.entries['2026-06-01']).toBe(score);
    }
  });

  test('setScore ignores out-of-range and non-integer scores without saving', async () => {
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.setScore('2026-06-09', 0 as never);
      latest.setScore('2026-06-09', 6 as never);
      latest.setScore('2026-06-09', 2.5 as never);
      latest.setScore('2026-06-09', NaN as never);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('setScore ignores future dates without calling saveEntries', async () => {
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.setScore('2026-06-11', 5);
    });

    expect(latest.entries).toBe(before);
    expect(latest.entries).not.toHaveProperty('2026-06-11');
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('setScore replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test('clearScore removes an existing key and persists', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-08': 3 });
  });

  test('clearScore on a missing key is a no-op: same reference, no save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 });
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.clearScore('2026-06-05');
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('fire is derived from entries and today via computeFire', async () => {
    // Two consecutive scored days ending yesterday keep the fire lit.
    mockedLoad.mockResolvedValue({ '2026-06-08': 5, '2026-06-09': 5 });
    await renderHook();

    expect(latest.fire.strength).toBeGreaterThan(0);
    expect(latest.fire.state).not.toBe('out');
  });

  test('fire updates when a score is added', async () => {
    await renderHook();
    const strengthBefore = latest.fire.strength;

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(strengthBefore).toBe(0);
    expect(latest.fire.strength).toBeGreaterThan(0);
  });

  test('save failures are swallowed and do not break state updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 3);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
  });
});

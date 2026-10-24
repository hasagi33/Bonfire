/**
 * useEntries.test.tsx — hook tests for entry loading, score changes, and derived fire state.
 *
 * The entries store is mocked so no AsyncStorage is touched. A small probe component
 * exposes hook state through a ref so tests can drive setScore/clearScore and inspect
 * the results deterministically with a fixed `today` DateKey.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module with jest mocks so tests never touch AsyncStorage.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" keeps every test deterministic (no wall-clock dependence).
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

// The probe stores the latest hook result in this holder so tests can read it.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Minimal component that mounts the hook and publishes its return value.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and flush the pending loadEntries promise inside act().
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

describe('useEntries initial load', () => {
  test('starts not ready and then loads entries from storage', async () => {
    const stored: Entries = { [PAST]: 3 as Score };
    mockedLoad.mockResolvedValue(stored);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(stored);
  });

  test('derives fire state from the loaded entries', async () => {
    const stored: Entries = { [PAST]: 5 as Score };
    mockedLoad.mockResolvedValue(stored);

    await renderHook();

    expect(latest.fire).toEqual(computeFire(stored, TODAY));
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i for today and persists it', async score => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, score as Score);
    });

    expect(latest.entries).toEqual({ [TODAY]: score });
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: score });
  });

  test('accepts a score for a past date and persists deep-equal data', async () => {
    mockedLoad.mockResolvedValue({ [OLDER]: 2 as Score });
    await renderHook();

    await act(async () => {
      latest.setScore(PAST, 4 as Score);
    });

    const saved = mockedSave.mock.calls[mockedSave.mock.calls.length - 1][0];
    expect(saved).toEqual({ [OLDER]: 2, [PAST]: 4 });
    expect(latest.entries).toEqual(saved);
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 1 as Score });
    await renderHook();

    await act(async () => {
      latest.setScore(PAST, 5 as Score);
    });

    expect(latest.entries).toEqual({ [PAST]: 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p without saving', async bad => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, bad as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(FUTURE, 3 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 as Score, [OLDER]: 4 as Score });
    await renderHook();

    await act(async () => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 4 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [OLDER]: 4 });
  });

  test('is a no-op for a missing day and does not save', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 as Score });
    await renderHook();

    await act(async () => {
      latest.clearScore(OLDER);
    });

    expect(latest.entries).toEqual({ [PAST]: 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('recomputes fire when entries change', async () => {
    await renderHook();
    const emptyFire = latest.fire;

    await act(async () => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(latest.fire).not.toEqual(emptyFire);
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 as Score }, TODAY));
  });

  test('recomputes fire when clearing a score', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 5 as Score });
    await renderHook();
    const litFire = latest.fire;

    await act(async () => {
      latest.clearScore(TODAY);
    });

    expect(latest.fire).not.toEqual(litFire);
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

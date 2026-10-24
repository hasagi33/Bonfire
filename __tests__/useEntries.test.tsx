/**
 * useEntries.test.tsx — hook tests for entry state, score rules, and derived fire.
 *
 * The persistence layer (entriesStore) is mocked so AsyncStorage is never touched.
 * A tiny probe component exposes the hook's return value through a mutable
 * reference so tests can drive setScore/clearScore and inspect state without
 * native UI. Today is fixed so the results are deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module with jest mocks; the real AsyncStorage is never used.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so every date comparison is deterministic.
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the latest hook result so tests can call its actions.
function Probe() {
  const value = useEntries(TODAY);
  React.useEffect(() => {
    latest = value;
  });
  return <Text>{value.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and flush the pending loadEntries promise.
async function renderHook() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
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
  test('starts not ready and becomes ready with loaded entries', async () => {
    const saved: Entries = { [PAST]: 4 as Score, [OLDER]: 2 as Score };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('empty storage yields ready with no entries and an unlit fire', async () => {
    await renderHook();

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5] as Score[])(
    'accepts valid score %i for today and persists deep-equal data',
    async score => {
      await renderHook();

      act(() => {
        latest.setScore(TODAY, score);
      });

      expect(latest.entries).toEqual({ [TODAY]: score });
      expect(mockedSave).toHaveBeenCalledTimes(1);
      expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: score });
    },
  );

  test('accepts a score for a past date', async () => {
    await renderHook();

    act(() => {
      latest.setScore(PAST, 3 as Score);
    });

    expect(latest.entries).toEqual({ [PAST]: 3 });
    expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 3 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 2 as Score });
    await renderHook();

    act(() => {
      latest.setScore(PAST, 5 as Score);
    });

    expect(latest.entries).toEqual({ [PAST]: 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'ignores invalid score %p without saving',
    async bad => {
      await renderHook();

      act(() => {
        latest.setScore(PAST, bad as Score);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('ignores a future date without saving', async () => {
    await renderHook();

    act(() => {
      latest.setScore(FUTURE, 4 as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the remaining data', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 4 as Score, [OLDER]: 3 as Score });
    await renderHook();

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 3 });
    expect(mockedSave).toHaveBeenCalledWith({ [OLDER]: 3 });
  });

  test('is a no-op for an absent date and does not save', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 4 as Score });
    await renderHook();

    act(() => {
      latest.clearScore(OLDER);
    });

    expect(latest.entries).toEqual({ [PAST]: 4 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('fire matches computeFire over the current entries and today', async () => {
    mockedLoad.mockResolvedValue({ [OLDER]: 4 as Score, [PAST]: 5 as Score });
    await renderHook();

    expect(latest.fire).toEqual(
      computeFire({ [OLDER]: 4 as Score, [PAST]: 5 as Score }, TODAY),
    );
  });

  test('fire updates after a score is added', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore(PAST, 5 as Score);
    });

    expect(latest.fire).toEqual(computeFire({ [PAST]: 5 as Score }, TODAY));
    expect(latest.fire).not.toEqual(before);
  });

  test('fire is memoized and stable while entries and today are unchanged', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 as Score });
    await renderHook();
    const first = latest.fire;

    // Re-render without changing inputs; the memoized fire object must be reused.
    await act(async () => {
      rendered?.update(<Probe />);
    });

    expect(latest.fire).toBe(first);
  });
});

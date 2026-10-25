/**
 * useEntries.test.tsx — hook tests for score persistence and derived fire state.
 *
 * A tiny probe component exposes hook state through module-level variables so
 * tests can drive setScore/clearScore and inspect results. The entries store is
 * mocked so no real AsyncStorage is touched and every run is deterministic.
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

// Fixed "today" so date comparisons are deterministic.
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: copies the hook result into `latest` so tests can call it.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Renders the probe and waits for the initial load effect to settle.
async function renderHookAt(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  mockedSave.mockResolvedValue(undefined);
  mockedLoad.mockResolvedValue({});
  latest = undefined as unknown as UseEntries;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('initial load', () => {
  test('starts not ready and becomes ready with loaded entries', async () => {
    const saved: Entries = { [PAST]: 4 };
    mockedLoad.mockResolvedValue(saved);

    await renderHookAt();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('derives fire state from loaded entries', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 });

    await renderHookAt();

    expect(latest.fire).toEqual(computeExpectedFire({ [PAST]: 3 }));
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i on a past day and saves full map', async score => {
    mockedLoad.mockResolvedValue({ [OLDER]: 2 });
    await renderHookAt();

    await act(async () => {
      latest.setScore(PAST, score as 1 | 2 | 3 | 4 | 5);
    });

    const expected = { [OLDER]: 2, [PAST]: score };
    expect(latest.entries).toEqual(expected);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith(expected);
  });

  test('accepts a score for today', async () => {
    await renderHookAt();

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 2 });
    await renderHookAt();

    await act(async () => {
      latest.setScore(PAST, 4);
    });

    expect(latest.entries).toEqual({ [PAST]: 4 });
    expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 4 });
  });

  test.each([0, 6, -1, 2.5, Number.NaN, '3' as unknown as number])(
    'ignores invalid score %p without saving',
    async badScore => {
      await renderHookAt();
      const before = latest.entries;

      await act(async () => {
        latest.setScore(PAST, badScore as never);
      });

      expect(latest.entries).toBe(before);
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('ignores a score for a future date without saving', async () => {
    await renderHookAt();
    const before = latest.entries;

    await act(async () => {
      latest.setScore(FUTURE, 3);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows save failures so state still updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHookAt();

    await act(async () => {
      latest.setScore(PAST, 3);
    });

    expect(latest.entries).toEqual({ [PAST]: 3 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and saves the remaining map', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 4, [OLDER]: 2 });
    await renderHookAt();

    await act(async () => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 2 });
    expect(mockedSave).toHaveBeenCalledWith({ [OLDER]: 2 });
  });

  test('is a no-op for an absent date: same reference, no save', async () => {
    mockedLoad.mockResolvedValue({ [OLDER]: 2 });
    await renderHookAt();
    const before = latest.entries;

    await act(async () => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('recomputes when an entry is added', async () => {
    await renderHookAt();
    const emptyFire = latest.fire;

    await act(async () => {
      latest.setScore(PAST, 5);
    });

    expect(latest.fire).not.toBe(emptyFire);
    expect(latest.fire).toEqual(computeExpectedFire({ [PAST]: 5 }));
  });

  test('keeps the same fire reference when entries are unchanged on re-render', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 });
    await renderHookAt();
    const firstFire = latest.fire;

    // Re-render with the same `today`; entries reference is stable, so the memo holds.
    await act(async () => {
      rendered?.update(<Probe today={TODAY} />);
    });

    expect(latest.fire).toBe(firstFire);
  });

  test('recomputes when today changes', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 });
    await renderHookAt(TODAY);
    const firstFire = latest.fire;

    await act(async () => {
      rendered?.update(<Probe today={FUTURE} />);
    });

    expect(latest.fire).not.toBe(firstFire);
  });
});

/**
 * Builds the expected fire by delegating to the real engine. Kept as a helper
 * so the assertion stays focused on the hook's wiring, not on fire math.
 */
function computeExpectedFire(entries: Entries) {
  // Imported lazily to keep the top-level import list to the production hook's dependencies.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { computeFire } = require('../src/domain/fire') as typeof import('../src/domain/fire');
  return computeFire(entries, TODAY);
}

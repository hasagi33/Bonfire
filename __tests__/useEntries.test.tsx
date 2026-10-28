/**
 * useEntries.test.tsx — hook tests for the score/entries state layer.
 *
 * A tiny probe component exposes hook state through a ref so tests can drive
 * setScore/clearScore and inspect entries, fire, and readiness. The entries
 * store is mocked so AsyncStorage is never touched directly.
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

// Fixed "today" so date-based logic is deterministic.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the latest hook result so tests can read and act on it.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  // Flush the pending loadEntries promise so `ready` settles.
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

describe('initial load', () => {
  test('sets ready=true and entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready before the load resolves', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({});
    });
    expect(latest.ready).toBe(true);
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i for a past day', async score => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, score as 1 | 2 | 3 | 4 | 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': score });
  });

  test('accepts a score for today', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'rejects invalid score %p without state change or save',
    async invalid => {
      await renderHook();
      mockedSave.mockClear();

      act(() => {
        latest.setScore('2026-06-09' as DateKey, invalid as Parameters<UseEntries['setScore']>[1]);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('rejects a future date without state change or save', async () => {
    await renderHook();
    mockedSave.mockClear();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 5 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
  });

  test('is a no-op for a missing day and does not save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 });
    await renderHook();
    mockedSave.mockClear();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('persistence', () => {
  test('saves the updated map after setScore', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 3);
    });

    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('saves the updated map after clearScore', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 5 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('round-trip: saved payload deep-equals resulting entries', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-08' as DateKey, 2);
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    const lastSaved = mockedSave.mock.calls[mockedSave.mock.calls.length - 1][0];
    expect(lastSaved).toEqual(latest.entries);
    expect(lastSaved).toEqual({ '2026-06-08': 2, '2026-06-09': 5 });
  });

  test('a storage failure does not break state updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 4);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
  });
});

describe('fire derivation', () => {
  test('fire is derived from entries and today', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    // Fire must reflect the loaded entries; compare against a fresh derivation.
    const { computeFire } = jest.requireActual('../src/domain/fire');
    expect(latest.fire).toEqual(computeFire(latest.entries, TODAY));
  });

  test('fire updates when a score is added', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.fire).not.toEqual(before);
  });
});

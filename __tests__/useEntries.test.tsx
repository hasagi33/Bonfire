/**
 * useEntries.test.tsx — hook tests for score entries and derived fire state.
 *
 * The persistence layer (entriesStore) is mocked so AsyncStorage is never
 * touched directly. A tiny probe component exposes hook state through a
 * captured variable so tests can drive loads, score changes, and clears
 * without native UI. Today is pinned to a fixed DateKey for determinism.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so every fire and future-date check is deterministic.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the latest hook result in `latest` so tests can call
// its actions and inspect its state directly.
function Probe(props: { today: DateKey }) {
  const state = useEntries(props.today);
  latest = state;
  return <Text>{state.ready ? 'ready' : 'loading'}</Text>;
}

async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  // Flush the pending loadEntries promise so `ready` flips to true.
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
  test('starts not ready with empty entries before loading finishes', async () => {
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
    expect(latest.entries).toEqual({});

    await act(async () => {
      resolveLoad({ '2026-06-09': 4 });
    });

    expect(latest.ready).toBe(true);
  });

  test('sets ready to true and entries from loadEntries', async () => {
    const loaded: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
    mockedLoad.mockResolvedValueOnce(loaded);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(loaded);
  });

  test('derives fire from loaded entries and today', async () => {
    const loaded: Entries = { '2026-06-08': 2, '2026-06-09': 5 };
    mockedLoad.mockResolvedValueOnce(loaded);

    await renderHook();

    expect(latest.fire).toEqual(computeFire(loaded, TODAY));
  });
});

describe('useEntries setScore', () => {
  test('adds a valid score for today and persists the full next map', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 4 });
  });

  test('accepts a past day and replaces an existing score', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test('accepts the boundary scores 1 and 5', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-08', 1);
    });
    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 1, '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN, 100])(
    'rejects invalid score %p, leaving entries and storage untouched',
    async invalid => {
      await renderHook();

      await act(async () => {
        latest.setScore(TODAY, invalid as never);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('rejects a future date, leaving entries and storage untouched', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11', 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('persisted data round-trips to deep-equal entries', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-08', 3);
    });
    await act(async () => {
      latest.setScore('2026-06-09', 5);
    });

    const persisted = mockedSave.mock.calls[mockedSave.mock.calls.length - 1][0];
    expect(persisted).toEqual(latest.entries);
  });
});

describe('useEntries clearScore', () => {
  test('removes an existing day and persists the reduced map', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op for an absent day: same reference, no save', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-08': 3 });
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries fire derivation', () => {
  test('fire matches computeFire after a score is added', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 }, TODAY));
  });

  test('fire recomputes after a score is cleared', async () => {
    mockedLoad.mockResolvedValueOnce({ [TODAY]: 5 });
    await renderHook();

    await act(async () => {
      latest.clearScore(TODAY);
    });

    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

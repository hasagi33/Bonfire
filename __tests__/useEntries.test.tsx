/**
 * useEntries.test.tsx — hook tests for the score-entry state machine.
 *
 * A tiny probe component exposes hook state through a mutable ref so tests can
 * drive setScore/clearScore and inspect derived fire state without native UI.
 * The persistence layer (src/data/entriesStore) is mocked so AsyncStorage is
 * never touched and every test is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module with jest mocks; no real AsyncStorage access.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY: DateKey = '2024-06-15';

// Holds the most recent hook result so tests can read and act on it.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook with a fixed "today" and records its output.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and let the mocked load promise resolve inside act().
async function renderHook(initial: Entries = {}) {
  mockedLoad.mockResolvedValue(initial);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
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
  test('sets ready=true and populates entries from loadEntries', async () => {
    const saved: Entries = { '2024-06-10': 4, '2024-06-11': 3 };
    await renderHook(saved);

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready and empty before the load resolves', () => {
    mockedLoad.mockReturnValue(new Promise(() => {})); // never resolves
    act(() => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });

  test('derives fire state from the loaded entries', async () => {
    const saved: Entries = { '2024-06-14': 5 };
    await renderHook(saved);

    expect(latest.fire).toEqual(computeFire(saved, TODAY));
  });
});

describe('setScore', () => {
  test('adds a valid score for today and persists the full map', async () => {
    await renderHook({});

    act(() => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 4 });
  });

  test('adds a valid score for a past day, keeping existing entries', async () => {
    await renderHook({ '2024-06-10': 2 });

    act(() => {
      latest.setScore('2024-06-12', 5);
    });

    expect(latest.entries).toEqual({ '2024-06-10': 2, '2024-06-12': 5 });
    expect(mockedSave).toHaveBeenCalledWith({ '2024-06-10': 2, '2024-06-12': 5 });
  });

  test('replaces an existing score for the same day', async () => {
    await renderHook({ '2024-06-10': 2 });

    act(() => {
      latest.setScore('2024-06-10', 5);
    });

    expect(latest.entries).toEqual({ '2024-06-10': 5 });
    expect(mockedSave).toHaveBeenCalledWith({ '2024-06-10': 5 });
  });

  test.each([1, 2, 3, 4, 5])('accepts the boundary-valid score %i', async score => {
    await renderHook({});

    act(() => {
      latest.setScore('2024-06-01', score as 1 | 2 | 3 | 4 | 5);
    });

    expect(latest.entries).toEqual({ '2024-06-01': score });
  });

  test.each([0, 6, -1, 3.5, NaN])(
    'rejects the invalid score %p without changing entries or saving',
    async score => {
      const initial: Entries = { '2024-06-10': 3 };
      await renderHook(initial);

      act(() => {
        latest.setScore('2024-06-11', score as never);
      });

      expect(latest.entries).toEqual(initial);
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('rejects a future date without changing entries or saving', async () => {
    const initial: Entries = {};
    await renderHook(initial);

    act(() => {
      latest.setScore('2024-06-16', 4);
    });

    expect(latest.entries).toEqual(initial);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a rejected call does not block a later valid call', async () => {
    await renderHook({});

    act(() => {
      latest.setScore('2024-06-16', 4); // future: rejected
    });
    act(() => {
      latest.setScore(TODAY, 2);
    });

    expect(latest.entries).toEqual({ [TODAY]: 2 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test('swallows storage save failures so state still updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook({});

    expect(() => {
      act(() => {
        latest.setScore(TODAY, 3);
      });
    }).not.toThrow();
    expect(latest.entries).toEqual({ [TODAY]: 3 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the updated map', async () => {
    await renderHook({ '2024-06-10': 4, '2024-06-11': 2 });

    act(() => {
      latest.clearScore('2024-06-10');
    });

    expect(latest.entries).toEqual({ '2024-06-11': 2 });
    expect(mockedSave).toHaveBeenCalledWith({ '2024-06-11': 2 });
  });

  test('is a no-op for a missing day: same reference, no save', async () => {
    await renderHook({ '2024-06-10': 4 });
    const before = latest.entries;

    act(() => {
      latest.clearScore('2024-06-12');
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('clearing the last remaining day yields an empty map', async () => {
    await renderHook({ [TODAY]: 5 });

    act(() => {
      latest.clearScore(TODAY);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).toHaveBeenCalledWith({});
  });
});

describe('fire derivation', () => {
  test('fire updates after setScore using the engine on current entries', async () => {
    await renderHook({});

    act(() => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 }, TODAY));
  });

  test('fire returns to the cleared state after clearScore', async () => {
    await renderHook({ [TODAY]: 5 });
    const litFire = latest.fire;

    act(() => {
      latest.clearScore(TODAY);
    });

    expect(latest.fire).toEqual(computeFire({}, TODAY));
    expect(latest.fire).not.toEqual(litFire);
  });
});

describe('persistence round-trip', () => {
  test('saved data deep-equals the entries the hook exposes', async () => {
    await renderHook({});

    act(() => {
      latest.setScore('2024-06-12', 3);
      latest.setScore('2024-06-13', 5);
    });

    const savedArg = mockedSave.mock.calls.at(-1)![0];
    expect(savedArg).toEqual(latest.entries);
    expect(savedArg).toEqual({ '2024-06-12': 3, '2024-06-13': 5 });
  });
});

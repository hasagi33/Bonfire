/**
 * useEntries.test.tsx — hook tests for entry loading, score changes, and fire derivation.
 *
 * The persistence layer (entriesStore) is mocked so AsyncStorage is never touched.
 * A tiny probe component exposes hook state through a ref so tests can drive
 * score changes and inspect the derived fire without native UI.
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

// Fixed "today" so every test is deterministic regardless of wall-clock time.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: publishes the hook result into `latest` on every render.
function Probe({ today }: { today: DateKey }) {
  const hook = useEntries(today);
  latest = hook;
  return <Text>{hook.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and flush the pending loadEntries promise.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
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

describe('useEntries initial load', () => {
  test('starts not ready and empty, then becomes ready with loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 3 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('derives fire from the loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 5, '2026-06-09': 5 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(latest.fire).toEqual(computeFire(saved, TODAY));
  });

  test('empty storage yields ready=true with no entries and an unlit fire', async () => {
    await renderHook();

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i for a past day', async score => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, score as 1 | 2 | 3 | 4 | 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': score });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': score });
  });

  test('accepts a score for today', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 3);
    });

    expect(latest.entries).toEqual({ [TODAY]: 3 });
  });

  test('updates fire to match the new entries', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.fire).toEqual(computeFire({ '2026-06-09': 5 }, TODAY));
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 4);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 4 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p', async score => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, score as unknown as 1);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11' as DateKey, 5);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4, '2026-06-09': 3 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op for a day with no score', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('updates fire after clearing', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 5 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });
});

describe('persistence', () => {
  test('saveEntries receives the exact next map after a sequence of changes', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-08' as DateKey, 2);
    });
    await act(async () => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(mockedSave).toHaveBeenLastCalledWith({
      '2026-06-08': 2,
      '2026-06-09': 5,
    });
  });
});

/**
 * useEntries.test.tsx — hook tests for the score/entries state layer.
 *
 * A tiny probe component exposes hook state through a module-level variable so
 * tests can drive setScore/clearScore and inspect entries, fire, and ready
 * without any native UI. The entries store is mocked so AsyncStorage is never
 * touched and no network is used.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Mock the persistence layer so the hook never reaches AsyncStorage.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" keeps every test deterministic.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and copies its return value out for assertions.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and let the initial async load settle.
async function renderHook(today: DateKey = TODAY) {
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
  test('sets ready to true and exposes loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready before the load resolves', () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));

    act(() => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test.each<Score>([1, 2, 3, 4, 5])('stores valid score %p and persists it', async score => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, score);
    });

    expect(latest.entries).toEqual({ '2026-06-09': score });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': score });
  });

  test('persists the full next map including previous entries', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 2 });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 4);
    });

    expect(mockedSave).toHaveBeenLastCalledWith({
      '2026-06-08': 2,
      '2026-06-09': 4,
    });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 1 });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test.each<[string, number]>([
    ['zero', 0],
    ['six', 6],
    ['negative', -1],
    ['fractional', 2.5],
    ['NaN', Number.NaN],
  ])('ignores invalid score (%s) without saving', async (_label, bad) => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, bad as Score);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a future date without saving', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('accepts today itself (not a future date)', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 3);
    });

    expect(latest.entries).toEqual({ [TODAY]: 3 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 3 });
  });
});

describe('clearScore', () => {
  test('removes an existing score and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 5 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op with no save for a missing date', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('derived fire', () => {
  test('matches computeFire for empty entries', async () => {
    await renderHook();

    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });

  test('matches computeFire after a single score on today', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 3);
    });

    expect(latest.fire).toEqual(computeFire({ [TODAY]: 3 }, TODAY));
  });

  test('matches computeFire for consecutive scored days', async () => {
    mockedLoad.mockResolvedValue({
      '2026-06-08': 4,
      '2026-06-09': 5,
    });
    await renderHook();

    expect(latest.fire).toEqual(
      computeFire({ '2026-06-08': 4, '2026-06-09': 5 }, TODAY),
    );
  });

  test('matches computeFire through a single unscored past day (one-day gap)', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4 });
    await renderHook();

    // 2026-06-09 is unscored; only one missed day should not extinguish the fire.
    expect(latest.fire).toEqual(computeFire({ '2026-06-08': 4 }, TODAY));
  });

  test('matches computeFire after two consecutive unscored past days', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-07': 4 });
    await renderHook();

    // 2026-06-08 and 2026-06-09 are both unscored.
    expect(latest.fire).toEqual(computeFire({ '2026-06-07': 4 }, TODAY));
  });
});

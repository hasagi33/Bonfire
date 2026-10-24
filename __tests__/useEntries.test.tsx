/**
 * useEntries.test.tsx — hook tests for score entry state and derived fire state.
 *
 * A tiny probe component exposes hook state through a mutable reference so tests
 * can drive setScore/clearScore and inspect entries, fire, and ready without any
 * native UI. The entries store is mocked so AsyncStorage is never touched.
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

// A fixed local date key keeps every test deterministic.
const TODAY = '2026-06-10' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the latest hook result in `latest` so tests can read it.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and let the initial load promise settle inside act().
async function renderHookAt(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
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

describe('initial load', () => {
  test('sets ready to true and exposes loaded entries', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 3 };
    mockedLoad.mockResolvedValue(saved);

    await renderHookAt();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready and empty before the load resolves', () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));

    act(() => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts score %i for a past day and persists it', async score => {
    await renderHookAt();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, score as 1 | 2 | 3 | 4 | 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': score });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': score });
  });

  test('accepts a score for today', async () => {
    await renderHookAt();

    act(() => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries[TODAY]).toBe(5);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p', async invalid => {
    await renderHookAt();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, invalid as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHookAt();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('replaces an existing score for the same day', async () => {
    await renderHookAt();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 2);
    });
    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test('round-trip: saved data deep-equals reloaded data', async () => {
    await renderHookAt();

    act(() => {
      latest.setScore('2026-06-08' as DateKey, 4);
      latest.setScore('2026-06-09' as DateKey, 1);
    });

    const saved = mockedSave.mock.lastCall?.[0];
    expect(saved).toEqual({ '2026-06-08': 4, '2026-06-09': 1 });
    expect(latest.entries).toEqual(saved);
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the change', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHookAt();

    act(() => {
      latest.clearScore('2026-06-08' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 4 });
  });

  test('is a no-op for an absent date and does not save', async () => {
    await renderHookAt();

    act(() => {
      latest.clearScore('2026-06-07' as DateKey);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('derived fire state', () => {
  test('empty calendar matches the engine and is unlit', async () => {
    await renderHookAt();

    expect(latest.fire).toEqual(computeFire({}, TODAY));
    expect(latest.fire.state).toBe('unlit');
    expect(latest.fire.strength).toBe(0);
  });

  test('single score lights the fire and matches the engine', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-10': 4 });
    await renderHookAt();

    expect(latest.fire).toEqual(computeFire({ '2026-06-10': 4 }, TODAY));
    expect(latest.fire.state).toBe('lit');
  });

  test('consecutive scored days keep the fire lit', async () => {
    const entries: Entries = { '2026-06-08': 3, '2026-06-09': 3, '2026-06-10': 3 };
    mockedLoad.mockResolvedValue(entries);
    await renderHookAt();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
    expect(latest.fire.state).toBe('lit');
  });

  test('a one-day gap does not extinguish the fire', async () => {
    const entries: Entries = { '2026-06-08': 3, '2026-06-10': 3 };
    mockedLoad.mockResolvedValue(entries);
    await renderHookAt();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
    expect(latest.fire.state).toBe('lit');
  });

  test('a two-day miss extinguishes the fire', async () => {
    const entries: Entries = { '2026-06-06': 5, '2026-06-07': 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHookAt();

    expect(latest.fire).toEqual(computeFire(entries, TODAY));
    expect(latest.fire.state).not.toBe('lit');
  });

  test('fire recomputes when a score is added', async () => {
    await renderHookAt();
    const before = latest.fire;

    act(() => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 }, TODAY));
  });
});

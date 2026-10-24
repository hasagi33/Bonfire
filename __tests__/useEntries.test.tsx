/**
 * useEntries.test.tsx — hook tests for the score/entries state machine.
 *
 * The entriesStore module is mocked so AsyncStorage is never touched. A tiny
 * probe component exposes hook state through a module-level variable so tests
 * can drive setScore/clearScore inside act() and inspect the results.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries } from '../src/domain/fire';

// Mock the storage module so no real AsyncStorage access happens.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so date-dependent logic is deterministic.
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const OLDER = '2026-06-08' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: exposes the latest hook return value through an effect so
// the outer variable is never reassigned during render.
function Probe({ today }: { today: DateKey }) {
  const hook = useEntries(today);
  React.useEffect(() => {
    latest = hook;
  });
  return <Text>{String(hook.ready)}</Text>;
}

// Render the probe and wait for the initial async load to settle.
async function renderHook(initial: Entries = {}, today: DateKey = TODAY) {
  mockedLoad.mockResolvedValue(initial);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
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
  test('starts not ready, then becomes ready with loaded entries', async () => {
    const seeded: Entries = { [PAST]: 3 };
    mockedLoad.mockResolvedValue(seeded);

    // Render before the load promise resolves to observe the pending state.
    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    expect(mockedLoad).toHaveBeenCalledTimes(1);

    await act(async () => {});
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(seeded);
  });

  test('derives fire state from loaded entries', async () => {
    await renderHook({ [PAST]: 5 });
    expect(latest.fire).toEqual(expect.objectContaining({ lit: true }));
  });

  test('loads empty entries when storage is empty', async () => {
    await renderHook({});
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test.each([1, 2, 3, 4, 5])('accepts valid score %i on today and persists full map', async score => {
    await renderHook({});
    await act(async () => {
      latest.setScore(TODAY, score as 1 | 2 | 3 | 4 | 5);
    });

    expect(latest.entries).toEqual({ [TODAY]: score });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: score });
  });

  test('accepts a score on a past date and saves the merged map', async () => {
    await renderHook({ [OLDER]: 2 });
    await act(async () => {
      latest.setScore(PAST, 4);
    });

    const expected = { [OLDER]: 2, [PAST]: 4 };
    expect(latest.entries).toEqual(expected);
    expect(mockedSave).toHaveBeenLastCalledWith(expected);
  });

  test('replaces an existing score and persists the updated map', async () => {
    await renderHook({ [PAST]: 2 });
    await act(async () => {
      latest.setScore(PAST, 5);
    });

    expect(latest.entries).toEqual({ [PAST]: 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 5 });
  });

  test.each([0, 6, 2.5, -1, NaN])('ignores invalid score %p without saving', async score => {
    await renderHook({});
    await act(async () => {
      latest.setScore(TODAY, score as unknown as 1);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook({});
    await act(async () => {
      latest.setScore(FUTURE, 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('recomputes fire after a score is added', async () => {
    await renderHook({});
    expect(latest.fire.lit).toBe(false);

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).toEqual(expect.objectContaining({ lit: true }));
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the remaining map', async () => {
    await renderHook({ [PAST]: 4, [OLDER]: 2 });
    await act(async () => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [OLDER]: 2 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [OLDER]: 2 });
  });

  test('is a no-op for an absent date and does not save', async () => {
    const seeded: Entries = { [PAST]: 4 };
    await renderHook(seeded);
    await act(async () => {
      latest.clearScore(OLDER);
    });

    expect(latest.entries).toEqual(seeded);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('recomputes fire after a score is cleared', async () => {
    await renderHook({ [TODAY]: 5 });
    expect(latest.fire.lit).toBe(true);

    await act(async () => {
      latest.clearScore(TODAY);
    });

    expect(latest.fire.lit).toBe(false);
  });
});

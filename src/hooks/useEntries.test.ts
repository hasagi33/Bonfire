/**
 * useEntries.test.ts — tests for the useEntries hook.
 *
 * Storage is mocked so no AsyncStorage is touched and nothing hits the network.
 * `today` is a fixed ISO DateKey; Date.now() is never used.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addDays } from '../domain/dates';
import { computeFire, type Entries } from '../domain/fire';
import { loadEntries, saveEntries } from '../data/entriesStore';
import { useEntries } from './useEntries';

jest.mock('../data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY = '2026-06-15';
const day = (offset: number) => addDays(TODAY, offset);

const fixture: Entries = {
  [day(-2)]: 3,
  [day(-1)]: 4,
};

async function renderLoaded(initial: Entries = fixture) {
  mockLoad.mockResolvedValue(initial);
  const hook = renderHook(() => useEntries(TODAY));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
});

describe('useEntries — initial load', () => {
  test('starts not ready and empty, then populates entries when load resolves', async () => {
    mockLoad.mockResolvedValue(fixture);
    const { result } = renderHook(() => useEntries(TODAY));

    expect(result.current.ready).toBe(false);
    expect(result.current.entries).toEqual({});

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.entries).toEqual(fixture);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  test('derives fire from loaded entries', async () => {
    const { result } = await renderLoaded();
    expect(result.current.fire).toEqual(computeFire(fixture, TODAY));
  });

  test('does not save during the initial load', async () => {
    await renderLoaded();
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('useEntries — setScore', () => {
  test('adds a valid score on a past day and persists it', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setScore(day(-5), 5));

    expect(result.current.entries[day(-5)]).toBe(5);
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith({ ...fixture, [day(-5)]: 5 });
  });

  test('accepts a score for today', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setScore(TODAY, 2));

    expect(result.current.entries[TODAY]).toBe(2);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test('replaces an existing score for the same day', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.setScore(day(-1), 1));

    expect(result.current.entries[day(-1)]).toBe(1);
    expect(mockSave).toHaveBeenCalledWith({ ...fixture, [day(-1)]: 1 });
  });

  test.each([0, 6, -1, 2.5, NaN, Infinity])(
    'rejects invalid score %p without changing state or saving',
    async bad => {
      const { result } = await renderLoaded();
      const before = result.current.entries;

      act(() => result.current.setScore(day(-5), bad as never));

      expect(result.current.entries).toBe(before);
      expect(mockSave).not.toHaveBeenCalled();
    },
  );

  test('rejects a future date without changing state or saving', async () => {
    const { result } = await renderLoaded();
    const before = result.current.entries;

    act(() => result.current.setScore(day(1), 5));

    expect(result.current.entries).toBe(before);
    expect(mockSave).not.toHaveBeenCalled();
  });

  test('recomputes fire when a score is added', async () => {
    const { result } = await renderLoaded();
    const before = result.current.fire;

    act(() => result.current.setScore(TODAY, 5));

    expect(result.current.fire).not.toEqual(before);
    expect(result.current.fire).toEqual(
      computeFire({ ...fixture, [TODAY]: 5 }, TODAY),
    );
  });
});

describe('useEntries — clearScore', () => {
  test('removes an existing score and persists the result', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.clearScore(day(-2)));

    expect(result.current.entries).not.toHaveProperty(day(-2));
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledWith({ [day(-1)]: 4 });
  });

  test('is a no-op for a missing date: same reference, no save', async () => {
    const { result } = await renderLoaded();
    const before = result.current.entries;

    act(() => result.current.clearScore(day(-10)));

    expect(result.current.entries).toBe(before);
    expect(mockSave).not.toHaveBeenCalled();
  });

  test('recomputes fire after clearing a score', async () => {
    const { result } = await renderLoaded();

    act(() => result.current.clearScore(day(-1)));

    expect(result.current.fire).toEqual(
      computeFire({ [day(-2)]: 3 }, TODAY),
    );
  });
});

describe('useEntries — fire derivation', () => {
  test('fire is unlit when there are no entries', async () => {
    const { result } = await renderLoaded({});
    expect(result.current.fire.state).toBe('unlit');
    expect(result.current.fire.strength).toBe(0);
  });

  test('fire goes out after two consecutive missed past days', async () => {
    const { result } = await renderLoaded({ [day(-3)]: 5 });
    expect(result.current.fire.state).toBe('out');
  });

  test('back-filling a missed day relights the fire', async () => {
    const { result } = await renderLoaded({ [day(-3)]: 5 });
    expect(result.current.fire.state).toBe('out');

    act(() => result.current.setScore(day(-2), 3));

    expect(result.current.fire.state).toBe('lit');
    expect(result.current.fire.strength).toBe(
      computeFire({ [day(-3)]: 5, [day(-2)]: 3 }, TODAY).strength,
    );
  });
});

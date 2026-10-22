/**
 * useEntries.test.ts — unit tests for the useEntries hook.
 *
 * The hook is the seam between storage and the fire engine. These tests mock
 * the storage layer so nothing touches AsyncStorage or the network, and pass a
 * fixed ISO local date key as `today` so results never depend on the wall clock.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addDays, type DateKey } from '../domain/dates';
import { computeFire, type Entries, type Score } from '../domain/fire';
import { loadEntries, saveEntries } from '../data/entriesStore';
import { useEntries } from './useEntries';

// Replace the storage module so no AsyncStorage calls happen during tests.
jest.mock('../data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so every test is deterministic.
const TODAY: DateKey = '2026-06-15';
const day = (offset: number): DateKey => addDays(TODAY, offset);

// Render the hook and wait until the initial load has finished.
async function renderLoaded(initial: Entries = {}) {
  mockedLoad.mockResolvedValue(initial);
  const hook = renderHook(() => useEntries(TODAY));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSave.mockResolvedValue(undefined);
});

describe('useEntries — initial load', () => {
  test('starts not ready, then populates entries and sets ready=true', async () => {
    const stored: Entries = { [day(-1)]: 4, [TODAY]: 5 };
    mockedLoad.mockResolvedValue(stored);

    const { result } = renderHook(() => useEntries(TODAY));
    expect(result.current.ready).toBe(false);

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.entries).toEqual(stored);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  test('derives fire state from the loaded entries', async () => {
    const stored: Entries = { [TODAY]: 5 };
    const { result } = await renderLoaded(stored);
    expect(result.current.fire).toEqual(computeFire(stored, TODAY));
  });
});

describe('useEntries — setScore', () => {
  test('accepts a valid score on a past day and persists it', async () => {
    const { result } = await renderLoaded({});

    act(() => result.current.setScore(day(-1), 3 as Score));

    expect(result.current.entries).toEqual({ [day(-1)]: 3 });
    expect(mockedSave).toHaveBeenCalledWith({ [day(-1)]: 3 });
  });

  test('accepts a score for today', async () => {
    const { result } = await renderLoaded({});

    act(() => result.current.setScore(TODAY, 5 as Score));

    expect(result.current.entries[TODAY]).toBe(5);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test('replaces an existing score for the same day', async () => {
    const { result } = await renderLoaded({ [day(-1)]: 2 });

    act(() => result.current.setScore(day(-1), 4 as Score));

    expect(result.current.entries[day(-1)]).toBe(4);
    expect(mockedSave).toHaveBeenLastCalledWith({ [day(-1)]: 4 });
  });

  test('rejects a score below the 1..5 range', async () => {
    const initial: Entries = { [day(-1)]: 3 };
    const { result } = await renderLoaded(initial);

    act(() => result.current.setScore(day(-1), 0 as Score));

    expect(result.current.entries).toEqual(initial);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('rejects a score above the 1..5 range', async () => {
    const { result } = await renderLoaded({});

    act(() => result.current.setScore(TODAY, 6 as Score));

    expect(result.current.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('rejects a non-integer score', async () => {
    const { result } = await renderLoaded({});

    act(() => result.current.setScore(TODAY, 2.5 as Score));

    expect(result.current.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('rejects a score for a future date', async () => {
    const initial: Entries = { [TODAY]: 4 };
    const { result } = await renderLoaded(initial);

    act(() => result.current.setScore(day(1), 5 as Score));

    expect(result.current.entries).toEqual(initial);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries — clearScore', () => {
  test('removes an existing day and persists the change', async () => {
    const { result } = await renderLoaded({ [day(-1)]: 4, [TODAY]: 5 });

    act(() => result.current.clearScore(day(-1)));

    expect(result.current.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('is a no-op for a day with no score', async () => {
    const initial: Entries = { [TODAY]: 5 };
    const { result } = await renderLoaded(initial);

    act(() => result.current.clearScore(day(-1)));

    expect(result.current.entries).toEqual(initial);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries — derived fire', () => {
  test('recomputes fire when a score is added', async () => {
    const { result } = await renderLoaded({});
    expect(result.current.fire.state).toBe('unlit');

    act(() => result.current.setScore(TODAY, 5 as Score));

    expect(result.current.fire).toEqual(
      computeFire({ [TODAY]: 5 }, TODAY),
    );
    expect(result.current.fire.state).toBe('lit');
  });

  test('recomputes fire when a score is cleared', async () => {
    const { result } = await renderLoaded({ [TODAY]: 5 });
    expect(result.current.fire.state).toBe('lit');

    act(() => result.current.clearScore(TODAY));

    expect(result.current.fire.state).toBe('unlit');
    expect(result.current.fire.strength).toBe(0);
  });
});

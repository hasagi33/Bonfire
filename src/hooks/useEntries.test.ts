/**
 * useEntries.test.ts — unit tests for the useEntries hook.
 *
 * Verifies loading, score validation, persistence, clearing, and that the
 * derived fire state recomputes when entries change. The storage module is
 * mocked so no AsyncStorage is touched and the tests stay deterministic.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { addDays } from '../domain/dates';
import type { Entries } from '../domain/fire';
import { loadEntries, saveEntries } from '../data/entriesStore';
import { useEntries } from './useEntries';

// Replace the real storage module with jest mocks so no AsyncStorage is used.
jest.mock('../data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.Mock;
const mockedSave = saveEntries as jest.Mock;

// A fixed "today" so every test is independent of the real clock.
const TODAY = '2026-06-15';
const day = (offset: number) => addDays(TODAY, offset); // day(-1) = yesterday

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue({});
  mockedSave.mockResolvedValue(undefined);
});

describe('useEntries — loading', () => {
  test('sets entries and ready=true once loadEntries resolves', async () => {
    const saved: Entries = { [day(-1)]: 4 };
    mockedLoad.mockResolvedValue(saved);

    const { result } = renderHook(() => useEntries(TODAY));

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.entries).toEqual(saved);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  test('ready stays false while loadEntries is still pending', async () => {
    // A promise we resolve manually, so we can inspect the "loading" state.
    let resolveLoad: (value: Entries) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    const { result } = renderHook(() => useEntries(TODAY));
    expect(result.current.ready).toBe(false);

    await act(async () => {
      resolveLoad({});
    });
    expect(result.current.ready).toBe(true);
  });
});

describe('useEntries — setScore', () => {
  test('accepts a valid score on a past date and persists it', async () => {
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setScore(day(-1), 4);
    });

    expect(result.current.entries).toEqual({ [day(-1)]: 4 });
    expect(mockedSave).toHaveBeenCalledWith({ [day(-1)]: 4 });
  });

  test('accepts a valid score for today', async () => {
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setScore(TODAY, 2);
    });

    expect(result.current.entries[TODAY]).toBe(2);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'ignores invalid score %p without saving',
    async invalid => {
      const { result } = renderHook(() => useEntries(TODAY));
      await waitFor(() => expect(result.current.ready).toBe(true));

      act(() => {
        result.current.setScore(day(-1), invalid as never);
      });

      expect(result.current.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('ignores a future date without calling saveEntries', async () => {
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setScore(addDays(TODAY, 1), 5);
    });

    expect(result.current.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a storage failure does not throw or revert the in-memory state', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(() =>
      act(() => {
        result.current.setScore(day(-1), 3);
      }),
    ).not.toThrow();
    expect(result.current.entries[day(-1)]).toBe(3);
  });
});

describe('useEntries — clearScore', () => {
  test('removes an existing score and persists the change', async () => {
    mockedLoad.mockResolvedValue({ [day(-1)]: 5, [day(-2)]: 3 });
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.clearScore(day(-1));
    });

    expect(result.current.entries).toEqual({ [day(-2)]: 3 });
    expect(mockedSave).toHaveBeenCalledWith({ [day(-2)]: 3 });
  });

  test('clearing a missing date returns the same state and does not persist', async () => {
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const before = result.current.entries;
    act(() => {
      result.current.clearScore(day(-5));
    });

    expect(result.current.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries — derived fire', () => {
  test('fire is unlit before any scores exist', async () => {
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.fire.state).toBe('unlit');
    expect(result.current.fire.strength).toBe(0);
  });

  test('fire recomputes when setScore changes entries', async () => {
    const { result } = renderHook(() => useEntries(TODAY));
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setScore(day(-1), 5);
    });
    expect(result.current.fire.state).toBe('lit');
    expect(result.current.fire.strength).toBe(4);

    act(() => {
      result.current.setScore(TODAY, 3);
    });
    expect(result.current.fire.strength).toBe(4 + 2);
  });
});

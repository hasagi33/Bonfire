/**
 * useEntries.test.ts — tests for the useEntries hook.
 *
 * Storage is mocked so no AsyncStorage or network is touched. Dates are fixed
 * ISO local date keys, so the tests are fully deterministic.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEntries } from './useEntries';
import { loadEntries, saveEntries } from '../data/entriesStore';
import type { DateKey } from '../domain/dates';
import type { Entries, Score } from '../domain/fire';

jest.mock('../data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY = '2024-06-15' as DateKey;
const PAST = '2024-06-10' as DateKey;
const YESTERDAY = '2024-06-14' as DateKey;
const FUTURE = '2024-06-20' as DateKey;

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

describe('useEntries', () => {
  describe('initial load', () => {
    it('starts not ready and flips ready to true after load', async () => {
      mockedLoad.mockResolvedValue({ [PAST]: 3 as Score });
      const { result } = renderHook(() => useEntries(TODAY));

      expect(result.current.ready).toBe(false);
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.entries).toEqual({ [PAST]: 3 });
      expect(mockedLoad).toHaveBeenCalledTimes(1);
    });

    it('does not discard a score entered while loading is in progress', async () => {
      let resolveLoad: (value: Entries) => void = () => {};
      mockedLoad.mockReturnValue(
        new Promise<Entries>(resolve => {
          resolveLoad = resolve;
        }),
      );
      const { result } = renderHook(() => useEntries(TODAY));

      act(() => {
        result.current.setScore(TODAY, 4 as Score);
      });

      await act(async () => {
        resolveLoad({ [PAST]: 2 as Score });
      });

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.entries[TODAY]).toBe(4);
      expect(result.current.entries[PAST]).toBe(2);
    });
  });

  describe('setScore', () => {
    it('accepts a valid score for a past date and persists it', async () => {
      const { result } = await renderLoaded();

      act(() => {
        result.current.setScore(PAST, 5 as Score);
      });

      expect(result.current.entries[PAST]).toBe(5);
      expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 5 });
    });

    it('accepts a score for today', async () => {
      const { result } = await renderLoaded();

      act(() => {
        result.current.setScore(TODAY, 1 as Score);
      });

      expect(result.current.entries[TODAY]).toBe(1);
      expect(mockedSave).toHaveBeenCalledTimes(1);
    });

    it.each([0, 6, -1, 2.5, NaN])(
      'ignores out-of-range or non-integer score %p without saving',
      async invalid => {
        const { result } = await renderLoaded();

        act(() => {
          result.current.setScore(PAST, invalid as Score);
        });

        expect(result.current.entries).toEqual({});
        expect(mockedSave).not.toHaveBeenCalled();
      },
    );

    it('ignores scores for future dates without saving', async () => {
      const { result } = await renderLoaded();

      act(() => {
        result.current.setScore(FUTURE, 3 as Score);
      });

      expect(result.current.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    });

    it('replaces an existing score for the same day', async () => {
      const { result } = await renderLoaded({ [PAST]: 2 as Score });

      act(() => {
        result.current.setScore(PAST, 4 as Score);
      });

      expect(result.current.entries[PAST]).toBe(4);
      expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 4 });
    });

    it('does not throw when saveEntries rejects', async () => {
      mockedSave.mockRejectedValue(new Error('disk full'));
      const { result } = await renderLoaded();

      expect(() =>
        act(() => {
          result.current.setScore(PAST, 3 as Score);
        }),
      ).not.toThrow();
      expect(result.current.entries[PAST]).toBe(3);
    });
  });

  describe('clearScore', () => {
    it('removes an existing score and persists the change', async () => {
      const { result } = await renderLoaded({ [PAST]: 3 as Score, [YESTERDAY]: 2 as Score });

      act(() => {
        result.current.clearScore(PAST);
      });

      expect(result.current.entries).toEqual({ [YESTERDAY]: 2 });
      expect(mockedSave).toHaveBeenCalledWith({ [YESTERDAY]: 2 });
    });

    it('is a no-op when the key is absent: no save and same entries reference', async () => {
      const initial: Entries = { [YESTERDAY]: 2 as Score };
      const { result } = await renderLoaded(initial);
      const before = result.current.entries;

      act(() => {
        result.current.clearScore(PAST);
      });

      expect(result.current.entries).toBe(before);
      expect(mockedSave).not.toHaveBeenCalled();
    });
  });

  describe('fire', () => {
    it('is derived from entries and today and recomputes when entries change', async () => {
      const { result } = await renderLoaded();
      const initialFire = result.current.fire;

      act(() => {
        result.current.setScore(YESTERDAY, 5 as Score);
      });

      expect(result.current.fire).not.toBe(initialFire);
      expect(result.current.fire.strength).toBeGreaterThan(0);
    });
  });
});

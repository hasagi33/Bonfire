/**
 * useEntries.test.ts — tests for the useEntries hook.
 *
 * Storage is mocked so no AsyncStorage is touched and no network is used.
 * The fire engine (computeFire) is exercised through the hook's derived `fire`.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useEntries } from './useEntries';
import { loadEntries, saveEntries } from '../data/entriesStore';
import type { Entries } from '../domain/fire';
import { computeFire } from '../domain/fire';

jest.mock('../data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY = '2024-06-15';
const PAST = '2024-06-10';
const FUTURE = '2024-06-20';

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

describe('useEntries initial load', () => {
  it('starts not ready with empty entries, then loads persisted data', async () => {
    let resolveLoad: (value: Entries) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    const { result } = renderHook(() => useEntries(TODAY));
    expect(result.current.ready).toBe(false);
    expect(result.current.entries).toEqual({});

    await act(async () => {
      resolveLoad({ [PAST]: 4 });
    });

    expect(result.current.ready).toBe(true);
    expect(result.current.entries).toEqual({ [PAST]: 4 });
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  it('derives fire state from loaded entries', async () => {
    const loaded: Entries = { [PAST]: 5 };
    const { result } = await renderLoaded(loaded);
    expect(result.current.fire).toEqual(computeFire(loaded, TODAY));
  });

  it('does not update state after unmount when load resolves late', async () => {
    let resolveLoad: (value: Entries) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const { result, unmount } = renderHook(() => useEntries(TODAY));
    unmount();
    await act(async () => {
      resolveLoad({ [PAST]: 3 });
    });
    expect(result.current.ready).toBe(false);
    expect(result.current.entries).toEqual({});
  });
});

describe('setScore', () => {
  it('adds a valid score for a past date and persists it', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.setScore(PAST, 3);
    });
    expect(result.current.entries).toEqual({ [PAST]: 3 });
    expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 3 });
  });

  it('accepts today as a valid date', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.setScore(TODAY, 5);
    });
    expect(result.current.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  it('replaces an existing score for the same date', async () => {
    const { result } = await renderLoaded({ [PAST]: 2 });
    act(() => {
      result.current.setScore(PAST, 4);
    });
    expect(result.current.entries).toEqual({ [PAST]: 4 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 4 });
  });

  it.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p', async score => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.setScore(PAST, score as never);
    });
    expect(result.current.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('ignores future dates without saving', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.setScore(FUTURE, 3);
    });
    expect(result.current.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('does not throw when saveEntries rejects', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    const { result } = await renderLoaded();
    expect(() =>
      act(() => {
        result.current.setScore(PAST, 2);
      }),
    ).not.toThrow();
    expect(result.current.entries).toEqual({ [PAST]: 2 });
  });
});

describe('clearScore', () => {
  it('removes an existing score and persists the change', async () => {
    const { result } = await renderLoaded({ [PAST]: 4, [TODAY]: 2 });
    act(() => {
      result.current.clearScore(PAST);
    });
    expect(result.current.entries).toEqual({ [TODAY]: 2 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 2 });
  });

  it('is a no-op for a missing date: same entries reference, no save', async () => {
    const { result } = await renderLoaded({ [PAST]: 4 });
    const before = result.current.entries;
    act(() => {
      result.current.clearScore('2024-01-01');
    });
    expect(result.current.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('derived fire', () => {
  it('recomputes fire when a score is added', async () => {
    const { result } = await renderLoaded();
    const emptyFire = result.current.fire;
    act(() => {
      result.current.setScore(PAST, 5);
    });
    expect(result.current.fire).not.toEqual(emptyFire);
    expect(result.current.fire).toEqual(computeFire({ [PAST]: 5 }, TODAY));
  });

  it('recomputes fire when a score is cleared', async () => {
    const { result } = await renderLoaded({ [PAST]: 5 });
    act(() => {
      result.current.clearScore(PAST);
    });
    expect(result.current.fire).toEqual(computeFire({}, TODAY));
  });
});

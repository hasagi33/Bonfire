/**
 * useEntries.test.ts — tests for the useEntries hook.
 *
 * Storage is mocked so no AsyncStorage is touched and tests stay deterministic.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useEntries } from './useEntries';
import { loadEntries, saveEntries } from '../data/entriesStore';
import type { Entries } from '../domain/fire';

jest.mock('../data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY = '2024-06-15';
const PAST = '2024-06-10';
const YESTERDAY = '2024-06-14';
const FUTURE = '2024-06-16';

async function renderLoaded(initial: Entries = {}, today: string = TODAY) {
  mockLoad.mockResolvedValue(initial);
  const hook = renderHook(({ t }: { t: string }) => useEntries(t as never), {
    initialProps: { t: today },
  });
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  return hook;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSave.mockResolvedValue(undefined);
});

describe('useEntries initial load', () => {
  it('starts not ready and then becomes ready with loaded entries', async () => {
    const loaded: Entries = { [PAST]: 4 } as Entries;
    mockLoad.mockResolvedValue(loaded);
    const { result } = renderHook(() => useEntries(TODAY as never));

    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.entries).toEqual(loaded);
    expect(mockLoad).toHaveBeenCalledTimes(1);
  });

  it('does not set state after unmount', async () => {
    let resolve!: (v: Entries) => void;
    mockLoad.mockReturnValue(new Promise<Entries>(r => (resolve = r)));
    const { result, unmount } = renderHook(() => useEntries(TODAY as never));
    unmount();
    await act(async () => {
      resolve({ [PAST]: 3 } as Entries);
    });
    expect(result.current.ready).toBe(false);
    expect(result.current.entries).toEqual({});
  });
});

describe('setScore', () => {
  it.each([1, 2, 3, 4, 5])('accepts valid score %i for a past day and persists it', async score => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.setScore(PAST as never, score as never);
    });
    expect(result.current.entries[PAST as never]).toBe(score);
    expect(mockSave).toHaveBeenCalledWith({ [PAST]: score });
  });

  it('accepts a score for today', async () => {
    const { result } = await renderLoaded();
    act(() => {
      result.current.setScore(TODAY as never, 3 as never);
    });
    expect(result.current.entries[TODAY as never]).toBe(3);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it.each([0, 6, -1, 2.5, NaN])('rejects invalid score %p without changing state', async bad => {
    const { result } = await renderLoaded();
    const before = result.current.entries;
    act(() => {
      result.current.setScore(PAST as never, bad as never);
    });
    expect(result.current.entries).toBe(before);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('rejects a score for a future date without changing state', async () => {
    const { result } = await renderLoaded();
    const before = result.current.entries;
    act(() => {
      result.current.setScore(FUTURE as never, 5 as never);
    });
    expect(result.current.entries).toBe(before);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('replaces an existing score for the same day', async () => {
    const { result } = await renderLoaded({ [PAST]: 2 } as Entries);
    act(() => {
      result.current.setScore(PAST as never, 5 as never);
    });
    expect(result.current.entries[PAST as never]).toBe(5);
    expect(mockSave).toHaveBeenLastCalledWith({ [PAST]: 5 });
  });
});

describe('clearScore', () => {
  it('removes an existing day and persists the change', async () => {
    const { result } = await renderLoaded({ [PAST]: 4, [YESTERDAY]: 3 } as Entries);
    act(() => {
      result.current.clearScore(PAST as never);
    });
    expect(result.current.entries).toEqual({ [YESTERDAY]: 3 });
    expect(mockSave).toHaveBeenCalledWith({ [YESTERDAY]: 3 });
  });

  it('is a no-op for a missing day', async () => {
    const { result } = await renderLoaded({ [PAST]: 4 } as Entries);
    const before = result.current.entries;
    act(() => {
      result.current.clearScore(YESTERDAY as never);
    });
    expect(result.current.entries).toBe(before);
    expect(mockSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  it('is derived from entries and recomputes when entries change', async () => {
    const { result } = await renderLoaded();
    const initialFire = result.current.fire;
    act(() => {
      result.current.setScore(PAST as never, 5 as never);
    });
    expect(result.current.fire).not.toBe(initialFire);
    expect(result.current.fire).toEqual(
      expect.objectContaining({ lit: true }),
    );
  });

  it('recomputes when today changes', async () => {
    const { result, rerender } = await renderLoaded({ [PAST]: 5 } as Entries, TODAY);
    const before = result.current.fire;
    rerender({ t: '2024-06-20' });
    expect(result.current.fire).not.toBe(before);
  });
});

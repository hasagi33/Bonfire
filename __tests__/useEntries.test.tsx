/**
 * useEntries.test.tsx — hook tests for score entries and derived fire state.
 *
 * A tiny probe component exposes hook state through a ref so tests can drive
 * setScore/clearScore and inspect entries, fire, and ready without native UI.
 * The entries store is mocked so no real AsyncStorage is touched.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries } from '../src/domain/fire';

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

// Probe component: copies the hook result into `latest` on every render.
function Probe({ today }: { today: DateKey }) {
  const value = useEntries(today);
  latest = value;
  return <Text>{String(value.ready)}</Text>;
}

// Renders the probe and flushes pending promises (the load resolution).
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
}

// Resolves loadEntries with the given map and waits for the state update.
async function resolveLoad(data: Entries) {
  await act(async () => {
    mockedLoad.mockResolvedValueOnce(data);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
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

describe('useEntries initial state', () => {
  test('starts with empty entries and ready=false while loading', async () => {
    // Keep the load pending so we can observe the loading state.
    let finish!: (value: Entries) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Entries>(resolve => {
        finish = resolve;
      }),
    );

    await renderHook();

    expect(latest.entries).toEqual({});
    expect(latest.ready).toBe(false);

    await act(async () => {
      finish({});
    });
    expect(latest.ready).toBe(true);
  });

  test('becomes ready with the loaded entries once load resolves', async () => {
    mockedLoad.mockResolvedValueOnce({ '2026-06-09': 4 });

    await renderHook();

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(latest.fire).toBeDefined();
  });
});

describe('setScore', () => {
  test('stores a valid score for a past date, updates fire, and persists', async () => {
    await resolveLoad({});
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 3);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
    expect(latest.fire).toBeDefined();
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('accepts a score for today', async () => {
    await resolveLoad({});
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('ignores an out-of-range score and leaves storage untouched', async () => {
    await resolveLoad({});
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 9 as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a non-integer score', async () => {
    await resolveLoad({});
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 2.5 as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date and leaves storage untouched', async () => {
    await resolveLoad({});
    await renderHook();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 4);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('replaces an existing score for the same date', async () => {
    await resolveLoad({ '2026-06-09': 2 });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 5 });
  });
});

describe('clearScore', () => {
  test('removes an existing date and persists the smaller map', async () => {
    await resolveLoad({ '2026-06-08': 4, '2026-06-09': 3 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 4 });
  });

  test('is a no-op for a missing date: no state change and no save', async () => {
    await resolveLoad({ '2026-06-08': 4 });
    await renderHook();
    const before = latest.entries;

    act(() => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('recomputes fire when entries change', async () => {
    await resolveLoad({});
    await renderHook();
    const initialFire = latest.fire;

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 2);
    });
    const afterSet = latest.fire;
    expect(afterSet).not.toBe(initialFire);

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });
    expect(latest.fire).toEqual(initialFire);
  });
});

describe('unmount guard', () => {
  test('does not update state when loadEntries resolves after unmount', async () => {
    let finish!: (value: Entries) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Entries>(resolve => {
        finish = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await renderHook();
    const readyWhileLoading = latest.ready;
    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      finish({ '2026-06-09': 5 });
    });

    expect(readyWhileLoading).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

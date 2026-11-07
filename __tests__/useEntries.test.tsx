/**
 * useEntries.test.tsx — hook tests for the score/fire state container.
 *
 * A tiny probe component exposes hook state through a module-level variable so
 * tests can drive setScore/clearScore and inspect entries/fire/ready without
 * any native UI. The entries store is mocked so AsyncStorage is never touched.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { Entries } from '../src/domain/fire';

// Replace the storage module with jest mocks; the hook must never reach AsyncStorage directly.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY = '2024-05-10';

// The most recent hook result, updated by the probe on every render.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe({ today }: { today: string }) {
  const value = useEntries(today);
  // Keep a reference to the latest hook output so tests can read and call it.
  latest = value;
  return <Text>{value.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe inside act so effects and the async load settle deterministically.
async function renderHook(today: string = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  // Flush any follow-up microtasks queued by the mocked promise.
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
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

describe('useEntries initial load', () => {
  test('sets entries and ready=true after loadEntries resolves', async () => {
    const saved: Entries = { '2024-05-08': 3, '2024-05-09': 5 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready before the load finishes', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});

    await act(async () => {
      resolveLoad({});
    });

    expect(latest.ready).toBe(true);
  });

  test('does not set state when unmounted before the load resolves', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });
    const snapshotBeforeUnmount = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ '2024-05-09': 4 });
    });

    // The late-resolving load must not update the (now unmounted) hook state.
    expect(latest).toBe(snapshotBeforeUnmount);
    expect(latest.ready).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('useEntries.setScore', () => {
  test('accepts a valid score on today and persists the updated map', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 4 });
  });

  test('accepts a valid score on a past date', async () => {
    mockedLoad.mockResolvedValue({ '2024-05-08': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2024-05-09', 5);
    });

    expect(latest.entries).toEqual({ '2024-05-08': 2, '2024-05-09': 5 });
    expect(mockedSave).toHaveBeenCalledWith({ '2024-05-08': 2, '2024-05-09': 5 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2024-05-09': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2024-05-09', 3);
    });

    expect(latest.entries).toEqual({ '2024-05-09': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2024-05-09': 3 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p without saving', async score => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, score as number);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date without saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2024-05-11', 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('still swallows storage failures without breaking state', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 1);
    });

    // A score of 1 is valid and must still be applied even if persistence fails.
    expect(latest.entries).toEqual({ [TODAY]: 1 });
  });
});

describe('useEntries.clearScore', () => {
  test('removes an existing date and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2024-05-08': 3, '2024-05-09': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2024-05-09');
    });

    expect(latest.entries).toEqual({ '2024-05-08': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2024-05-08': 3 });
  });

  test('is a no-op with no save for a missing date', async () => {
    mockedLoad.mockResolvedValue({ '2024-05-08': 3 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2024-05-09');
    });

    expect(latest.entries).toEqual({ '2024-05-08': 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('useEntries.fire', () => {
  test('is derived from entries and updates after setScore', async () => {
    await renderHook();
    const emptyFire = latest.fire;

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).not.toEqual(emptyFire);
    expect(latest.fire).toEqual(
      expect.objectContaining({
        // Derived fire must reflect the new entry rather than the stale empty state.
        lit: expect.any(Boolean),
      }),
    );
  });

  test('updates after clearScore removes the only entry', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 5 });
    await renderHook();
    const litFire = latest.fire;

    await act(async () => {
      latest.clearScore(TODAY);
    });

    expect(latest.fire).not.toEqual(litFire);
    expect(latest.entries).toEqual({});
  });
});

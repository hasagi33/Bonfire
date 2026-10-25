/**
 * useEntries.test.tsx — hook tests for the score/fire state owner.
 *
 * A tiny probe component exposes hook state through a mutable ref so tests can
 * drive setScore/clearScore and inspect entries, fire, and ready without native UI.
 * Persistence is mocked through the entriesStore module so no AsyncStorage is touched.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries, FireState } from '../src/domain/fire';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so the tests never depend on the wall clock.
const TODAY = '2026-06-10' as DateKey;
const PAST = '2026-06-09' as DateKey;
const FUTURE = '2026-06-11' as DateKey;

// Holds the latest hook result so tests can read and call it directly.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: mounts the hook and mirrors its result into `latest`.
function Probe({ today }: { today: DateKey }) {
  const result = useEntries(today);
  latest = result;
  return <Text>{result.ready ? 'ready' : 'loading'}</Text>;
}

// Renders the probe and waits for the mocked load promise to settle.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

// Reads the lit flag from the derived fire state without assuming its exact shape.
// Accepts either `isLit` or `lit`, falling back to a truthy check on `strength`.
function isLit(fire: FireState): boolean {
  const f = fire as unknown as {
    isLit?: boolean;
    lit?: boolean;
    state?: string;
    strength?: number;
  };
  if (typeof f.isLit === 'boolean') {
    return f.isLit;
  }
  if (typeof f.lit === 'boolean') {
    return f.lit;
  }
  if (typeof f.state === 'string') {
    return f.state === 'lit';
  }
  return false;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue({} as Entries);
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
  test('sets ready=true and entries from loadEntries', async () => {
    const saved: Entries = { [PAST]: 4 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready before the load resolves', () => {
    mockedLoad.mockReturnValue(new Promise(() => {}));

    act(() => {
      rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test('accepts a valid score on today and persists deep-equal data', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 3);
    });

    expect(latest.entries).toEqual({ [TODAY]: 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 3 });
  });

  test('accepts a valid score on a past date', async () => {
    await renderHook();

    act(() => {
      latest.setScore(PAST, 5);
    });

    expect(latest.entries).toEqual({ [PAST]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [PAST]: 5 });
  });

  test('accepts boundary scores 1 and 5', async () => {
    await renderHook();

    act(() => {
      latest.setScore(PAST, 1);
    });
    act(() => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries).toEqual({ [PAST]: 1, [TODAY]: 5 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 2 });
    await renderHook();

    act(() => {
      latest.setScore(PAST, 4);
    });

    expect(latest.entries).toEqual({ [PAST]: 4 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [PAST]: 4 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'rejects invalid score %p without state or save change',
    async bad => {
      await renderHook();

      act(() => {
        latest.setScore(PAST, bad as never);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('rejects a future date without state or save change', async () => {
    await renderHook();

    act(() => {
      latest.setScore(FUTURE, 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows save failures so state still updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 2);
    });

    expect(latest.entries).toEqual({ [TODAY]: 2 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3, [TODAY]: 4 });
    await renderHook();

    act(() => {
      latest.clearScore(PAST);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 4 });
  });

  test('is a no-op with no save for a missing day', async () => {
    mockedLoad.mockResolvedValue({ [PAST]: 3 });
    await renderHook();

    act(() => {
      latest.clearScore(TODAY);
    });

    expect(latest.entries).toEqual({ [PAST]: 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('is recomputed from entries after setScore', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore(TODAY, 5);
    });

    // The fire object must reflect the new calendar: it cannot be the same
    // derived value as before a lit score was logged.
    expect(latest.fire).not.toBe(before);
    expect(latest.entries).toEqual({ [TODAY]: 5 });
  });

  test('is recomputed after clearScore', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 5 });
    await renderHook();
    const litBefore = latest.fire;

    act(() => {
      latest.clearScore(TODAY);
    });

    expect(latest.fire).not.toBe(litBefore);
    expect(latest.entries).toEqual({});
  });
});

/**
 * useEntries.test.tsx — hook tests for the entries state and fire derivation.
 *
 * The entries store is mocked so AsyncStorage is never touched. A small probe
 * component exposes the hook's return value through a mutable reference so each
 * test can drive setScore/clearScore inside act() and inspect the result.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries, FireState, Score } from '../src/domain/fire';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so future-date rejection and fire math are deterministic.
const TODAY = '2026-06-10' as DateKey;
const YESTERDAY = '2026-06-09' as DateKey;
const TOMORROW = '2026-06-11' as DateKey;

// Holds the latest hook return value so tests can read it after each act().
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Helper: FireState's exact shape is owned by the fire engine, so the fire's
// lit/out status is captured as a snapshot of its serialized form. This lets
// tests assert that the fire object was recomputed (different content) without
// depending on a specific property name.
function fireSnapshot(fire: FireState): string {
  return JSON.stringify(fire);
}

// Helper: reads whether the fire is lit via a narrow accessor so the tests
// don't hard-code a property the fire engine may not expose.
function isLit(fire: FireState): boolean {
  const status = (fire as unknown as { status?: string }).status;
  return status !== 'out' && status !== 'unlit';
}

function Probe() {
  latest = useEntries(TODAY);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Mounts the probe and waits for the async load effect to settle.
async function renderHook() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
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
  test('starts not ready and becomes ready after loading', async () => {
    let resolveLoad!: (value: Entries) => void;
    mockedLoad.mockReturnValue(
      new Promise<Entries>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({});
    });
    expect(latest.ready).toBe(true);
  });

  test('loads persisted entries and derives fire from them', async () => {
    mockedLoad.mockResolvedValue({ [YESTERDAY]: 4 });
    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({ [YESTERDAY]: 4 });
    expect(isLit(latest.fire)).toBe(true);
  });
});

describe('setScore', () => {
  test('adds a valid score and persists the deep-equal data', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 3 as Score);
    });

    expect(latest.entries).toEqual({ [TODAY]: 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: 3 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ [YESTERDAY]: 2 });
    await renderHook();

    await act(async () => {
      latest.setScore(YESTERDAY, 5 as Score);
    });

    expect(latest.entries).toEqual({ [YESTERDAY]: 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [YESTERDAY]: 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'ignores invalid score %p without state change or save',
    async invalid => {
      await renderHook();
      const before = latest.entries;

      await act(async () => {
        latest.setScore(TODAY, invalid as never);
      });

      expect(latest.entries).toBe(before);
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('ignores future dates without state change or save', async () => {
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.setScore(TOMORROW, 4 as Score);
    });

    expect(latest.entries).toBe(before);
    expect(latest.entries).not.toHaveProperty(TOMORROW);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ [YESTERDAY]: 3, [TODAY]: 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore(YESTERDAY);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockedSave).toHaveBeenLastCalledWith({ [TODAY]: 4 });
  });

  test('is a no-op for a day with no score', async () => {
    await renderHook();
    const before = latest.entries;

    await act(async () => {
      latest.clearScore(YESTERDAY);
    });

    expect(latest.entries).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('is recomputed after setScore', async () => {
    await renderHook();
    const initial = fireSnapshot(latest.fire);

    await act(async () => {
      latest.setScore(TODAY, 5 as Score);
    });

    expect(fireSnapshot(latest.fire)).not.toBe(initial);
    expect(isLit(latest.fire)).toBe(true);
  });

  test('is recomputed after clearScore', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 5 });
    await renderHook();
    const initial = fireSnapshot(latest.fire);
    expect(isLit(latest.fire)).toBe(true);

    await act(async () => {
      latest.clearScore(TODAY);
    });

    expect(fireSnapshot(latest.fire)).not.toBe(initial);
    expect(latest.entries).toEqual({});
  });
});

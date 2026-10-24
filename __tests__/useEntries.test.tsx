/**
 * useEntries.test.tsx — hook tests for score state, validation, persistence and derived fire.
 *
 * The entriesStore module is mocked so no real AsyncStorage is touched. A tiny probe
 * component exposes hook state through a module variable so tests can drive
 * setScore/clearScore and assert on entries, fire, ready, and the saved data.
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

const mockLoadEntries = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockSaveEntries = saveEntries as jest.MockedFunction<typeof saveEntries>;

// Fixed "today" so date-based logic is deterministic.
const TODAY = '2026-06-10' as DateKey;

let latest: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result in a module variable for assertions.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Renders the probe and flushes the pending load promise inside act().
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadEntries.mockResolvedValue({});
  mockSaveEntries.mockResolvedValue(undefined);
  latest = undefined as unknown as UseEntries;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useEntries initial load', () => {
  test('starts not ready and becomes ready with loaded entries', async () => {
    const saved: Entries = { '2026-06-09': 3 };
    mockLoadEntries.mockResolvedValue(saved);

    await renderHook();

    expect(mockLoadEntries).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('loads empty entries when storage is empty', async () => {
    await renderHook();

    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test('adds a valid score for today and saves the deep-equal next map', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore(TODAY, 4);
    });

    expect(latest.entries).toEqual({ [TODAY]: 4 });
    expect(mockSaveEntries).toHaveBeenCalledTimes(1);
    expect(mockSaveEntries).toHaveBeenCalledWith({ [TODAY]: 4 });
  });

  test('accepts a past date and replaces an existing score', async () => {
    mockLoadEntries.mockResolvedValue({ '2026-06-08': 2 });
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-08' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 5 });
    expect(mockSaveEntries).toHaveBeenLastCalledWith({ '2026-06-08': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])(
    'rejects invalid score %p without changing entries or saving',
    async score => {
      await renderHook();

      await act(async () => {
        latest.setScore(TODAY, score as unknown as 1);
      });

      expect(latest.entries).toEqual({});
      expect(mockSaveEntries).not.toHaveBeenCalled();
    },
  );

  test('rejects a future date without changing entries or saving', async () => {
    await renderHook();

    await act(async () => {
      latest.setScore('2026-06-11' as DateKey, 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockSaveEntries).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and saves the deep-equal remaining map', async () => {
    mockLoadEntries.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-08' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockSaveEntries).toHaveBeenCalledTimes(1);
    expect(mockSaveEntries).toHaveBeenCalledWith({ '2026-06-09': 4 });
  });

  test('is a no-op with no save when the day is missing', async () => {
    mockLoadEntries.mockResolvedValue({ '2026-06-09': 4 });
    await renderHook();

    await act(async () => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
    expect(mockSaveEntries).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('recomputes fire when entries change', async () => {
    await renderHook();
    const before = latest.fire;

    await act(async () => {
      latest.setScore(TODAY, 5);
    });

    // The fire is derived from entries, so adding a lit day must change it.
    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(
      expect.objectContaining({ state: 'lit', strength: 4 }),
    );
  });
});

/**
 * useEntries.test.tsx — hook tests for entry state, score rules, and derived fire.
 *
 * A probe component exposes hook state through module-level variables so tests can
 * drive setScore/clearScore and inspect the derived fire without native UI.
 * The entries store is mocked so AsyncStorage is never touched directly, and the
 * "today" key is fixed so results are deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries, type Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY: DateKey = '2026-06-10';

// Latest hook result captured by the probe component.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: renders nothing meaningful, but stores the hook result each render.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return null;
}

// Mount the hook with the given today value and wait for the initial load to settle.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
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

describe('initial load', () => {
  test('sets ready=true and entries from loadEntries', async () => {
    const saved: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
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
  test.each([1, 2, 3, 4, 5] as Score[])(
    'accepts valid score %i for today and persists deep-equal data',
    async score => {
      await renderHook();

      act(() => {
        latest.setScore(TODAY, score);
      });

      expect(latest.entries).toEqual({ [TODAY]: score });
      expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: score });
    },
  );

  test('accepts a score for a past date', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-01', 4);
    });

    expect(latest.entries).toEqual({ '2026-06-01': 4 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-01': 4 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09', 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN, 100])(
    'ignores invalid score %p without saving',
    async score => {
      await renderHook();

      act(() => {
        latest.setScore(TODAY, score as Score);
      });

      expect(latest.entries).toEqual({});
      expect(mockedSave).not.toHaveBeenCalled();
    },
  );

  test('ignores a future date without calling saveEntries', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-11', 3);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op for a missing day and does not save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-01');
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('derived fire', () => {
  test('empty entries produce the same fire as computeFire({}, today)', async () => {
    await renderHook();
    expect(latest.fire).toEqual(computeFire({}, TODAY));
  });

  test('a single score lights the fire and matches computeFire', async () => {
    mockedLoad.mockResolvedValue({ [TODAY]: 3 });
    await renderHook();
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 3 }, TODAY));
  });

  test('consecutive scored days match computeFire', async () => {
    const entries: Entries = { '2026-06-08': 2, '2026-06-09': 4, [TODAY]: 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('a one-day gap keeps the fire alive (FR-007)', async () => {
    const entries: Entries = { '2026-06-08': 3, [TODAY]: 3 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('a two-day miss extinguishes the fire (FR-008)', async () => {
    const entries: Entries = { '2026-06-06': 5 };
    mockedLoad.mockResolvedValue(entries);
    await renderHook();
    expect(latest.fire).toEqual(computeFire(entries, TODAY));
  });

  test('fire recomputes after setScore changes the calendar', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.fire).not.toEqual(before);
    expect(latest.fire).toEqual(computeFire({ [TODAY]: 5 }, TODAY));
  });
});

/**
 * useEntries.test.tsx — hook tests for the score ledger and derived fire state.
 *
 * A tiny probe component exposes the hook's return value through a module-level
 * variable so tests can call setScore/clearScore and inspect entries, fire, and
 * ready without any native UI. The persistence layer (entriesStore) is mocked so
 * no real AsyncStorage is touched and every test is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import type { DateKey } from '../src/domain/dates';
import type { Entries } from '../src/domain/fire';

// Keep the persistence layer out of the test: the hook talks to these mocks only.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

// A fixed "today" so future/past checks are deterministic.
const TODAY = '2026-06-10' as DateKey;

// Latest hook result, updated by the probe on every render.
let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: renders nothing meaningful but publishes the hook result.
function Probe({ today }: { today: DateKey }) {
  const value = useEntries(today);
  React.useEffect(() => {
    latest = value;
  });
  latest = value;
  return <Text>{value.ready ? 'ready' : 'loading'}</Text>;
}

// Mount the probe and wait for the mocked load promise to settle.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
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

describe('useEntries load', () => {
  test('ready flips to true after the load resolves and entries reflect the map', async () => {
    const saved: Entries = { '2026-06-08': 4, '2026-06-09': 3 };
    mockedLoad.mockResolvedValue(saved);

    await renderHook();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.entries).toEqual(saved);
  });

  test('starts not ready while the load is still pending', async () => {
    // Never-resolving load keeps the hook in its loading state.
    mockedLoad.mockReturnValue(new Promise<Entries>(() => {}));

    await renderHook();

    expect(latest.ready).toBe(false);
    expect(latest.entries).toEqual({});
  });
});

describe('setScore', () => {
  test('adds a score for a valid past date and saves the deep-equal next map', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 3);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 3 });
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 3 });
  });

  test('accepts today as a valid date', async () => {
    await renderHook();

    act(() => {
      latest.setScore(TODAY, 5);
    });

    expect(latest.entries).toEqual({ [TODAY]: 5 });
    expect(mockedSave).toHaveBeenCalledWith({ [TODAY]: 5 });
  });

  test('replaces an existing score for the same day', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-09': 2 });
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 5 });
    expect(mockedSave).toHaveBeenLastCalledWith({ '2026-06-09': 5 });
  });

  test.each([0, 6, -1, 2.5, NaN])('ignores invalid score %p', async bad => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, bad as never);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('ignores a score for a future date', async () => {
    await renderHook();

    act(() => {
      latest.setScore('2026-06-11' as DateKey, 4);
    });

    expect(latest.entries).toEqual({});
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('tolerates a storage failure without breaking the in-memory state', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderHook();

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 4);
    });

    expect(latest.entries).toEqual({ '2026-06-09': 4 });
  });
});

describe('clearScore', () => {
  test('removes an existing day and persists the result', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3, '2026-06-09': 4 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-09' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
  });

  test('is a no-op for a missing day and does not save', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 3 });
    await renderHook();

    act(() => {
      latest.clearScore('2026-06-01' as DateKey);
    });

    expect(latest.entries).toEqual({ '2026-06-08': 3 });
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('fire derivation', () => {
  test('fire is derived from entries and recomputes when entries change', async () => {
    await renderHook();
    const before = latest.fire;

    act(() => {
      latest.setScore('2026-06-09' as DateKey, 5);
    });

    const after = latest.fire;
    expect(after).not.toBe(before);
    expect(after).toEqual(
      expect.objectContaining({
        lit: true,
      }),
    );
  });

  test('fire recomputes when the fixed today value changes', async () => {
    mockedLoad.mockResolvedValue({ '2026-06-08': 4 });
    await renderHook(TODAY);
    const onTime = latest.fire;

    // Advancing today past the scored day should change the derived result.
    await act(async () => {
      rendered?.update(<Probe today={'2026-06-12' as DateKey} />);
    });

    expect(latest.fire).not.toBe(onTime);
  });
});

/**
 * useEntries.test.tsx — hook tests for score entries and derived fire state.
 *
 * The entries store is mocked so no real AsyncStorage is touched. A tiny probe
 * component exposes hook state through a ref so tests can drive mount loading,
 * score changes, clears, and fire recomputation without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, isScore, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Replace the storage module so nothing touches AsyncStorage.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY: DateKey = '2026-06-10';
const FIXTURE: Entries = {
  '2026-06-08': 3,
  '2026-06-09': 5,
};

// The probe stores the latest hook result in this holder so tests can read it.
let latest: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return null;
}

// Render the probe and let the mocked load promise resolve inside act.
async function renderHook(today: DateKey = TODAY) {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe today={today} />);
  });
  await act(async () => {});
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  mockedLoad.mockResolvedValue({ ...FIXTURE });
  mockedSave.mockResolvedValue(undefined);
  latest = undefined as unknown as UseEntries;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('loads entries on mount and sets ready after load resolves', async () => {
  await renderHook();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.entries).toEqual(FIXTURE);
});

test('starts not ready before the load promise resolves', () => {
  mockedLoad.mockReturnValue(new Promise(() => {}));
  act(() => {
    rendered = ReactTestRenderer.create(<Probe today={TODAY} />);
  });

  expect(latest.ready).toBe(false);
  expect(latest.entries).toEqual({});
});

test('setScore with a valid score on a past day adds the entry and saves', async () => {
  await renderHook();

  act(() => {
    latest.setScore('2026-06-07', 4);
  });

  const expected = { ...FIXTURE, '2026-06-07': 4 };
  expect(latest.entries).toEqual(expected);
  expect(mockedSave).toHaveBeenCalledWith(expected);
});

test('setScore replaces an existing score for the same day', async () => {
  await renderHook();

  act(() => {
    latest.setScore('2026-06-08', 2);
  });

  expect(latest.entries['2026-06-08']).toBe(2);
  expect(mockedSave).toHaveBeenLastCalledWith({ ...FIXTURE, '2026-06-08': 2 });
});

test('setScore on today is accepted', async () => {
  await renderHook();

  act(() => {
    latest.setScore(TODAY, 1);
  });

  expect(latest.entries[TODAY]).toBe(1);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

test('setScore ignores an invalid score and does not save', async () => {
  await renderHook();
  const before = latest.entries;

  act(() => {
    latest.setScore('2026-06-07', 9 as unknown as 1);
  });

  expect(isScore(9)).toBe(false);
  expect(latest.entries).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('setScore ignores a future date and does not save', async () => {
  await renderHook();
  const before = latest.entries;

  act(() => {
    latest.setScore('2026-06-11', 5);
  });

  expect(latest.entries).toEqual(before);
  expect(latest.entries['2026-06-11']).toBeUndefined();
  expect(mockedSave).not.toHaveBeenCalled();
});

test('clearScore removes an existing entry and saves', async () => {
  await renderHook();

  act(() => {
    latest.clearScore('2026-06-09');
  });

  expect(latest.entries).toEqual({ '2026-06-08': 3 });
  expect(mockedSave).toHaveBeenCalledWith({ '2026-06-08': 3 });
});

test('clearScore on a missing day is a no-op and does not save', async () => {
  await renderHook();
  const before = latest.entries;

  act(() => {
    latest.clearScore('2026-01-01');
  });

  expect(latest.entries).toBe(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('fire is derived from entries and today and changes when entries change', async () => {
  await renderHook();

  expect(latest.fire).toEqual(computeFire(FIXTURE, TODAY));

  const beforeFire = latest.fire;
  act(() => {
    latest.setScore(TODAY, 5);
  });

  expect(latest.fire).toEqual(computeFire({ ...FIXTURE, [TODAY]: 5 }, TODAY));
  expect(latest.fire).not.toBe(beforeFire);
});

test('fire recomputes to match the engine when a day is cleared', async () => {
  await renderHook();

  act(() => {
    latest.clearScore('2026-06-08');
  });

  expect(latest.fire).toEqual(computeFire({ '2026-06-09': 5 }, TODAY));
});

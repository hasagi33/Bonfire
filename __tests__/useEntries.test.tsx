/**
 * useEntries.test.tsx — hook tests for the entries state owner.
 *
 * A tiny probe component exposes hook state through a module-level variable so
 * tests can drive setScore/clearScore and inspect derived fire state. Storage
 * is mocked at the entriesStore boundary, so no AsyncStorage or network is hit.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useEntries, type UseEntries } from '../src/hooks/useEntries';
import { loadEntries, saveEntries } from '../src/data/entriesStore';
import { computeFire, type Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Mock the persistence seam so the hook never touches AsyncStorage directly.
jest.mock('../src/data/entriesStore', () => ({
  loadEntries: jest.fn(),
  saveEntries: jest.fn(),
}));

const mockedLoad = loadEntries as jest.MockedFunction<typeof loadEntries>;
const mockedSave = saveEntries as jest.MockedFunction<typeof saveEntries>;

const TODAY: DateKey = '2026-06-10';

let latest!: UseEntries;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: captures the hook's return value on every render.
function Probe({ today }: { today: DateKey }) {
  latest = useEntries(today);
  return <Text>{latest.ready ? 'ready' : 'loading'}</Text>;
}

// Render the probe and let the mocked load promise resolve.
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

test('initial load sets ready=true and entries from loadEntries', async () => {
  const saved: Entries = { '2026-06-08': 4, '2026-06-09': 3 };
  mockedLoad.mockResolvedValue(saved);

  await renderHook();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.entries).toEqual(saved);
});

test('ready stays false until loadEntries resolves', async () => {
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

  await act(async () => {
    resolveLoad({});
  });
  expect(latest.ready).toBe(true);
});

test('setScore accepts valid scores 1..5 on a past date and persists', async () => {
  await renderHook();

  for (const score of [1, 2, 3, 4, 5] as const) {
    const date: DateKey = `2026-06-0${score}`;
    await act(async () => {
      latest.setScore(date, score);
    });
    expect(latest.entries[date]).toBe(score);
  }

  expect(mockedSave).toHaveBeenCalled();
  const lastSaved = mockedSave.mock.calls[mockedSave.mock.calls.length - 1][0];
  expect(lastSaved).toEqual(latest.entries);
});

test('setScore accepts today (not a future date)', async () => {
  await renderHook();

  await act(async () => {
    latest.setScore(TODAY, 3);
  });

  expect(latest.entries[TODAY]).toBe(3);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

test('setScore ignores non-integer, 0, and 6 without saving', async () => {
  await renderHook();

  const invalid = [0, 6, 2.5, -1, Number.NaN] as unknown as number[];
  for (const score of invalid) {
    await act(async () => {
      latest.setScore('2026-06-05', score as never);
    });
  }

  expect(latest.entries).toEqual({});
  expect(mockedSave).not.toHaveBeenCalled();
});

test('setScore ignores future dates without calling saveEntries', async () => {
  await renderHook();

  await act(async () => {
    latest.setScore('2026-06-11', 4);
  });

  expect(latest.entries).toEqual({});
  expect(mockedSave).not.toHaveBeenCalled();
});

test('clearScore removes an existing date and persists', async () => {
  mockedLoad.mockResolvedValue({ '2026-06-08': 4, '2026-06-09': 2 });
  await renderHook();

  await act(async () => {
    latest.clearScore('2026-06-08');
  });

  expect(latest.entries).toEqual({ '2026-06-09': 2 });
  expect(mockedSave).toHaveBeenCalledWith({ '2026-06-09': 2 });
});

test('clearScore on a missing date keeps the same reference and does not save', async () => {
  mockedLoad.mockResolvedValue({ '2026-06-08': 4 });
  await renderHook();
  const before = latest.entries;

  await act(async () => {
    latest.clearScore('2026-06-01');
  });

  expect(latest.entries).toBe(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('fire is derived from entries and today via computeFire', async () => {
  const saved: Entries = { '2026-06-08': 3, '2026-06-09': 5 };
  mockedLoad.mockResolvedValue(saved);
  await renderHook();

  expect(latest.fire).toEqual(computeFire(saved, TODAY));

  await act(async () => {
    latest.setScore(TODAY, 4);
  });

  expect(latest.fire).toEqual(
    computeFire({ ...saved, [TODAY]: 4 }, TODAY),
  );
});

test('saved data round-trips: saveEntries receives exactly the loaded plus changed data', async () => {
  const saved: Entries = { '2026-06-07': 2 };
  mockedLoad.mockResolvedValue(saved);
  await renderHook();

  await act(async () => {
    latest.setScore('2026-06-08', 5);
  });

  const persisted = mockedSave.mock.calls[0][0];
  expect(persisted).toEqual({ '2026-06-07': 2, '2026-06-08': 5 });
  expect(latest.entries).toEqual(persisted);
});

test('unmount guard prevents state updates when load resolves after unmount', async () => {
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
  const readyBefore = latest.ready;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    resolveLoad({ '2026-06-08': 4 });
  });

  expect(readyBefore).toBe(false);
  expect(latest.ready).toBe(false);
  expect(latest.entries).toEqual({});
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

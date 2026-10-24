/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * The settings store is mocked so these tests never touch AsyncStorage directly.
 * A tiny probe component exposes hook state through a ref so tests can drive
 * loading, flame selection, and unmount behavior without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

jest.mock('../src/data/settingsStore', () => {
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

jest.mock('../src/domain/flames', () => {
  const actual = jest.requireActual('../src/domain/flames');
  return {
    ...actual,
    flameById: jest.fn(actual.flameById),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;
const mockedFlameById = flameById as jest.MockedFunction<typeof flameById>;

let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result in a module-level variable so tests
// can read state and call setFlameStyle directly.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act() so effects and pending state updates flush.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Build a deferred promise so a test can control exactly when loadSettings resolves.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockedSave.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load resolves', () => {
    const pending = deferred<Settings>();
    mockedLoad.mockReturnValueOnce(pending.promise);

    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    // Resolve afterwards so the pending promise doesn't leak past the test.
    act(() => {
      pending.resolve({ ...DEFAULT_SETTINGS });
    });
  });

  test('sets loaded settings and ready=true once loadSettings resolves', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
    mockedLoad.mockResolvedValueOnce(loaded);

    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('setFlameStyle with a valid catalog id updates state and saves the next settings', async () => {
    await renderProbe();
    const nextId = 'crimson' as FlameId;

    await act(async () => {
      latest.setFlameStyle(nextId);
    });

    expect(latest.settings.flameStyle).toBe(nextId);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: nextId });
  });

  test('setFlameStyle with an unknown id is ignored and does not save', async () => {
    await renderProbe();
    const before = latest.settings;
    const bogus = 'not-a-real-flame' as FlameId;
    // Simulate the catalog resolving the unknown id to a different (base) flame.
    mockedFlameById.mockReturnValueOnce({ ...flameById('amber' as FlameId), id: 'amber' as FlameId });

    await act(async () => {
      latest.setFlameStyle(bogus);
    });

    expect(latest.settings).toBe(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('unmounting before load resolves does not set state', async () => {
    const pending = deferred<Settings>();
    mockedLoad.mockReturnValueOnce(pending.promise);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const stale = latest;
    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      pending.resolve({ ...DEFAULT_SETTINGS, flameStyle: 'sapphire' as FlameId });
      await pending.promise;
    });

    // The late resolution must not update the (unmounted) hook state.
    expect(stale.ready).toBe(false);
    expect(stale.settings).toEqual(DEFAULT_SETTINGS);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

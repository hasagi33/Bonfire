/**
 * useSettings.test.tsx — hook tests for user preferences (the active flame style).
 *
 * The settings store is mocked so no real AsyncStorage is touched. A tiny probe
 * component exposes hook state through module-level variables so tests can drive
 * loading, flame selection, and unmounting without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

// Replace the persistence layer with Jest mocks; DEFAULT_SETTINGS is kept real.
jest.mock('../src/data/settingsStore', () => {
  const actual = jest.requireActual<typeof import('../src/data/settingsStore')>(
    '../src/data/settingsStore',
  );
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

let latest: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: renders the hook and copies its result into `latest`.
function Probe() {
  const api = useSettings();
  latest = api;
  return <Text>{api.settings.flameStyle}</Text>;
}

// Pick a real catalog id that is not the default so we can observe a change.
function pickNonDefaultFlame(): FlameId {
  const fallback = flameById('nonexistent' as FlameId).id;
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(id => id !== fallback);
  return candidate ?? fallback;
}

// Creates a deferred promise so tests can control exactly when loadSettings resolves.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSave.mockResolvedValue(undefined);
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load resolves', async () => {
    const gate = deferred<Settings>();
    mockedLoad.mockReturnValueOnce(gate.promise);

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    // Resolve the load so the pending effect finishes inside act.
    await act(async () => {
      gate.resolve({ ...DEFAULT_SETTINGS });
      await gate.promise;
    });
  });

  test('applies loaded settings and flips ready to true', async () => {
    const flame = pickNonDefaultFlame();
    mockedLoad.mockResolvedValueOnce({ ...DEFAULT_SETTINGS, flameStyle: flame });

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings.flameStyle).toBe(flame);
  });

  test('setFlameStyle with a real catalog id updates state and saves deep-equal data', async () => {
    const flame = pickNonDefaultFlame();

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    await act(async () => {
      latest.setFlameStyle(flame);
    });

    expect(latest.settings.flameStyle).toBe(flame);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: flame });
  });

  test('setFlameStyle with an unknown id is ignored and does not save', async () => {
    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const before = latest.settings;

    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toBe(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a save failure does not break state updates', async () => {
    const flame = pickNonDefaultFlame();
    mockedSave.mockRejectedValueOnce(new Error('disk full'));

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    await act(async () => {
      latest.setFlameStyle(flame);
    });

    expect(latest.settings.flameStyle).toBe(flame);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test('unmount guard prevents state updates when load resolves after unmount', async () => {
    const gate = deferred<Settings>();
    mockedLoad.mockReturnValueOnce(gate.promise);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const snapshot = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      gate.resolve({ ...DEFAULT_SETTINGS, flameStyle: pickNonDefaultFlame() });
      await gate.promise;
    });

    // The late load must not have flipped ready or replaced settings.
    expect(snapshot.ready).toBe(false);
    expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

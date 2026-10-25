/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through props so tests can wait for
 * the initial load and drive setFlameStyle without native UI. The settings store
 * is mocked so no real AsyncStorage is touched and results are deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the storage-backed module with jest mocks; DEFAULT_SETTINGS is kept
// as a plain copy of the real shape so the hook's initial state is exercised.
jest.mock('../src/data/settingsStore', () => {
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result in a module-level variable so tests
// can read the latest state and call its setters.
function Probe() {
  latest = useSettings();
  return <Text>{latest.settings.flameStyle}</Text>;
}

// Render the probe and let any pending promise (the mocked load) settle inside act.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Resolve loadSettings with the given value and flush effects.
function resolveLoad(value: Settings) {
  mockedLoad.mockResolvedValue(value);
}

beforeEach(() => {
  jest.clearAllMocks();
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
  test('starts with DEFAULT_SETTINGS and ready=false before the load resolves', async () => {
    // Never-resolving load keeps the hook in its pre-load state.
    mockedLoad.mockReturnValue(new Promise(() => {}));

    await renderProbe();

    expect(latest.ready).toBe(false);
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  });

  test('becomes ready with the loaded settings once loadSettings resolves', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
    resolveLoad(loaded);

    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('setFlameStyle with a real catalog id updates the style and persists it', async () => {
    resolveLoad({ ...DEFAULT_SETTINGS });
    await renderProbe();

    act(() => {
      latest.setFlameStyle('crimson' as FlameId);
    });

    expect(latest.settings.flameStyle).toBe('crimson');
    expect(mockedSave).toHaveBeenCalledTimes(1);
    // Deep equality: the saved payload is the full settings object with the new style.
    expect(mockedSave).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      flameStyle: 'crimson',
    });
  });

  test('setFlameStyle with an unknown id leaves state unchanged and does not save', async () => {
    resolveLoad({ ...DEFAULT_SETTINGS });
    await renderProbe();
    const before = latest.settings;

    act(() => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failed save does not throw or revert the in-memory style', async () => {
    // Persistence is fire-and-forget: a write failure must not block the UI.
    mockedSave.mockRejectedValue(new Error('disk full'));
    resolveLoad({ ...DEFAULT_SETTINGS });
    await renderProbe();

    expect(() => {
      act(() => {
        latest.setFlameStyle('crimson' as FlameId);
      });
    }).not.toThrow();

    await act(async () => {});
    expect(latest.settings.flameStyle).toBe('crimson');
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test('ignores a load that resolves after unmount', async () => {
    let resolve!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(r => {
        resolve = r;
      }),
    );
    await renderProbe();

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    // Resolving after unmount must not trigger a state update (no throw, no warning path).
    await act(async () => {
      resolve({ ...DEFAULT_SETTINGS, flameStyle: 'sapphire' as FlameId });
    });

    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(latest.ready).toBe(false);
  });
});

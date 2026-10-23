/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through a ref so tests can read
 * the latest value and drive setFlameStyle. The settings store is mocked so
 * AsyncStorage is never touched and the tests stay deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the settings store with jest mocks so no storage is ever read or written.
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

// The hook's latest return value, updated by the probe on every render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and copies its result into `latest`.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act() and let pending promises (the load) settle.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  latest = undefined as unknown as UseSettings;
  // Default: loading resolves immediately with the defaults.
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockedSave.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load resolves', async () => {
    // Keep the load pending so we can observe the initial render.
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS });
    });
  });

  test('flips ready to true and adopts the loaded settings', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: DEFAULT_SETTINGS.flameStyle };
    mockedLoad.mockResolvedValueOnce(loaded);

    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('setFlameStyle with a valid catalog id updates state and saves the new settings', async () => {
    await renderProbe();
    const target = 'crimson' as FlameId;

    await act(async () => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
  });

  test('setFlameStyle with an unknown id leaves state unchanged and does not save', async () => {
    await renderProbe();
    const before = latest.settings;

    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('round-trip: saved settings deep-equal what loads back on the next mount', async () => {
    await renderProbe();
    const target = 'sapphire' as FlameId;

    await act(async () => {
      latest.setFlameStyle(target);
    });

    const saved = mockedSave.mock.calls[0][0];
    // Simulate a fresh launch that loads what was persisted.
    act(() => {
      rendered?.unmount();
    });
    rendered = null;
    mockedLoad.mockResolvedValueOnce(saved);

    await renderProbe();

    expect(latest.settings).toEqual(saved);
    expect(latest.settings.flameStyle).toBe(target);
  });

  test('unmounting before load resolves does not set state', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const snapshot = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    // Resolving after unmount must not trigger a state update (the guard flag).
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId });
    });

    expect(latest).toBe(snapshot);
    expect(snapshot.ready).toBe(false);
  });
});

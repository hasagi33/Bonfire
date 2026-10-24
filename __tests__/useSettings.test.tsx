/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * The settings store is mocked so AsyncStorage is never touched directly.
 * A tiny probe component exposes hook state through a module-level variable
 * so tests can read settings and call setFlameStyle without native UI.
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

jest.mock('../src/data/settingsStore', () => {
  const defaults = { flameStyle: 'amber' };
  return {
    DEFAULT_SETTINGS: defaults,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

// Latest hook result, updated by the probe on every render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: mounts the hook and publishes its return value.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act so effects and pending promises settle.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  latest = undefined as unknown as UseSettings;
  // Default: loading resolves to the defaults unless a test overrides it.
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS } as Settings);
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
    // Keep the load pending so we can observe the initial state.
    let resolveLoad: (value: Settings) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS } as Settings);
    });
    expect(latest.ready).toBe(true);
  });

  test('flips ready to true after loadSettings resolves', async () => {
    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
  });

  test('replaces defaults with loaded settings', async () => {
    const loaded = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' } as Settings;
    mockedLoad.mockResolvedValue(loaded);

    await renderProbe();

    expect(latest.settings).toEqual(loaded);
    expect(latest.settings.flameStyle).toBe('crimson');
  });

  test('setFlameStyle with a valid catalog id updates state and calls saveSettings', async () => {
    await renderProbe();
    const target: FlameId = 'crimson';
    expect(flameById(target).id).toBe(target);

    await act(async () => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ flameStyle: target }),
    );
  });

  test('setFlameStyle with an unknown id is ignored and does not call saveSettings', async () => {
    await renderProbe();
    const before = latest.settings;

    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failing saveSettings does not throw or block the UI state update', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();

    await act(async () => {
      latest.setFlameStyle('sapphire');
    });

    expect(latest.settings.flameStyle).toBe('sapphire');
  });

  test('round-trip: saved settings deep-equal what loadSettings returns', async () => {
    const saved: Settings[] = [];
    mockedSave.mockImplementation(async (next: Settings) => {
      saved.push(JSON.parse(JSON.stringify(next)) as Settings);
    });

    await renderProbe();
    await act(async () => {
      latest.setFlameStyle('sapphire');
    });

    expect(saved).toHaveLength(1);
    // Simulate a fresh app launch reading back what was persisted.
    mockedLoad.mockResolvedValue(saved[0]);
    act(() => {
      rendered?.unmount();
    });
    rendered = null;
    await renderProbe();

    expect(latest.settings).toEqual(saved[0]);
  });
});

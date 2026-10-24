/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched directly. A tiny
 * probe component exposes hook state through a ref so tests can drive loading and
 * flame style changes without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the store module so no real AsyncStorage access happens.
// DEFAULT_SETTINGS is kept as the real value from the original module.
jest.mock('../src/data/settingsStore', () => {
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoadSettings = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSaveSettings = saveSettings as jest.MockedFunction<typeof saveSettings>;

// Holds the most recent hook result so tests can read state and call actions.
let latest: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: runs the hook and copies its return value out for the tests.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  });
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe and flushes pending promise callbacks from loadSettings.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// A valid, unlocked-by-default catalog id other than the default Amber.
const OTHER_FLAME = 'crimson' as FlameId;

beforeEach(() => {
  jest.clearAllMocks();
  mockedSaveSettings.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings initial load', () => {
  test('starts with DEFAULT_SETTINGS and ready=false until load resolves', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoadSettings.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: OTHER_FLAME };
    await act(async () => {
      resolveLoad(loaded);
    });

    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('sets ready=true with the loaded settings once load resolves', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: OTHER_FLAME };
    mockedLoadSettings.mockResolvedValue(loaded);

    await renderProbe();

    expect(mockedLoadSettings).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('ignores a load that resolves after unmount', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoadSettings.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await renderProbe();
    const before = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: OTHER_FLAME });
    });

    // Hook state should not have changed after unmount.
    expect(latest).toBe(before);
    expect(before.ready).toBe(false);
  });
});

describe('setFlameStyle', () => {
  test('updates settings.flameStyle and saves deep-equal data for a valid id', async () => {
    mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();

    await act(async () => {
      latest.setFlameStyle(OTHER_FLAME);
    });

    expect(latest.settings.flameStyle).toBe(OTHER_FLAME);
    expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
    expect(mockedSaveSettings).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      flameStyle: OTHER_FLAME,
    });
  });

  test('leaves state unchanged and does not save for an unknown id', async () => {
    mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();
    const before = latest.settings;

    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSaveSettings).not.toHaveBeenCalled();
  });

  test('swallows save failures so the UI is not blocked', async () => {
    mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    mockedSaveSettings.mockRejectedValue(new Error('disk full'));
    await renderProbe();

    await act(async () => {
      latest.setFlameStyle(OTHER_FLAME);
    });

    expect(latest.settings.flameStyle).toBe(OTHER_FLAME);
    expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
  });
});

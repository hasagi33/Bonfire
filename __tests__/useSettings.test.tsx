/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * The settings store is mocked so AsyncStorage is never touched. A tiny probe
 * component exposes hook state through a ref so tests can drive load completion,
 * unmounting, and flame selection without native UI.
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

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

// The probe writes the latest hook result here so assertions can read it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe inside act so effects and pending state updates are flushed.
function renderProbe() {
  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Picks a catalog id that differs from the default so a change is observable.
function otherFlameId(): FlameId {
  const base = DEFAULT_SETTINGS.flameStyle;
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(id => id !== base);
  if (!candidate) {
    throw new Error('test setup: no alternate flame id available');
  }
  return candidate;
}

beforeEach(() => {
  jest.clearAllMocks();
  latest = undefined as unknown as UseSettings;
  mockedSave.mockResolvedValue(undefined);
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings initial state', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load resolves', () => {
    // Never resolve the load so the hook stays in its pre-load state.
    mockedLoad.mockReturnValue(new Promise(() => {}));
    renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);
  });

  test('calls loadSettings exactly once on mount', () => {
    renderProbe();
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });
});

describe('useSettings loading', () => {
  test('reflects the loaded value and sets ready=true after load resolves', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: otherFlameId() };
    mockedLoad.mockResolvedValue(loaded);

    await act(async () => {
      renderProbe();
    });

    expect(latest.settings).toEqual(loaded);
    expect(latest.ready).toBe(true);
  });

  test('does not set state when unmounted before load resolves', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderProbe();
    const snapshot = latest;
    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: otherFlameId() });
    });

    // Nothing rendered after unmount, so the probe's last value is unchanged.
    expect(latest).toBe(snapshot);
    expect(latest.ready).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('useSettings.setFlameStyle', () => {
  test('updates flameStyle and persists the deep-equal next settings for a valid id', async () => {
    await act(async () => {
      renderProbe();
    });
    const target = otherFlameId();

    act(() => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
  });

  test('leaves state unchanged and does not persist for an unknown id', async () => {
    await act(async () => {
      renderProbe();
    });
    const before = latest.settings;
    const bogus = 'not-a-real-flame' as FlameId;
    expect(flameById(bogus).id).not.toBe(bogus);

    act(() => {
      latest.setFlameStyle(bogus);
    });

    expect(latest.settings).toEqual(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows a save failure without throwing or altering state', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await act(async () => {
      renderProbe();
    });
    const target = otherFlameId();

    expect(() => {
      act(() => {
        latest.setFlameStyle(target);
      });
    }).not.toThrow();

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

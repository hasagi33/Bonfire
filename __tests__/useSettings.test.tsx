/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through a mutable ref so tests can
 * drive setFlameStyle and observe the result. The settings store is mocked so
 * no real AsyncStorage is touched, keeping every test deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { flameById } from '../src/domain/flames';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';

// Replace the persistence layer with jest mocks. Keep the real DEFAULT_SETTINGS
// so the initial-state assertions compare against the true default values.
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

// The probe writes the latest hook result into this holder on every render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Create the probe inside act() and flush pending promise resolutions so the
// mocked load has a chance to finish before assertions run.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  // Default: the saved settings equal the defaults, and every save succeeds.
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

describe('useSettings initial load', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before the load resolves', () => {
    // Hold the load promise open so we can observe the pre-load state.
    mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));
    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);
  });

  test('becomes ready with the default settings when the load returns defaults', async () => {
    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  });

  test('reflects the loaded value when it differs from the defaults', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as Settings['flameStyle'] };
    mockedLoad.mockResolvedValue(loaded);

    await renderProbe();

    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });
});

describe('setFlameStyle', () => {
  test('updates flameStyle and saves the full next settings object', async () => {
    await renderProbe();
    const target = 'crimson' as Settings['flameStyle'];

    act(() => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    // The saved payload must be the complete settings object, not a partial patch.
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
    expect(mockedSave.mock.calls[0][0]).toEqual(latest.settings);
  });

  test('ignores an unknown flame id: state unchanged and no save', async () => {
    await renderProbe();
    const before = latest.settings;
    const bogus = 'not-a-real-flame' as Settings['flameStyle'];

    // Sanity check: the bogus id really does fall back to the base flame.
    expect(flameById(bogus).id).not.toBe(bogus);

    act(() => {
      latest.setFlameStyle(bogus);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).not.toBe(bogus);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows a save failure so the UI state still updates', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();
    const target = 'crimson' as Settings['flameStyle'];

    await act(async () => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

describe('unmount guard', () => {
  test('does not update state when the load resolves after unmount', async () => {
    // Resolve the load only after we have unmounted the probe.
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const snapshot = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: 'crimson' as Settings['flameStyle'] });
    });

    // The late load must not push new values into the hook after unmount.
    expect(latest).toBe(snapshot);
    expect(latest.ready).toBe(false);
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    spy.mockRestore();
  });
});

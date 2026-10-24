/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * The settings store is mocked so AsyncStorage is never touched directly.
 * A small probe component exposes hook state through a ref so tests can read
 * `settings`/`ready` and call `setFlameStyle` without native UI.
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
import { FLAMES, type FlameId } from '../src/domain/flames';

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

// Latest hook result, updated by the probe on every render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const hook = useSettings();
  latest = hook;
  return <Text>{hook.settings.flameStyle}</Text>;
}

// Render the probe inside act so effects and the load promise settle.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
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
  test('starts with DEFAULT_SETTINGS and ready=false, then flips ready after load', async () => {
    // Hold the load open so we can observe the pre-load state.
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

    expect(latest.ready).toBe(true);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  test('replaces defaults with loaded settings once load resolves', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: FLAMES[1].id };
    mockedLoad.mockResolvedValueOnce(loaded);

    await renderProbe();

    expect(latest.settings).toEqual(loaded);
    expect(latest.ready).toBe(true);
  });

  test('setFlameStyle with a valid catalog id updates state and saves the next object', async () => {
    await renderProbe();

    const target: FlameId = FLAMES[1].id;
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

  test('unmounting before load resolves does not set state', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValueOnce(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const seen = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: FLAMES[1].id });
    });

    // Hook state captured before unmount must not have been updated afterwards.
    expect(seen.ready).toBe(false);
    expect(seen.settings).toEqual(DEFAULT_SETTINGS);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * settingsStore is mocked so no real AsyncStorage is touched. A tiny probe
 * component exposes hook state through a module-level variable so tests can
 * wait for the async load and call setFlameStyle without native UI.
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
import type { FlameId } from '../src/domain/flames';

// Replace the store module with jest mocks; DEFAULT_SETTINGS is kept real.
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

// The probe stores the latest hook result here so tests can read it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe and flush pending effects and promise callbacks.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
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
  test('starts with DEFAULT_SETTINGS and becomes ready once the load resolves', async () => {
    // Hold the load open so we can observe the pre-load state first.
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
    await act(async () => {
      resolveLoad(loaded);
    });

    expect(latest.settings).toEqual(loaded);
    expect(latest.ready).toBe(true);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  test('setFlameStyle with a valid catalog id updates the style and saves the next settings', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();

    const target = 'crimson' as FlameId;
    await act(async () => {
      latest.setFlameStyle(target);
    });

    const expected: Settings = { ...DEFAULT_SETTINGS, flameStyle: target };
    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith(expected);
  });

  test('setFlameStyle with an unknown id is ignored and does not save', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();

    const bogus = 'not-a-real-flame' as FlameId;
    await act(async () => {
      latest.setFlameStyle(bogus);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

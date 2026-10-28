/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so no AsyncStorage is touched. A tiny probe
 * component exposes hook state through a ref so tests can drive `setFlameStyle`
 * and inspect `settings` / `ready` without native UI.
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
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

// The most recent hook result seen by the probe component.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: renders the hook and copies its result out for assertions.
function Probe() {
  const result = useSettings();
  latest = result;
  return <Text>{result.settings.flameStyle}</Text>;
}

// Renders the probe and flushes pending effects and promise callbacks.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Pick a real catalog id that is not the default so the change is observable.
function nonDefaultFlameId(): FlameId {
  const base = DEFAULT_SETTINGS.flameStyle;
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(id => id !== base);
  if (!candidate) {
    throw new Error('expected a non-default catalog flame id');
  }
  return candidate;
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
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
  test('starts with defaults and ready=false, then becomes ready after load', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockImplementation(
      () =>
        new Promise<Settings>(resolve => {
          resolveLoad = resolve;
        }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    // Before the load resolves, the hook exposes defaults and is not ready.
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    await act(async () => {
      resolveLoad(loaded);
    });

    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('setFlameStyle with a real catalog id updates state and saves deep-equal data', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();

    const target = nonDefaultFlameId();
    await act(async () => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
  });

  test('setFlameStyle with an unknown id leaves state unchanged and does not save', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();

    const before = latest.settings;
    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a rejected save does not break state or surface an error', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();

    const target = nonDefaultFlameId();
    await act(async () => {
      latest.setFlameStyle(target);
    });
    await act(async () => {});

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test('setFlameStyle resolves to a catalog entry whose id matches the request', () => {
    const target = nonDefaultFlameId();
    expect(flameById(target).id).toBe(target);
  });
});

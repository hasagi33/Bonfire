/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched directly.
 * A tiny probe component exposes hook state through a ref so tests can drive
 * loading and flame-style changes without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the settings store with jest mocks; DEFAULT_SETTINGS stays real.
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

// Probe component: stores the latest hook result so tests can read and call it.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  });
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act() so effects and pending promises settle.
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

test('starts with DEFAULT_SETTINGS and ready=false before load resolves', async () => {
  // Keep the load pending so we can observe the initial state.
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
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
    resolveLoad(DEFAULT_SETTINGS);
  });
});

test('flips ready to true and adopts the loaded settings', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and persists deep-equal data', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();

  const target = 'crimson' as FlameId;
  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id leaves settings unchanged and skips saving', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();

  const before = latest.settings;
  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a failing save does not throw or revert the in-memory style', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();

  const target = 'crimson' as FlameId;
  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

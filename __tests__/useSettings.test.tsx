/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched. A tiny probe
 * component exposes hook state through a ref so tests can drive the hook and
 * inspect `settings`, `ready`, and `setFlameStyle` without native UI.
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

// Replace the real store so no AsyncStorage calls happen during tests.
// DEFAULT_SETTINGS is preserved from the real module so its shape stays accurate.
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

// Holds the most recent hook result so tests can read and call it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Minimal component that runs the hook and publishes its result.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act() so effects and state updates flush.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Deferred promise helper: lets a test control exactly when loadSettings resolves.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
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

test('starts with DEFAULT_SETTINGS and ready=false while loading', async () => {
  // Keep the load pending so we can observe the initial state.
  mockedLoad.mockReturnValue(deferred<Settings>().promise);

  await renderProbe();

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);
});

test('flips ready to true and adopts the loaded settings', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();
  await act(async () => {});

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and persists the deep-equal next settings', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();
  await act(async () => {});

  const target = 'crimson' as FlameId;
  act(() => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id is ignored and does not save', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();
  await act(async () => {});

  const before = latest.settings;
  act(() => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('does not set state when unmounted before the load resolves', async () => {
  const pending = deferred<Settings>();
  mockedLoad.mockReturnValue(pending.promise);

  await renderProbe();
  const stale = latest;

  // Unmount while loadSettings is still pending.
  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  // Resolve after unmount; the active guard must prevent a state update.
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  await act(async () => {
    pending.resolve({ ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId });
  });

  expect(errorSpy).not.toHaveBeenCalled();
  expect(stale.ready).toBe(false);
  expect(stale.settings).toEqual(DEFAULT_SETTINGS);
  errorSpy.mockRestore();
});

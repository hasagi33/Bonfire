/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * The settings store is mocked so AsyncStorage is never touched directly.
 * A small probe component exposes hook state through a ref so tests can
 * drive setFlameStyle and unmount behavior without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

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

// Holds the most recent hook result so tests can read state and call actions.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  });
  return <Text>{value.ready ? 'ready' : 'loading'}</Text>;
}

// Renders the probe and flushes pending effects and promise callbacks.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Returns a deferred promise so a test can resolve loadSettings on demand.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
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

test('starts with DEFAULT_SETTINGS and ready=false before load resolves', () => {
  const pending = deferred<Settings>();
  mockedLoad.mockReturnValueOnce(pending.promise);

  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);

  // Resolve afterwards so the pending promise doesn't leak past this test.
  act(() => {
    pending.resolve({ ...DEFAULT_SETTINGS });
  });
});

test('becomes ready with the loaded settings after loadSettings resolves', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  mockedLoad.mockResolvedValueOnce(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and saves next settings', async () => {
  await renderProbe();

  const target = 'crimson' as FlameId;
  act(() => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id leaves state unchanged and does not save', async () => {
  await renderProbe();
  const before = latest.settings;

  act(() => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('unmounting before load resolves does not set state', async () => {
  const pending = deferred<Settings>();
  mockedLoad.mockReturnValueOnce(pending.promise);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  const snapshot = latest;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    pending.resolve({ ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId });
    await pending.promise;
  });

  // The hook's active guard prevents setState after unmount, so the last
  // observed snapshot must still show the pre-load defaults.
  expect(snapshot.ready).toBe(false);
  expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

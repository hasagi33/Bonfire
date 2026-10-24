/**
 * useSettings.test.tsx — hook tests for the persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched directly. A tiny
 * probe component exposes hook state through a ref so tests can drive
 * setFlameStyle and inspect the resulting settings without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import { type FlameId } from '../src/domain/flames';

// Replace the store with controllable fakes. DEFAULT_SETTINGS is kept real so
// the hook's initial state matches the production default exactly.
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

// Holds the most recent hook return value so assertions can read it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and mirrors its output into `latest`.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  }, [value]);
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe and flushes pending promises so loadSettings resolves.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// A deferred promise lets a test hold loadSettings pending on purpose.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(r => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  mockedSave.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts with DEFAULT_SETTINGS and ready=false until load resolves', async () => {
  const pending = deferred<Settings>();
  mockedLoad.mockReturnValueOnce(pending.promise);

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  expect(latest.ready).toBe(false);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);

  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  await act(async () => {
    pending.resolve(loaded);
  });

  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('reflects the loadSettings output once ready', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'sapphire' as FlameId };
  mockedLoad.mockResolvedValueOnce(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and persists the next settings', async () => {
  await renderProbe();
  const validId = 'crimson' as FlameId;

  await act(async () => {
    latest.setFlameStyle(validId);
  });

  const expected: Settings = { ...DEFAULT_SETTINGS, flameStyle: validId };
  expect(latest.settings.flameStyle).toBe(validId);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith(expected);
});

test('setFlameStyle with an unknown id leaves state unchanged and does not save', async () => {
  await renderProbe();
  const before = latest.settings;

  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a failing save does not throw or roll back the in-memory selection', async () => {
  mockedSave.mockRejectedValueOnce(new Error('disk full'));
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle('crimson' as FlameId);
  });
  await act(async () => {});

  expect(latest.settings.flameStyle).toBe('crimson');
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

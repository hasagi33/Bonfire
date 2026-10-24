/**
 * useSettings.test.tsx — hook tests for the persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched directly and
 * the suite stays deterministic. A small probe component exposes the hook's
 * state through a mutable holder so each test can drive load, update, and
 * unmount behavior without native UI.
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

// Replace the real store with jest mocks; keep DEFAULT_SETTINGS as the real value.
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

// Holds the most recent hook return value so tests can read and call it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Minimal component that mounts the hook and publishes its result.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe and flush pending promises (the initial load) inside act.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Pick a catalog id that is not the default so updates are observable.
function nonDefaultFlameId(): FlameId {
  const candidate = flameById('crimson' as FlameId);
  return candidate.id;
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

test('starts with DEFAULT_SETTINGS and becomes ready after load resolves', async () => {
  // Hold the load open so we can observe the pre-load state.
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
    resolveLoad({ ...DEFAULT_SETTINGS });
  });
  expect(latest.ready).toBe(true);
});

test('loaded settings replace the defaults', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();

  expect(latest.settings).toEqual(loaded);
  expect(latest.settings.flameStyle).toBe(nonDefaultFlameId());
  expect(latest.ready).toBe(true);
});

test('setFlameStyle with a valid catalog id updates the style and persists it', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  const target = nonDefaultFlameId();
  act(() => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id leaves settings unchanged and does not save', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  const before = latest.settings;
  act(() => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('unmounting before load resolves does not set state', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  const snapshot = latest;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  // Resolving after unmount must not update the captured state.
  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() });
  });

  expect(snapshot.ready).toBe(false);
  expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
});

/**
 * useSettings.test.tsx — hook tests for user preferences (the active flame style).
 *
 * The settings store is mocked so no real AsyncStorage is touched. A tiny probe
 * component exposes hook state through a module-level variable so tests can
 * read `settings`/`ready` and call `setFlameStyle` inside `act`.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

jest.mock('../src/data/settingsStore', () => {
  // Keep the real DEFAULT_SETTINGS shape while replacing the storage functions
  // with mocks, so no AsyncStorage access happens during tests.
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoadSettings = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSaveSettings = saveSettings as jest.MockedFunction<typeof saveSettings>;

// Latest hook value seen by the probe component.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component that mounts the hook and publishes its return value.
function Probe() {
  latest = useSettings();
  return null;
}

// Helper to create a deferred promise so tests control when loadSettings resolves.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSaveSettings.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts with DEFAULT_SETTINGS and becomes ready once loadSettings resolves', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  const pending = deferred<Settings>();
  mockedLoadSettings.mockReturnValue(pending.promise);

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  // Before the load resolves, the hook should expose the defaults and not be ready.
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);

  await act(async () => {
    pending.resolve(loaded);
    await pending.promise;
  });

  expect(latest.settings).toEqual(loaded);
  expect(latest.ready).toBe(true);
});

test('setFlameStyle with a valid catalog id updates the style and persists it', async () => {
  mockedLoadSettings.mockResolvedValue(DEFAULT_SETTINGS);

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  const target = 'sapphire' as FlameId;
  act(() => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
  expect(mockedSaveSettings).toHaveBeenCalledWith({
    ...DEFAULT_SETTINGS,
    flameStyle: target,
  });
});

test('setFlameStyle with an unknown id leaves state and storage untouched', async () => {
  mockedLoadSettings.mockResolvedValue(DEFAULT_SETTINGS);

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  const before = latest.settings;
  act(() => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toBe(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSaveSettings).not.toHaveBeenCalled();
});

test('unmounting before loadSettings resolves does not set state', async () => {
  const pending = deferred<Settings>();
  mockedLoadSettings.mockReturnValue(pending.promise);
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

  await act(async () => {
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

  // The hook's state must not have been updated after unmount.
  expect(snapshot.ready).toBe(false);
  expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

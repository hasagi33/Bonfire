/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched directly. A tiny
 * probe component exposes hook state through a mutable reference so tests can
 * drive the initial load, flame selection, and unmount behavior without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the storage-backed store with jest mocks; keep DEFAULT_SETTINGS real.
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

// Probe component: mounts the hook and copies its return value into `latest`.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act() and flush the pending load promise.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Pick a flame id that exists in the catalog and differs from the default.
function otherFlameId(): FlameId {
  const candidate = 'crimson' as FlameId;
  return candidate === DEFAULT_SETTINGS.flameStyle ? ('sapphire' as FlameId) : candidate;
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  mockedSave.mockResolvedValue(undefined);
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('initial load sets ready to true and uses loaded settings', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: otherFlameId() };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('starts with defaults and ready false before the load resolves', () => {
  mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));

  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  expect(latest.ready).toBe(false);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
});

test('setFlameStyle with a valid catalog id updates state and saves the new object', async () => {
  await renderProbe();
  const id = otherFlameId();

  await act(async () => {
    latest.setFlameStyle(id);
  });

  expect(latest.settings.flameStyle).toBe(id);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: id });
});

test('setFlameStyle with an unknown id is ignored and does not save', async () => {
  await renderProbe();
  const before = latest.settings;

  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a failed save does not throw or revert the UI state', async () => {
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();
  const id = otherFlameId();

  await act(async () => {
    latest.setFlameStyle(id);
  });

  expect(latest.settings.flameStyle).toBe(id);
});

test('unmount guard prevents state updates when the load resolves late', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );
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
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: otherFlameId() });
  });

  // The hook's state must not have changed after unmount.
  expect(latest).toBe(snapshot);
  expect(snapshot.ready).toBe(false);
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

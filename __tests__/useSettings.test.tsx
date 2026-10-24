/**
 * useSettings.test.tsx — hook tests for the user settings hook.
 *
 * A tiny probe component exposes hook state through props so tests can verify
 * the initial load, flame style updates, and rejection of unknown flame ids.
 * The settings store is mocked so AsyncStorage is never touched directly.
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

// Replace the settings store with jest mocks. DEFAULT_SETTINGS is passed through
// unchanged so tests compare against the real default values.
jest.mock('../data/settingsStore', () => {
  const actual = jest.requireActual('../data/settingsStore');
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

// Probe component: stores the hook result in a module variable so tests can
// read and drive it directly.
function Probe() {
  const hook = useSettings();
  latest = hook;
  return <Text>{hook.settings.flameStyle}</Text>;
}

// Render the probe inside act() so pending effects and state updates flush
// before assertions run.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
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
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'amber' as FlameId };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();
  // The mocked load resolves in a microtask, so the probe has settled by now.
  await act(async () => {});

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('reports DEFAULT_SETTINGS and ready=false before the load completes', async () => {
  // Never-resolving promise keeps the hook in its loading state.
  mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));

  await renderProbe();

  expect(latest.ready).toBe(false);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
});

test('setFlameStyle with a valid catalog id updates the style and persists the full object', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();
  await act(async () => {});

  const crimson = 'crimson' as FlameId;
  act(() => {
    latest.setFlameStyle(crimson);
  });

  expect(latest.settings.flameStyle).toBe(crimson);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  // Persisted object must be the complete settings, not just the changed field.
  expect(mockedSave).toHaveBeenCalledWith({
    ...DEFAULT_SETTINGS,
    flameStyle: crimson,
  });
  expect(mockedSave.mock.calls[0][0]).toEqual({
    ...DEFAULT_SETTINGS,
    flameStyle: crimson,
  });
});

test('setFlameStyle with an unknown id leaves settings unchanged and does not persist', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();
  await act(async () => {});

  const before = latest.settings;
  act(() => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a failing save does not throw or revert the in-memory style', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();
  await act(async () => {});

  const crimson = 'crimson' as FlameId;
  expect(() => {
    act(() => {
      latest.setFlameStyle(crimson);
    });
  }).not.toThrow();

  // Persistence is fire-and-forget, so the UI keeps the new style.
  expect(latest.settings.flameStyle).toBe(crimson);
});

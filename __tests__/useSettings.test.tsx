/**
 * useSettings.test.tsx — hook tests for the persisted flame-style setting.
 *
 * A tiny probe component exposes hook state through a ref so tests can read the
 * latest settings and drive setFlameStyle without native UI. The settings store
 * is mocked so no AsyncStorage or network access occurs, and the store's
 * DEFAULT_SETTINGS is preserved so the initial state matches production.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { flameById, type FlameId } from '../src/domain/flames';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';

// Mock only the persistence functions; keep DEFAULT_SETTINGS and types real.
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

// Probe component: stores the hook result on a shared variable for assertions.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act so effects and the async load settle.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Pick a catalog id that is valid and differs from the default, so changes are observable.
function pickNonDefaultFlame(): FlameId {
  const candidate = flameById('crimson' as FlameId);
  return candidate.id;
}

beforeEach(() => {
  jest.clearAllMocks();
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

test('starts with DEFAULT_SETTINGS and ready=false before load resolves', () => {
  // Hold the load promise open so we can observe the pre-load state.
  mockedLoad.mockReturnValue(new Promise(() => {}));
  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);
});

test('applies loaded settings and flips ready to true', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: pickNonDefaultFlame() };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and saves deep-equal settings', async () => {
  await renderProbe();
  const target = pickNonDefaultFlame();

  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id leaves settings unchanged and does not save', async () => {
  await renderProbe();
  const before = latest.settings;

  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('swallows save failures so the UI state still updates', async () => {
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();
  const target = pickNonDefaultFlame();

  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

/**
 * useSettings.test.tsx — hook tests for the persisted user settings.
 *
 * The settings store is mocked so no real AsyncStorage is touched. A small probe
 * component exposes hook state through a ref so tests can drive loading,
 * flame style changes, and unmount behaviour without native UI.
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

// Holds the most recent hook return value so tests can inspect and drive it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Minimal component that mounts the hook and publishes its result to `latest`.
function Probe() {
  latest = useSettings();
  return null;
}

// Renders the probe inside act() so effects and pending promises flush.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  latest = undefined as unknown as UseSettings;
  mockedSave.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts with DEFAULT_SETTINGS and ready=false before loading resolves', async () => {
  // Never-resolving load keeps the hook in its pre-load state.
  mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));

  await renderProbe();

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);
});

test('becomes ready with the loaded settings once loadSettings resolves', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates the style and persists it', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();

  const target = 'sapphire' as FlameId;
  act(() => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id leaves settings unchanged and does not persist', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();

  const before = latest.settings;
  act(() => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toBe(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('ignores a late loadSettings result after unmount', async () => {
  // Control when the load promise resolves so we can unmount first.
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );

  await renderProbe();
  const unmountedSettings = latest.settings;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  // Resolve after unmount; the active guard must prevent any state update.
  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId });
  });

  expect(latest.settings).toBe(unmountedSettings);
  expect(latest.ready).toBe(false);
});

/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * A tiny probe component exposes hook state through a ref so tests can read
 * the latest settings and drive setFlameStyle without native UI. The settings
 * store module is mocked so AsyncStorage is never touched directly and no
 * real I/O happens.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

// Replace the storage-facing module with jest mocks. DEFAULT_SETTINGS is kept
// real so the initial-state assertions compare against the production value.
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

// The hook's return value is captured here by the probe on every render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and mirrors its result into `latest`.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  });
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe and flushes pending promise callbacks inside act.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Builds a loaded settings object that differs from the defaults so tests can
// tell the loaded value apart from DEFAULT_SETTINGS.
function loadedWith(flameStyle: FlameId): Settings {
  return { ...DEFAULT_SETTINGS, flameStyle };
}

// Picks a flame id that is guaranteed to differ from the default so state
// changes are observable. Falls back to the default id if the catalog has one.
function someOtherFlameId(): FlameId {
  const current = DEFAULT_SETTINGS.flameStyle;
  const other = (Object.keys(flameCatalogIds()) as FlameId[]).find(id => id !== current);
  return other ?? current;
}

// Lists catalog ids by probing flameById for each candidate. Kept local so the
// test does not depend on a particular export shape of the flames module.
function flameCatalogIds(): Record<string, true> {
  const candidates = ['amber', 'crimson', 'sapphire'];
  const found: Record<string, true> = {};
  for (const id of candidates) {
    if (flameById(id as FlameId).id === id) {
      found[id] = true;
    }
  }
  return found;
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
  // Never-resolving load keeps the hook in its pre-load state.
  mockedLoad.mockReturnValue(new Promise(() => {}));

  await renderProbe();

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);
});

test('adopts loaded settings and sets ready=true once load resolves', async () => {
  const stored = loadedWith(someOtherFlameId());
  mockedLoad.mockResolvedValue(stored);

  await renderProbe();
  await act(async () => {});

  expect(latest.settings).toEqual(stored);
  expect(latest.ready).toBe(true);
});

test('setFlameStyle with a valid id updates flameStyle and persists the new object', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();
  await act(async () => {});

  const target = someOtherFlameId();
  act(() => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id leaves state and storage unchanged', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();
  await act(async () => {});

  const before = latest.settings;
  act(() => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toBe(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a save failure does not throw or revert the in-memory state', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();
  await act(async () => {});

  const target = someOtherFlameId();
  act(() => {
    latest.setFlameStyle(target);
  });
  await act(async () => {});

  // Persistence is fire-and-forget, so the UI keeps the new value.
  expect(latest.settings.flameStyle).toBe(target);
});

test('unmounting before load resolves does not set state', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );

  const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
  await renderProbe();
  const snapshot = latest;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    resolveLoad(loadedWith(someOtherFlameId()));
  });

  // The probe was not re-rendered after unmount, so the captured value is the
  // pre-load snapshot and no "state update on unmounted component" warning fires.
  expect(latest).toBe(snapshot);
  expect(latest.ready).toBe(false);
  expect(errors).not.toHaveBeenCalled();
  errors.mockRestore();
});

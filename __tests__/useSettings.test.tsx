/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so no real AsyncStorage or network is touched.
 * A small probe component exposes hook state through a ref so each test can
 * read `settings`/`ready` and call `setFlameStyle` directly.
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

// Replace the real persistence layer with controllable mocks.
// loadSettings resolves to whatever a test sets; saveSettings always succeeds.
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

// Holds the most recent hook result so tests can inspect and drive it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Minimal component that mounts the hook and publishes its result.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe and flush pending promise callbacks inside act().
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Pick a catalog id that differs from the default, so changes are observable.
function nonDefaultFlameId(): FlameId {
  const defaultId = DEFAULT_SETTINGS.flameStyle;
  const candidates: FlameId[] = ['crimson', 'sapphire', 'amber'];
  const pick = candidates.find(id => id !== defaultId);
  if (!pick) {
    throw new Error('no alternate flame id available for test');
  }
  return pick;
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
  // Load never resolves during this check, so the hook stays in its initial state.
  mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));
  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);
});

test('becomes ready with the loaded settings once load resolves', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and persists it', async () => {
  await renderProbe();
  const nextId = nonDefaultFlameId();

  await act(async () => {
    latest.setFlameStyle(nextId);
  });

  expect(latest.settings.flameStyle).toBe(nextId);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith(
    expect.objectContaining({ flameStyle: nextId }),
  );
});

test('setFlameStyle with an unknown id is ignored and does not save', async () => {
  await renderProbe();
  const before = latest.settings;

  // Force an id that the catalog does not recognise; flameById falls back to a base flame.
  const bogus = 'not-a-real-flame' as FlameId;
  expect(flameById(bogus).id).not.toBe(bogus);

  await act(async () => {
    latest.setFlameStyle(bogus);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('unmounting before load resolves does not set state', async () => {
  // Hold the load promise open so we can resolve it after unmounting.
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );

  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  const snapshot = latest;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  // Resolving after unmount must not trigger a state update (the guard blocks it).
  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() });
  });

  expect(snapshot.ready).toBe(false);
  expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
});

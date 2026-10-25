/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through props so tests can observe
 * the initial load, flame style changes, and persistence calls. The settings
 * store is mocked so no real AsyncStorage is touched, keeping runs deterministic.
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

// Pick a known catalog id that differs from the default so changes are visible.
const CATALOG_ID = 'crimson' as FlameId;

let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: copies hook output into `latest` so tests can read it.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  }, [value]);
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe and flush the pending loadSettings promise inside act().
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
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

test('starts with default settings and ready=false until load resolves', async () => {
  // Hold the load promise open so we can observe the pre-load state.
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

  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: CATALOG_ID };
  await act(async () => {
    resolveLoad(loaded);
  });

  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('loads persisted settings on mount and marks ready', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: CATALOG_ID };
  mockedLoad.mockResolvedValue(loaded);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and saves full settings', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle(CATALOG_ID);
  });

  const expected: Settings = { ...DEFAULT_SETTINGS, flameStyle: CATALOG_ID };
  expect(latest.settings.flameStyle).toBe(CATALOG_ID);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith(expected);
  expect(mockedSave.mock.calls[0][0]).toEqual(expected);
});

test('setFlameStyle with an unknown id is ignored', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await renderProbe();

  const bogus = 'not-a-real-flame' as FlameId;
  // Sanity check: the bogus id must not resolve to itself in the catalog.
  expect(flameById(bogus).id).not.toBe(bogus);

  await act(async () => {
    latest.setFlameStyle(bogus);
  });

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a failed save does not throw or block the UI state update', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle(CATALOG_ID);
  });

  expect(latest.settings.flameStyle).toBe(CATALOG_ID);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

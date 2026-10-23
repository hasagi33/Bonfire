/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through props so tests can verify
 * the initial load, flame style updates, validation of unknown ids, and that
 * no state is set after unmount. The settings store is mocked so no real
 * AsyncStorage is touched and the suite stays deterministic.
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

// Replace the persistence layer with jest mocks. The real DEFAULT_SETTINGS
// object is kept so the initial-state assertions match production values.
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

// Probe component: mounts the hook and copies its return value out so tests
// can read state and call actions directly.
function Probe() {
  const hook = useSettings();
  React.useEffect(() => {
    latest = hook;
  });
  return <Text>{hook.settings.flameStyle}</Text>;
}

// Pick a real catalog id that differs from the default so the update is visible.
function otherFlameId(): FlameId {
  const current = DEFAULT_SETTINGS.flameStyle;
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(id => id !== current);
  if (!candidate) {
    throw new Error('test setup: no alternate flame id available');
  }
  return candidate;
}

// Mount the probe inside act() so effects and pending promises are flushed.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
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

test('starts with DEFAULT_SETTINGS and ready=false before load resolves', async () => {
  // Hold the load promise open so we can observe the pre-load state.
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValueOnce(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );

  await renderProbe();

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);

  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS });
  });
});

test('becomes ready and adopts the loaded settings after loadSettings resolves', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: otherFlameId() };
  mockedLoad.mockResolvedValueOnce(loaded);

  await renderProbe();
  await act(async () => {});

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and saves the new settings', async () => {
  await renderProbe();
  await act(async () => {});

  const target = otherFlameId();
  expect(flameById(target).id).toBe(target); // sanity: id is a real catalog entry

  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith(
    expect.objectContaining({ flameStyle: target }),
  );
});

test('setFlameStyle with an unknown id leaves state unchanged and does not save', async () => {
  await renderProbe();
  await act(async () => {});

  const before = latest.settings;
  const bogus = 'not-a-real-flame' as FlameId;

  await act(async () => {
    latest.setFlameStyle(bogus);
  });

  expect(latest.settings).toBe(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a failed save does not throw or revert the in-memory flame style', async () => {
  // Persistence is fire-and-forget: a rejected write must not break the UI.
  mockedSave.mockRejectedValueOnce(new Error('disk full'));
  await renderProbe();
  await act(async () => {});

  const target = otherFlameId();
  await act(async () => {
    latest.setFlameStyle(target);
  });
  await act(async () => {});

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

test('unmounting before load resolves does not set state', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValueOnce(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await renderProbe();
  const snapshot = latest;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: otherFlameId() });
  });

  // The probe's last-seen value must not have been updated by the late load.
  expect(latest).toBe(snapshot);
  expect(snapshot.ready).toBe(false);
  expect(errorSpy).not.toHaveBeenCalledWith(
    expect.stringContaining('unmounted'),
    expect.anything(),
  );
  errorSpy.mockRestore();
});

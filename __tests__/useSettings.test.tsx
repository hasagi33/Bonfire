/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * A tiny probe component exposes hook state through props so tests can drive
 * loading, flame style selection, and unmount behavior without native UI.
 * The settings store is mocked so AsyncStorage is never touched directly.
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

// Probe component: copies the hook result into a module variable for assertions.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  }, [value]);
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe and flushes pending promise callbacks so `ready` settles.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Pick a catalog id that is not the default so we can detect a real change.
function nonDefaultFlameId(): FlameId {
  const fallback = flameById('amber' as FlameId).id;
  const other = (['crimson', 'sapphire'] as FlameId[]).find(id => id !== fallback);
  return other ?? fallback;
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  mockedSave.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts with DEFAULT_SETTINGS and becomes ready after loadSettings resolves', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
});

test('reports not ready while the load is still pending', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  expect(latest.ready).toBe(false);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);

  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
  await act(async () => {
    resolveLoad(loaded);
  });

  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('loaded settings replace the defaults', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
  mockedLoad.mockResolvedValue(loaded);
  await renderProbe();

  expect(latest.settings).toEqual(loaded);
  expect(latest.settings.flameStyle).not.toBe(DEFAULT_SETTINGS.flameStyle);
});

test('setFlameStyle with a valid catalog id updates state and persists the new object', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  const target = nonDefaultFlameId();
  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id is ignored: no state change and no save', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  const before = latest.settings;
  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a save failure does not throw or revert the in-memory selection', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();

  const target = nonDefaultFlameId();
  await act(async () => {
    latest.setFlameStyle(target);
  });
  await act(async () => {});

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

test('unmounting before the load resolves does not set state', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  const snapshot = latest;
  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() });
  });

  expect(latest).toBe(snapshot);
  expect(snapshot.ready).toBe(false);
  expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

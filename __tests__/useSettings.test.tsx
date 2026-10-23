/**
 * useSettings.test.tsx — hook tests for user preferences (active flame style).
 *
 * The settings store is mocked so AsyncStorage is never touched. A tiny probe
 * component exposes hook state through module-level variables so tests can
 * drive loading, flame selection, and unmount behavior without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

// Replace the persistence layer with mocks; DEFAULT_SETTINGS is preserved so
// the hook's initial state matches the real defaults.
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

// Hook state captured by the probe on every render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: mounts the hook and publishes its return value.
function Probe() {
  const hook = useSettings();
  latest = hook;
  return <Text>{hook.ready ? 'ready' : 'loading'}</Text>;
}

// Create a fresh deferred promise so tests can control when loadSettings resolves.
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

// Pick a real catalog flame other than the default, for selection tests.
function otherFlameId(): FlameId {
  const base = DEFAULT_SETTINGS.flameStyle;
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(id => id !== base);
  return candidate ?? base;
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

test('starts with DEFAULT_SETTINGS and ready=false before load resolves', () => {
  // Keep loadSettings pending so we observe the initial render.
  const pending = deferred<Settings>();
  mockedLoad.mockReturnValue(pending.promise);

  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  expect(latest.ready).toBe(false);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);

  // Resolve afterwards so the effect completes cleanly.
  act(() => {
    pending.resolve(DEFAULT_SETTINGS);
  });
});

test('loadSettings resolves and sets ready=true with the loaded settings', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: otherFlameId() };
  mockedLoad.mockResolvedValue(loaded);

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates flameStyle and saves a deep-equal payload', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});

  const target = otherFlameId();
  act(() => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id is ignored and does not save', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});

  // Cast a bogus id; flameById falls back to the base flame, so the hook must reject it.
  const bogus = 'not-a-real-flame' as FlameId;
  expect(flameById(bogus).id).not.toBe(bogus);

  act(() => {
    latest.setFlameStyle(bogus);
  });

  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('unmounting before load resolves does not set state', async () => {
  const pending = deferred<Settings>();
  mockedLoad.mockReturnValue(pending.promise);

  const onRender = jest.fn();
  const Tracked = () => {
    onRender();
    return <Probe />;
  };

  act(() => {
    rendered = ReactTestRenderer.create(<Tracked />);
  });
  const rendersBeforeUnmount = onRender.mock.calls.length;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  // Resolving after unmount must not trigger a state update (the guard flag blocks it).
  await act(async () => {
    pending.resolve({ ...DEFAULT_SETTINGS, flameStyle: otherFlameId() });
  });

  expect(onRender.mock.calls.length).toBe(rendersBeforeUnmount);
});

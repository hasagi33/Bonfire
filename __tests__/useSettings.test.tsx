/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through a ref-like holder so tests
 * can read `settings`/`ready` and call `setFlameStyle` without native UI.
 * AsyncStorage is backed by the official jest mock, so no real storage or
 * network is touched and every test starts from a clean slate.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS } from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

// Holder that the probe writes into on every render, so tests can inspect the
// latest hook result after each act() flushes state updates.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Mounts the probe inside act() and waits for the initial async load to settle.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Pick a real flame id that differs from the default so writes are observable.
function nonDefaultFlameId(): FlameId {
  const candidate = flameById('crimson' as FlameId);
  return candidate.id;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
  jest.restoreAllMocks();
});

test('starts with default settings and ready=false before load resolves', () => {
  // Synchronous first render: load has not resolved yet.
  act(() => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  expect(latest.ready).toBe(false);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
});

test('loads persisted settings on mount and flips ready to true', async () => {
  const saved = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
  await AsyncStorage.setItem('bonfire.settings.v1', JSON.stringify(saved));

  await renderProbe();

  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(saved);
});

test('falls back to defaults when nothing is stored', async () => {
  await renderProbe();

  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
});

test('setFlameStyle updates state and persists the new style', async () => {
  await renderProbe();
  const id = nonDefaultFlameId();

  await act(async () => {
    latest.setFlameStyle(id);
  });
  await act(async () => {});

  expect(latest.settings.flameStyle).toBe(id);
  const stored = JSON.parse((await AsyncStorage.getItem('bonfire.settings.v1'))!);
  expect(stored.flameStyle).toBe(id);
});

test('setFlameStyle ignores unknown flame ids', async () => {
  await renderProbe();
  const before = latest.settings;

  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });
  await act(async () => {});

  expect(latest.settings).toEqual(before);
  expect(await AsyncStorage.getItem('bonfire.settings.v1')).toBeNull();
});

test('a failed save does not block the UI state update', async () => {
  jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk full'));
  await renderProbe();
  const id = nonDefaultFlameId();

  await act(async () => {
    latest.setFlameStyle(id);
  });
  await act(async () => {});

  expect(latest.settings.flameStyle).toBe(id);
});

test('does not update state after unmount when the load resolves late', async () => {
  let resolveLoad!: (value: string | null) => void;
  jest
    .spyOn(AsyncStorage, 'getItem')
    .mockImplementationOnce(
      () => new Promise<string | null>(resolve => { resolveLoad = resolve; }),
    );
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  const readyBefore = latest.ready;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    resolveLoad(JSON.stringify({ ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() }));
  });

  expect(readyBefore).toBe(false);
  expect(errorSpy).not.toHaveBeenCalledWith(
    expect.stringContaining('unmounted component'),
    expect.anything(),
  );
});

/**
 * useSettings.test.tsx — hook tests for user preferences (active flame style).
 *
 * The settings store is mocked so AsyncStorage is never touched directly. A tiny
 * probe component exposes hook state through props so tests can drive loading and
 * flame style selection without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the settings store with controllable fakes. The real module is not
// used by these tests; the fakes keep every call observable and deterministic.
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

// Probe component: renders nothing meaningful but captures the hook result
// into `latest` so assertions can read it after each act().
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  });
  return <Text>{value.settings.flameStyle}</Text>;
}

async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  // Flush any pending promise callbacks from the load effect.
  await act(async () => {});
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSave.mockResolvedValue(undefined);
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts with DEFAULT_SETTINGS and ready=false before load resolves', async () => {
  // Keep the load pending so we can observe the pre-load state.
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

  await act(async () => {
    resolveLoad(DEFAULT_SETTINGS);
  });
});

test('flips ready to true and adopts persisted values after load resolves', async () => {
  const persisted: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  mockedLoad.mockResolvedValue(persisted);

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(persisted);
});

test('setFlameStyle with a valid catalog id updates state and saves the new settings', async () => {
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle('crimson' as FlameId);
  });

  expect(latest.settings.flameStyle).toBe('crimson');
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: 'crimson' });
});

test('setFlameStyle with an unknown id is ignored: no state change, no save', async () => {
  await renderProbe();
  const before = latest.settings;

  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('round-trip: the saved settings deep-equal what a fresh load returns', async () => {
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle('crimson' as FlameId);
  });

  const saved = mockedSave.mock.calls[0][0];
  // Simulate a fresh app launch that reads back exactly what was persisted.
  mockedLoad.mockResolvedValue(saved);
  await act(async () => {
    rendered?.unmount();
  });
  rendered = null;
  await renderProbe();

  expect(latest.settings).toEqual(saved);
});

test('a failing save does not throw or block the UI state update', async () => {
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle('crimson' as FlameId);
  });

  expect(latest.settings.flameStyle).toBe('crimson');
});

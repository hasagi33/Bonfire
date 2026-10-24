/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through props so tests can drive
 * loading and flame style changes without native UI. The settings store is
 * mocked, so AsyncStorage is never touched directly.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

jest.mock('../src/data/settingsStore', () => {
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoadSettings = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSaveSettings = saveSettings as jest.MockedFunction<typeof saveSettings>;

let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: renders nothing meaningful but copies hook output into `latest`
// so each test can inspect and drive the hook.
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
  // Flush any pending promise callbacks from loadSettings.
  await act(async () => {});
}

beforeEach(() => {
  mockedLoadSettings.mockReset();
  mockedSaveSettings.mockReset();
  mockedSaveSettings.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts with DEFAULT_SETTINGS and ready=false before the load resolves', async () => {
  // Never-resolving load keeps the hook in its initial state.
  mockedLoadSettings.mockReturnValue(new Promise<Settings>(() => {}));

  await renderProbe();

  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);
});

test('flips ready to true once loadSettings resolves', async () => {
  mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });

  await renderProbe();

  expect(mockedLoadSettings).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
});

test('loaded settings replace the defaults', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  mockedLoadSettings.mockResolvedValue(loaded);

  await renderProbe();

  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and saves the full object', async () => {
  mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  const target = 'sapphire' as FlameId;
  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
  expect(mockedSaveSettings).toHaveBeenCalledWith({
    ...DEFAULT_SETTINGS,
    flameStyle: target,
  });
});

test('setFlameStyle with an unknown id is ignored: no state change and no save', async () => {
  mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  const before = latest.settings;
  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toBe(before);
  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSaveSettings).not.toHaveBeenCalled();
});

test('a failing save does not break the UI state update', async () => {
  mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockedSaveSettings.mockRejectedValue(new Error('disk full'));
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle('sapphire' as FlameId);
  });

  // Persistence is fire-and-forget: the in-memory change still lands.
  expect(latest.settings.flameStyle).toBe('sapphire');
});

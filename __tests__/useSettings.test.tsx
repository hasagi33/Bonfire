/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes the hook's state through a ref so tests can
 * drive setFlameStyle and inspect the result. The settingsStore module is mocked
 * so AsyncStorage is never touched and every test is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the store with jest mocks; keep DEFAULT_SETTINGS as the real value.
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

// Holds the most recent hook result so tests can read and call it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and publishes its result to `latest`.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  }, [value]);
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act() so pending effects and promises are flushed.
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

test('starts with DEFAULT_SETTINGS and ready=false until load resolves', async () => {
  // Hold the load promise open so we can observe the pre-load state.
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
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

  expect(latest.ready).toBe(true);
});

test('ready flips to true after loadSettings resolves with defaults', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });

  await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
});

test('loaded settings replace the defaults', async () => {
  const stored: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
  mockedLoad.mockResolvedValue(stored);

  await renderProbe();

  expect(latest.settings).toEqual(stored);
  expect(latest.settings.flameStyle).toBe('crimson');
  expect(latest.ready).toBe(true);
});

test('setFlameStyle with a valid catalog id updates state and saves the new settings', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle('sapphire' as FlameId);
  });

  expect(latest.settings.flameStyle).toBe('sapphire');
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({
    ...DEFAULT_SETTINGS,
    flameStyle: 'sapphire',
  });
});

test('setFlameStyle with an unknown id leaves state unchanged and does not save', async () => {
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

test('a failed save does not throw or revert the in-memory selection', async () => {
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockedSave.mockRejectedValue(new Error('disk full'));
  await renderProbe();

  await act(async () => {
    latest.setFlameStyle('sapphire' as FlameId);
  });
  await act(async () => {});

  // Persistence is fire-and-forget: the UI keeps the new style.
  expect(latest.settings.flameStyle).toBe('sapphire');
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

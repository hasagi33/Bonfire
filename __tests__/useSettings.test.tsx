/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * A tiny probe component exposes hook state through props so tests can drive
 * the flame-style setter without native UI. The settings store is mocked so
 * AsyncStorage is never touched directly and no real I/O happens.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the persistence layer with jest mocks so no storage is touched.
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

// Probe component: calls the hook and copies its result into `latest` so the
// test body can inspect state and call the setter.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  }, [value]);
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe inside act() and flushes pending promises so the mocked
// loadSettings promise resolves before assertions run.
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

describe('useSettings initial load', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load resolves', async () => {
    // Never-resolving load keeps the hook in its pre-load state.
    mockedLoad.mockReturnValue(new Promise(() => {}));
    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);
  });

  test('becomes ready and adopts the stored value once loadSettings resolves', async () => {
    const stored = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
    mockedLoad.mockResolvedValue(stored);
    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(stored);
  });
});

describe('setFlameStyle', () => {
  test('updates flameStyle and saves the full next settings object', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();

    await act(async () => {
      latest.setFlameStyle('crimson');
    });

    expect(latest.settings.flameStyle).toBe('crimson');
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      flameStyle: 'crimson',
    });
  });

  test('ignores an unknown flame id: state and saveSettings are untouched', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();
    const before = latest.settings;

    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toBe(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('swallows a save failure so the UI state still updates', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();

    await act(async () => {
      latest.setFlameStyle('crimson');
    });
    await act(async () => {});

    expect(latest.settings.flameStyle).toBe('crimson');
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

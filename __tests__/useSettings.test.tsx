/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through props so tests can wait for
 * the initial load, change the flame style, and inspect persistence calls. The
 * settings store is mocked so AsyncStorage is never touched directly, keeping
 * these tests deterministic and free of device state.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

jest.mock('../src/data/settingsStore', () => {
  // Keep the real default object shape, but replace the storage functions with mocks.
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

// Probe component: stores the hook's return value so tests can read it.
function Probe() {
  const api = useSettings();
  latest = api;
  return <Text>{api.settings.flameStyle}</Text>;
}

async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Resolve a load promise and flush React state updates.
async function flushLoad() {
  await act(async () => {
    await Promise.resolve();
  });
}

// Pick a catalog id that is not the default, so change assertions are meaningful.
function nonDefaultFlameId(): FlameId {
  const candidates: FlameId[] = ['crimson', 'sapphire'];
  const pick = candidates.find(id => id !== DEFAULT_SETTINGS.flameStyle);
  if (!pick) {
    throw new Error('expected a non-default flame id in the catalog');
  }
  return pick;
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

describe('useSettings initial load', () => {
  test('starts with DEFAULT_SETTINGS and ready=false until load resolves', async () => {
    // Never-resolving load keeps the hook in its pre-load state.
    mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));
    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);
  });

  test('applies loaded settings and sets ready=true once load resolves', async () => {
    const stored: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
    mockedLoad.mockResolvedValue(stored);
    await renderProbe();
    await flushLoad();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(stored);
  });
});

describe('setFlameStyle', () => {
  beforeEach(async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();
    await flushLoad();
  });

  test('a valid catalog id updates flameStyle and persists deep-equal next settings', () => {
    const id = nonDefaultFlameId();

    act(() => {
      latest.setFlameStyle(id);
    });

    expect(latest.settings.flameStyle).toBe(id);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: id });
  });

  test('an unknown id leaves state and storage unchanged', () => {
    const before = latest.settings;

    act(() => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('persistence failures', () => {
  test('a failing save does not break the UI state update', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();
    await flushLoad();

    const id = nonDefaultFlameId();
    act(() => {
      latest.setFlameStyle(id);
    });

    expect(latest.settings.flameStyle).toBe(id);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

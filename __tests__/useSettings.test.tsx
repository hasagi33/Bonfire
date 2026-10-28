/**
 * useSettings.test.tsx — hook tests for persisted user settings (flame style).
 *
 * The settings store is mocked so no AsyncStorage is touched. A small probe
 * component exposes hook state through a module-level variable so tests can
 * drive loading and flame selection through react-test-renderer and act().
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

// Replace the persistence layer so no real storage is read or written.
// DEFAULT_SETTINGS is kept real so the initial state can be compared against it.
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

// The probe writes the latest hook result here so tests can read it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  latest = useSettings();
  return <Text>{latest.settings.flameStyle}</Text>;
}

// Render the probe and flush pending promises from the mocked load.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Pick a flame id that differs from the default so the change is observable.
function otherFlameId(): FlameId {
  const candidates: FlameId[] = ['crimson', 'sapphire'];
  const pick = candidates.find(id => id !== DEFAULT_SETTINGS.flameStyle);
  if (!pick) {
    throw new Error('test setup: no alternate flame id available');
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
  test('starts with DEFAULT_SETTINGS and ready=false while loading', async () => {
    // Never-resolving load keeps the hook in its loading state.
    mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));

    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);
  });

  test('becomes ready with the loaded value once loadSettings resolves', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: otherFlameId() };
    mockedLoad.mockResolvedValue(loaded);

    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });
});

describe('setFlameStyle', () => {
  test('updates flameStyle and saves a deep-equal settings object', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();

    const target = otherFlameId();
    await act(async () => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
  });

  test('ignores an unknown flame id: state and saveSettings stay untouched', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();

    const before = latest.settings;
    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toBe(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failing save does not break state or throw to the caller', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();

    const target = otherFlameId();
    await act(async () => {
      latest.setFlameStyle(target);
    });

    // Persistence is fire-and-forget, so the UI state still reflects the choice.
    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

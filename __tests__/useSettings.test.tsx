/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched. A tiny probe
 * component exposes the hook's state through a ref so tests can drive
 * `setFlameStyle` and inspect `settings` / `ready` without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

// Replace the store with jest mocks so no AsyncStorage access happens.
// DEFAULT_SETTINGS is passed through from the real module.
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

// Holds the most recent hook return value so tests can read it after each render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe and flushes pending effects and promise resolutions.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Picks a real, non-default catalog id so the "valid id" path is exercised.
function pickNonDefaultFlameId(): FlameId {
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(
    id => flameById(id).id === id,
  );
  if (!candidate) {
    throw new Error('expected a non-default flame id in the catalog');
  }
  return candidate;
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  // Saves succeed by default; individual tests may override.
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

    expect(latest.ready).toBe(false);
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  });

  test('replaces DEFAULT_SETTINGS with loaded value and sets ready=true', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: pickNonDefaultFlameId() };
    mockedLoad.mockResolvedValue(loaded);
    await renderProbe();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('does not save anything during the initial load', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();

    expect(mockedSave).not.toHaveBeenCalled();
  });
});

describe('setFlameStyle', () => {
  beforeEach(() => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  });

  test('valid catalog id updates flameStyle and persists a deep-equal object', async () => {
    await renderProbe();
    const id = pickNonDefaultFlameId();

    await act(async () => {
      latest.setFlameStyle(id);
    });

    expect(latest.settings.flameStyle).toBe(id);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: id });
  });

  test('unknown id is ignored: no state change and no save', async () => {
    await renderProbe();
    const before = latest.settings;

    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toBe(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('save failure does not throw or revert in-memory state', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();
    const id = pickNonDefaultFlameId();

    await act(async () => {
      latest.setFlameStyle(id);
    });

    // Persistence is fire-and-forget, so the UI state still reflects the choice.
    expect(latest.settings.flameStyle).toBe(id);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through a captured ref so tests can
 * drive loading, flame selection, and unmount behavior without native UI. The
 * settings store is mocked so no AsyncStorage or network is touched.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

// Replace the storage-backed settings module with controllable mocks.
// DEFAULT_SETTINGS is kept as the real value so tests compare against the true default.
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

// Captured hook result from the most recent render of the probe.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: calls the hook and stores its return value for assertions.
function Probe() {
  latest = useSettings();
  return null;
}

// Render the probe inside act so effects and the loadSettings promise settle.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Find a catalog flame id that is not the current default, so a change is observable.
function otherFlameId(): FlameId {
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(
    id => id !== DEFAULT_SETTINGS.flameStyle,
  );
  if (!candidate) {
    throw new Error('expected at least one non-default flame in the catalog');
  }
  return candidate;
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

describe('useSettings', () => {
  test('starts with DEFAULT_SETTINGS and ready=false, then loads persisted settings', async () => {
    // Hold the load promise open so we can observe the pre-load state.
    let resolveLoad!: (value: Settings) => void;
    mockedLoadSettings.mockReturnValueOnce(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: otherFlameId() };
    await act(async () => {
      resolveLoad(loaded);
    });

    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
    expect(mockedLoadSettings).toHaveBeenCalledTimes(1);
  });

  test('setFlameStyle with a valid catalog id updates the style and persists it', async () => {
    mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();
    await act(async () => {});

    const nextId = otherFlameId();
    act(() => {
      latest.setFlameStyle(nextId);
    });

    expect(latest.settings.flameStyle).toBe(nextId);
    expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
    expect(mockedSaveSettings).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      flameStyle: nextId,
    });
  });

  test('setFlameStyle with an unknown id leaves settings unchanged and does not persist', async () => {
    mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    await renderProbe();
    await act(async () => {});

    const before = latest.settings;
    const bogus = 'not-a-real-flame' as FlameId;

    // Sanity check: the catalog resolves the bogus id to a different base flame.
    expect(flameById(bogus).id).not.toBe(bogus);

    act(() => {
      latest.setFlameStyle(bogus);
    });

    expect(latest.settings).toBe(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSaveSettings).not.toHaveBeenCalled();
  });

  test('does not update state when the load resolves after unmount', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoadSettings.mockReturnValueOnce(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await renderProbe();
    const snapshot = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    // Resolve after unmount; the active guard must prevent any state update.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: otherFlameId() });
    });

    expect(latest).toBe(snapshot);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

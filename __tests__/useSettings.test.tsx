/**
 * useSettings.test.tsx — hook tests for user preferences (the active flame style).
 *
 * Covers the load-on-mount lifecycle (`ready` flag and loaded settings), the
 * catalog-validated `setFlameStyle` path (state update plus persistence), and the
 * rejection of unknown flame ids. The settings store is mocked so no real
 * AsyncStorage is touched and every run is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the storage-backed store with jest mocks so no AsyncStorage is used.
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

// A fixture that differs from the defaults so we can tell the loaded value apart.
const LOADED_SETTINGS: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };

let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Tiny probe component that exposes the hook's return value through `latest`.
function Probe() {
  latest = useSettings();
  return null;
}

// Render the probe and let pending promises (the mocked load) settle inside act.
async function renderHook() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoadSettings.mockResolvedValue(LOADED_SETTINGS);
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
  test('starts with DEFAULT_SETTINGS and ready=false before the load resolves', () => {
    // Keep the load pending so we observe the initial render state.
    mockedLoadSettings.mockReturnValue(new Promise(() => {}));

    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.ready).toBe(false);
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  });

  test('exposes the loaded settings and flips ready to true after load resolves', async () => {
    await renderHook();

    expect(mockedLoadSettings).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(LOADED_SETTINGS);
  });

  test('setFlameStyle with a valid catalog id updates the style and persists it', async () => {
    await renderHook();

    act(() => {
      latest.setFlameStyle('sapphire' as FlameId);
    });

    expect(latest.settings.flameStyle).toBe('sapphire');
    expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
    expect(mockedSaveSettings).toHaveBeenCalledWith({
      ...LOADED_SETTINGS,
      flameStyle: 'sapphire',
    });
  });

  test('setFlameStyle with an unknown id leaves settings unchanged and skips saving', async () => {
    await renderHook();
    const before = latest.settings;

    act(() => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toBe(before);
    expect(latest.settings.flameStyle).toBe(LOADED_SETTINGS.flameStyle);
    expect(mockedSaveSettings).not.toHaveBeenCalled();
  });

  test('a failed save does not throw or revert the in-memory style', async () => {
    // Persistence is fire-and-forget, so a rejected write must be swallowed.
    mockedSaveSettings.mockRejectedValue(new Error('disk full'));
    await renderHook();

    act(() => {
      latest.setFlameStyle('sapphire' as FlameId);
    });

    expect(latest.settings.flameStyle).toBe('sapphire');
    expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
  });
});

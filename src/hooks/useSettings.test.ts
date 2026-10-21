/**
 * useSettings.test.ts — unit tests for the useSettings hook.
 *
 * The settings store is mocked so no AsyncStorage is touched. Tests cover the
 * initial load, replacement of defaults once loaded, and setFlameStyle with a
 * valid catalog id versus an unknown id.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSettings } from './useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../data/settingsStore';
import { flameById, type FlameId } from '../domain/flames';

jest.mock('../data/settingsStore', () => {
  const actual = jest.requireActual('../data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoadSettings = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSaveSettings = saveSettings as jest.MockedFunction<typeof saveSettings>;

// A valid, catalog-backed id distinct from the default (Amber).
const VALID_ID = 'crimson' as FlameId;
const UNKNOWN_ID = 'not-a-real-flame' as unknown as FlameId;

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
    mockedSaveSettings.mockResolvedValue(undefined);
  });

  it('starts with DEFAULT_SETTINGS and becomes ready once the load resolves', async () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.ready).toBe(false);

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(mockedLoadSettings).toHaveBeenCalledTimes(1);
  });

  it('replaces defaults with the loaded settings once loaded', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: VALID_ID };
    mockedLoadSettings.mockResolvedValue(loaded);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.settings).toEqual(loaded);
    expect(result.current.settings.flameStyle).toBe(VALID_ID);
  });

  it('setFlameStyle with a valid catalog id updates the style and persists it', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(VALID_ID);
    });

    expect(result.current.settings.flameStyle).toBe(VALID_ID);
    expect(mockedSaveSettings).toHaveBeenCalledTimes(1);
    expect(mockedSaveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ flameStyle: VALID_ID }),
    );
  });

  it('setFlameStyle with an unknown id leaves settings unchanged and does not save', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const before = result.current.settings;
    const baseId = flameById(UNKNOWN_ID).id;

    act(() => {
      result.current.setFlameStyle(UNKNOWN_ID);
    });

    expect(result.current.settings).toEqual(before);
    expect(result.current.settings.flameStyle).not.toBe(UNKNOWN_ID);
    expect(result.current.settings.flameStyle).not.toBe(baseId === UNKNOWN_ID ? baseId : UNKNOWN_ID);
    expect(mockedSaveSettings).not.toHaveBeenCalled();
  });
});

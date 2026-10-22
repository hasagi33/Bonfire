/**
 * useSettings.test.ts — tests for the useSettings hook.
 *
 * The settings store is mocked so no AsyncStorage is touched. Covers the
 * initial/loaded state, valid and invalid flame style updates, and persistence
 * behavior, using renderHook from @testing-library/react-native.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { flameById, type FlameId } from '../domain/flames';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../data/settingsStore';
import { useSettings } from './useSettings';

jest.mock('../data/settingsStore', () => {
  const actual = jest.requireActual('../data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

const KNOWN_ID = 'crimson' as FlameId;
const UNKNOWN_ID = 'not-a-real-flame' as unknown as FlameId;

const LOADED: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'sapphire' as FlameId };

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoad.mockResolvedValue(LOADED);
    mockedSave.mockResolvedValue(undefined);
  });

  test('initial state equals DEFAULT_SETTINGS and ready is false before load', () => {
    mockedLoad.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.ready).toBe(false);
  });

  test('after load resolves, ready is true and settings reflect the loaded value', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.settings).toEqual(LOADED);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  test('setFlameStyle with a valid catalog id updates flameStyle and calls saveSettings', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(KNOWN_ID);
    });

    expect(result.current.settings.flameStyle).toBe(KNOWN_ID);
    expect(flameById(KNOWN_ID).id).toBe(KNOWN_ID);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...LOADED, flameStyle: KNOWN_ID });
  });

  test('setFlameStyle with an unknown id leaves settings unchanged and does not save', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const before = result.current.settings;

    act(() => {
      result.current.setFlameStyle(UNKNOWN_ID);
    });

    expect(result.current.settings).toEqual(before);
    expect(result.current.settings.flameStyle).toBe(LOADED.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failing saveSettings does not throw or block the UI state update', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(() =>
      act(() => {
        result.current.setFlameStyle(KNOWN_ID);
      }),
    ).not.toThrow();

    expect(result.current.settings.flameStyle).toBe(KNOWN_ID);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test('does not apply loaded settings after unmount', async () => {
    let resolveLoad: (value: Settings) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    const { result, unmount } = renderHook(() => useSettings());
    unmount();

    await act(async () => {
      resolveLoad(LOADED);
    });

    expect(result.current.ready).toBe(false);
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });
});

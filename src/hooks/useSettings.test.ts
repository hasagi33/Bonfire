/**
 * useSettings.test.ts — tests for the useSettings hook.
 *
 * The settings store is mocked so no AsyncStorage is touched.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSettings } from './useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../data/settingsStore';
import { flameById } from '../domain/flames';

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

// A valid, non-default catalog id used across tests.
const VALID_ID = 'crimson' as Parameters<ReturnType<typeof useSettings>['setFlameStyle']>[0];
const UNKNOWN_ID = 'not-a-real-flame' as unknown as Parameters<
  ReturnType<typeof useSettings>['setFlameStyle']
>[0];

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSave.mockResolvedValue(undefined as never);
  });

  it('starts with DEFAULT_SETTINGS and ready=false, then becomes ready with the loaded value', async () => {
    const loaded = { ...DEFAULT_SETTINGS, flameStyle: VALID_ID };
    mockedLoad.mockResolvedValue(loaded as never);

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.ready).toBe(false);

    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(result.current.settings).toEqual(loaded);
  });

  it('setFlameStyle with a valid catalog id updates flameStyle and calls saveSettings with the new settings', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS } as never);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(VALID_ID);
    });

    expect(result.current.settings.flameStyle).toBe(VALID_ID);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ flameStyle: VALID_ID }),
    );
  });

  it('setFlameStyle with an unknown id leaves state unchanged and does not call saveSettings', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS } as never);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const before = result.current.settings;

    act(() => {
      result.current.setFlameStyle(UNKNOWN_ID);
    });

    expect(result.current.settings).toEqual(before);
    expect(result.current.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('resolves the catalog for the id used in the valid-path test', () => {
    // Guards the fixture: the valid id must be a real catalog entry.
    expect(flameById(VALID_ID).id).toBe(VALID_ID);
  });
});

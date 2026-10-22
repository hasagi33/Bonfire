/**
 * useSettings.test.ts — unit tests for the useSettings hook.
 *
 * Verifies the initial/default state, the async load that flips `ready`,
 * and the setFlameStyle action (valid catalog id persists, unknown id is
 * ignored). The settings store is mocked so no AsyncStorage is touched and
 * the tests stay deterministic.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { flameById, type FlameId } from '../domain/flames';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../data/settingsStore';
import { useSettings } from './useSettings';

// Replace the persistence layer with jest mocks. DEFAULT_SETTINGS is kept as
// the real constant so the hook's initial state can be compared against it.
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

// Pick a real, non-default catalog id so we can assert a visible change.
// flameById falls back to the base flame for unknown ids, so this id must
// resolve to itself.
const validId: FlameId = flameById('crimson').id;
const otherValidId: FlameId = flameById('sapphire').id;

beforeEach(() => {
  jest.clearAllMocks();
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockedSave.mockResolvedValue(undefined);
});

describe('useSettings — initial state', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load resolves', () => {
    // Keep the load pending so we observe the pre-load render.
    mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.ready).toBe(false);
  });

  test('ready flips to true after loadSettings resolves', async () => {
    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });
});

describe('useSettings — loading persisted settings', () => {
  test('loaded settings replace the defaults', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: validId };
    mockedLoad.mockResolvedValue(loaded);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.settings).toEqual(loaded);
    expect(result.current.settings.flameStyle).toBe(validId);
  });
});

describe('useSettings — setFlameStyle', () => {
  test('valid catalog id updates flameStyle and calls saveSettings', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(validId);
    });

    expect(result.current.settings.flameStyle).toBe(validId);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith(
      expect.objectContaining({ flameStyle: validId }),
    );
  });

  test('a second valid change overwrites the previous selection', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(validId);
    });
    act(() => {
      result.current.setFlameStyle(otherValidId);
    });

    expect(result.current.settings.flameStyle).toBe(otherValidId);
    expect(mockedSave).toHaveBeenLastCalledWith(
      expect.objectContaining({ flameStyle: otherValidId }),
    );
  });

  test('unknown id is ignored: state and saveSettings are unchanged', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const before = result.current.settings;

    act(() => {
      result.current.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(result.current.settings).toEqual(before);
    expect(result.current.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('save failure does not throw or revert the in-memory selection', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(validId);
    });

    expect(result.current.settings.flameStyle).toBe(validId);
  });
});

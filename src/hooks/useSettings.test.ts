/**
 * useSettings.test.ts — unit tests for the useSettings hook.
 *
 * The settings store is mocked so no AsyncStorage is touched and the tests are
 * fully deterministic. Each test drives the hook with renderHook/act and then
 * asserts on the returned state or on the mocked persistence calls.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSettings } from '../src/hooks/useSettings';
import { flameById, type FlameId } from '../src/domain/flames';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';

// Replace the persistence layer with jest mocks. DEFAULT_SETTINGS is kept real
// so the tests compare against the same object the hook starts from.
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

// A catalog id that is valid for flameById, and one that is not.
const VALID_ID = 'crimson' as FlameId;
const UNKNOWN_ID = 'not-a-real-flame' as unknown as FlameId;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: the load resolves with the built-in defaults.
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  mockedSave.mockResolvedValue(undefined);
});

describe('useSettings — initial state', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load completes', () => {
    // Hold the load promise open so we observe the pre-load state.
    mockedLoad.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.ready).toBe(false);
  });
});

describe('useSettings — loading', () => {
  test('after loadSettings resolves, settings reflect loaded values and ready=true', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: VALID_ID };
    mockedLoad.mockResolvedValue(loaded);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.settings).toEqual(loaded);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });
});

describe('useSettings — setFlameStyle', () => {
  test('a valid catalog id updates flameStyle and calls saveSettings with new settings', async () => {
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

  test('persists the id that flameById resolves to, matching the catalog', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(VALID_ID);
    });

    expect(flameById(VALID_ID).id).toBe(VALID_ID);
    expect(mockedSave.mock.calls[0][0].flameStyle).toBe(VALID_ID);
  });

  test('an unknown id is ignored: state unchanged and saveSettings not called', async () => {
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));
    const before = result.current.settings;

    act(() => {
      result.current.setFlameStyle(UNKNOWN_ID);
    });

    expect(result.current.settings).toEqual(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failing saveSettings does not throw or revert the in-memory state', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(() => {
      act(() => {
        result.current.setFlameStyle(VALID_ID);
      });
    }).not.toThrow();

    // Persistence is fire-and-forget, so the UI keeps the new value.
    expect(result.current.settings.flameStyle).toBe(VALID_ID);
  });
});

describe('useSettings — unmount safety', () => {
  test('does not update state when the load resolves after unmount', async () => {
    let resolveLoad: (value: Settings) => void = () => {};
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result, unmount } = renderHook(() => useSettings());
    expect(result.current.ready).toBe(false);

    unmount();
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: VALID_ID });
    });

    // The active guard prevents a state update, so no act warning is logged.
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

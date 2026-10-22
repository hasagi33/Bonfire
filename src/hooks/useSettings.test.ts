/**
 * useSettings.test.ts — tests for the useSettings hook.
 *
 * The settings store is mocked so no AsyncStorage is touched. The flame catalog
 * is used as-is so that valid and invalid FlameId values are checked against the
 * real catalog.
 */

import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useSettings } from './useSettings';
import { flameById } from '../domain/flames';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../data/settingsStore';

jest.mock('../data/settingsStore', () => {
  const actual = jest.requireActual('../data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
    DEFAULT_SETTINGS: { flameStyle: 'amber' },
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

// Pick a real, non-default catalog id from the catalog itself.
const VALID_ID = (() => {
  const candidate = flameById('crimson');
  return candidate.id === 'crimson' ? 'crimson' : flameById('amber').id;
})() as Parameters<ReturnType<typeof useSettings>['setFlameStyle']>[0];

const UNKNOWN_ID = 'not-a-real-flame' as Parameters<
  ReturnType<typeof useSettings>['setFlameStyle']
>[0];

describe('useSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSave.mockResolvedValue(undefined as never);
  });

  it('returns default settings and ready=false before load completes', () => {
    // Never-resolving load keeps the hook in its pre-load state.
    mockedLoad.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
    expect(result.current.ready).toBe(false);
  });

  it('sets ready=true and exposes loaded settings after load', async () => {
    const loaded = { ...DEFAULT_SETTINGS, flameStyle: VALID_ID };
    mockedLoad.mockResolvedValue(loaded as never);

    const { result } = renderHook(() => useSettings());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.settings).toEqual(loaded);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  it('updates flameStyle and calls saveSettings for a valid catalog id', async () => {
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

  it('ignores an unknown flame id and does not call saveSettings', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS } as never);

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));
    const before = result.current.settings;

    act(() => {
      result.current.setFlameStyle(UNKNOWN_ID);
    });

    expect(result.current.settings).toBe(before);
    expect(result.current.settings.flameStyle).not.toBe(UNKNOWN_ID);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  it('does not update state after unmount when load resolves late', async () => {
    let resolveLoad!: (value: unknown) => void;
    mockedLoad.mockReturnValue(
      new Promise(resolve => {
        resolveLoad = resolve;
      }) as never,
    );

    const { result, unmount } = renderHook(() => useSettings());
    unmount();

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: VALID_ID });
    });

    expect(result.current.ready).toBe(false);
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('still updates state when saveSettings rejects (fire-and-forget)', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS } as never);
    mockedSave.mockRejectedValue(new Error('disk full'));

    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.ready).toBe(true));

    act(() => {
      result.current.setFlameStyle(VALID_ID);
    });

    expect(result.current.settings.flameStyle).toBe(VALID_ID);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

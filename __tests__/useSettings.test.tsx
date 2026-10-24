/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so no real AsyncStorage is touched. A tiny probe
 * component exposes hook state through a ref so tests can read the latest
 * settings, call setFlameStyle, and inspect what would have been persisted.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

jest.mock('../src/data/settingsStore', () => {
  // Keep the real DEFAULT_SETTINGS value so assertions compare against the true default.
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result on a shared variable for assertions.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe inside act so effects and pending promises are flushed.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Pick a real catalog flame other than the default so a change is observable.
function pickNonDefaultFlame(): FlameId {
  const defaultId = DEFAULT_SETTINGS.flameStyle;
  const candidates: FlameId[] = ['crimson', 'sapphire'];
  const pick = candidates.find(id => id !== defaultId && flameById(id).id === id);
  if (!pick) {
    throw new Error('test setup: no alternate catalog flame available');
  }
  return pick;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedSave.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load resolves', async () => {
    // Never-resolving load keeps the hook in its pre-load state.
    mockedLoad.mockReturnValue(new Promise(() => {}));
    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);
  });

  test('becomes ready and adopts the loaded value once loadSettings resolves', async () => {
    const loaded = { ...DEFAULT_SETTINGS, flameStyle: pickNonDefaultFlame() };
    mockedLoad.mockResolvedValue(loaded);
    await renderProbe();
    await act(async () => {});

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('setFlameStyle with a valid catalog id updates state and saves the deep-equal next settings', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();
    await act(async () => {});

    const target = pickNonDefaultFlame();
    act(() => {
      latest.setFlameStyle(target);
    });

    const expected = { ...DEFAULT_SETTINGS, flameStyle: target };
    expect(latest.settings).toEqual(expected);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith(expected);
  });

  test('setFlameStyle with an unknown id leaves settings unchanged and does not save', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();
    await act(async () => {});

    const before = latest.settings;
    act(() => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failing save does not throw or roll back the in-memory change', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();
    await act(async () => {});

    const target = pickNonDefaultFlame();
    expect(() => {
      act(() => {
        latest.setFlameStyle(target);
      });
    }).not.toThrow();
    await act(async () => {});

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });

  test('ignores a load that resolves after unmount', async () => {
    let resolveLoad!: (value: typeof DEFAULT_SETTINGS) => void;
    mockedLoad.mockReturnValue(
      new Promise(resolve => {
        resolveLoad = resolve;
      }),
    );
    await renderProbe();
    const readyBefore = latest.ready;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    // Resolving after unmount must not trigger a state update warning or throw.
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: pickNonDefaultFlame() });
    });

    expect(readyBefore).toBe(false);
    expect(latest.ready).toBe(false);
  });
});

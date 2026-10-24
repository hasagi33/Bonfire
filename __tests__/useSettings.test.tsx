/**
 * useSettings.test.tsx — hook tests for the persisted user settings.
 *
 * Covers the load-on-mount lifecycle (`ready` flips after the store resolves),
 * the happy path of `setFlameStyle` (state update + full-object persistence),
 * and the guard that ignores unknown flame ids. The settings store is mocked so
 * AsyncStorage is never touched and no real I/O happens.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

// Replace the store module with fakes. DEFAULT_SETTINGS is kept real so the
// hook's initial state is compared against the same object it starts from.
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

let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Probe component: stores the hook result in a module variable so tests can
// read the latest state and call actions outside of render.
function Probe() {
  const value = useSettings();
  latest = value;
  return <Text>{value.settings.flameStyle}</Text>;
}

// Renders the probe inside act so effects and state updates flush.
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Picks a real catalog id that differs from the default, so a change is observable.
function pickNonDefaultFlameId(): FlameId {
  const defaultId = DEFAULT_SETTINGS.flameStyle;
  const candidates: FlameId[] = ['crimson', 'sapphire', 'amber'];
  const chosen = candidates.find(id => id !== defaultId && flameById(id).id === id);
  if (!chosen) {
    throw new Error('No alternate catalog flame id available for test');
  }
  return chosen;
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
  test('starts with DEFAULT_SETTINGS and ready=false until load resolves', async () => {
    // Keep the load pending so we can observe the pre-load state.
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await renderProbe();

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: pickNonDefaultFlameId() };
    await act(async () => {
      resolveLoad(loaded);
    });

    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  test('setFlameStyle with a valid catalog id updates state and persists the full settings object', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();
    await act(async () => {});

    const target = pickNonDefaultFlameId();
    act(() => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
    // Deep equality on the persisted payload, not just the field we changed.
    const persisted = mockedSave.mock.calls[0][0];
    expect(persisted).toEqual({ ...latest.settings });
  });

  test('setFlameStyle with an unknown id leaves state unchanged and does not persist', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await renderProbe();
    await act(async () => {});

    const before = latest.settings;
    act(() => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failed save does not throw or revert the in-memory selection', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();
    await act(async () => {});

    const target = pickNonDefaultFlameId();
    expect(() =>
      act(() => {
        latest.setFlameStyle(target);
      }),
    ).not.toThrow();

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

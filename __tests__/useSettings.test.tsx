/**
 * useSettings.test.tsx — hook tests for the persisted user settings.
 *
 * A tiny probe component exposes hook state through props so tests can verify
 * the initial load, flame style selection, and persistence behavior. The
 * settings store is mocked so AsyncStorage is never touched directly.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import { FLAMES, type FlameId } from '../src/domain/flames';

// Replace the real store with mocks so no storage or network access happens.
// DEFAULT_SETTINGS is kept real so the tests compare against the true default.
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

// Probe component: stores the latest hook result in a module variable.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  });
  return <Text>{value.settings.flameStyle}</Text>;
}

// Render the probe and flush the pending load promise inside act().
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
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

describe('useSettings initial load', () => {
  test('starts with DEFAULT_SETTINGS and ready=false while loading', async () => {
    // Leave the load pending so we can observe the initial render state.
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);

    // Finish the load so the hook can settle before cleanup.
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS });
    });
  });

  test('replaces state with loaded settings and sets ready=true', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
    mockedLoad.mockResolvedValue(loaded);

    await renderProbe();

    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
    expect(mockedLoad).toHaveBeenCalledTimes(1);
  });

  test('does not update state after unmount when the load resolves late', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const beforeUnmount = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    // Resolving after unmount must not throw or change the captured state.
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: 'sapphire' as FlameId });
    });

    expect(beforeUnmount.ready).toBe(false);
    expect(beforeUnmount.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('useSettings setFlameStyle', () => {
  test('a valid catalog id updates flameStyle and saves the next object', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS };
    mockedLoad.mockResolvedValue(loaded);
    await renderProbe();

    const target = FLAMES[1].id as FlameId;
    await act(async () => {
      latest.setFlameStyle(target);
    });

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...loaded, flameStyle: target });
  });

  test('saved object deep-equals the loaded settings apart from the changed field', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'amber' as FlameId };
    mockedLoad.mockResolvedValue(loaded);
    await renderProbe();

    await act(async () => {
      latest.setFlameStyle('crimson' as FlameId);
    });

    const saved = mockedSave.mock.calls[0][0];
    expect(saved).toEqual({ ...loaded, flameStyle: 'crimson' });
    expect(Object.keys(saved).sort()).toEqual(Object.keys(loaded).sort());
  });

  test('an unknown id leaves state unchanged and does not call saveSettings', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS };
    mockedLoad.mockResolvedValue(loaded);
    await renderProbe();

    await act(async () => {
      latest.setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest.settings).toEqual(loaded);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failing save does not throw or revert the in-memory selection', async () => {
    mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
    mockedSave.mockRejectedValue(new Error('disk full'));
    await renderProbe();

    const target = FLAMES[1].id as FlameId;
    await act(async () => {
      latest.setFlameStyle(target);
    });
    // Let the rejected save promise settle through its catch handler.
    await act(async () => {});

    expect(latest.settings.flameStyle).toBe(target);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

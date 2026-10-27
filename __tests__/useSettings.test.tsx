/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes hook state through a ref-like holder so tests
 * can drive the hook without native UI. The settings store is mocked so
 * AsyncStorage is never touched directly and no real I/O happens.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings } from '../src/data/settingsStore';
import type { FlameId } from '../src/domain/flames';

// Replace the real store with jest mocks; DEFAULT_SETTINGS stays as the real constant.
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

// Holder object whose `current` field is updated by the probe on every render.
// Mutating a property of a holder created outside render is avoided by using
// a ref-style container that the probe writes to through a callback.
interface Holder {
  current: UseSettings | undefined;
}

const holder: Holder = { current: undefined };
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe({ onRender }: { onRender: (value: UseSettings) => void }) {
  const hook = useSettings();
  // Report the latest hook value to the test via the callback during render.
  onRender(hook);
  return <Text>{hook.settings.flameStyle}</Text>;
}

// Render the probe inside act so effects and state updates flush.
function renderProbe() {
  act(() => {
    rendered = ReactTestRenderer.create(
      <Probe
        onRender={value => {
          holder.current = value;
        }}
      />,
    );
  });
}

// Read the latest hook value, failing loudly if the probe never rendered.
function latest(): UseSettings {
  if (!holder.current) {
    throw new Error('Probe has not rendered yet');
  }
  return holder.current;
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  mockedSave.mockResolvedValue(undefined);
  holder.current = undefined;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings initial load', () => {
  test('starts with DEFAULT_SETTINGS and ready=false while loading', () => {
    // Keep the load pending so we can observe the initial state.
    mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));
    renderProbe();

    expect(latest().settings).toEqual(DEFAULT_SETTINGS);
    expect(latest().ready).toBe(false);
  });

  test('becomes ready with the loaded settings once loadSettings resolves', async () => {
    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId };
    mockedLoad.mockResolvedValue(loaded);
    renderProbe();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest().ready).toBe(true);
    expect(latest().settings).toEqual(loaded);
  });

  test('does not update state if unmounted before the load resolves', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );
    renderProbe();
    const snapshotBeforeUnmount = latest();

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: 'crimson' as FlameId });
      await Promise.resolve();
    });

    // The hook must not have pushed the late result into state after unmount.
    expect(holder.current).toBe(snapshotBeforeUnmount);
    expect(snapshotBeforeUnmount.ready).toBe(false);
    expect(snapshotBeforeUnmount.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('useSettings.setFlameStyle', () => {
  beforeEach(async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    renderProbe();
    await act(async () => {
      await Promise.resolve();
    });
  });

  test('a valid catalog id updates settings.flameStyle', () => {
    act(() => {
      latest().setFlameStyle('crimson' as FlameId);
    });

    expect(latest().settings.flameStyle).toBe('crimson');
  });

  test('a valid catalog id is persisted with the new settings', () => {
    act(() => {
      latest().setFlameStyle('crimson' as FlameId);
    });

    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      flameStyle: 'crimson',
    });
  });

  test('an unknown id is ignored and does not call saveSettings', () => {
    const before = latest().settings;

    act(() => {
      latest().setFlameStyle('not-a-real-flame' as FlameId);
    });

    expect(latest().settings).toEqual(before);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a failing save does not throw or revert the in-memory selection', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));

    act(() => {
      latest().setFlameStyle('crimson' as FlameId);
    });
    await act(async () => {
      await Promise.resolve();
    });

    // Persistence is fire-and-forget: the UI keeps the new style.
    expect(latest().settings.flameStyle).toBe('crimson');
  });
});

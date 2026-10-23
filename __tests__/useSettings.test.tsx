/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes the hook's state through a mutable holder so tests
 * can drive setFlameStyle and unmount. The settings store is mocked, so no real
 * AsyncStorage is touched and every test is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { flameById, type FlameId } from '../src/domain/flames';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';

// Replace the real persistence layer with jest mocks. The factory keeps
// DEFAULT_SETTINGS as the real value so the hook's initial state matches production.
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

// Holder that the probe writes into on every render, so tests can read the latest hook result.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  latest = useSettings();
  return null;
}

// Pick a real catalog flame other than the default, so setFlameStyle has a valid target.
function nonDefaultFlameId(): FlameId {
  const defaultId = DEFAULT_SETTINGS.flameStyle;
  const candidate = (['crimson', 'sapphire'] as FlameId[]).find(id => id !== defaultId);
  if (!candidate) {
    throw new Error('expected a non-default flame in the catalog');
  }
  return candidate;
}

// Flush pending promise callbacks so a resolved loadSettings reaches the hook's state.
async function flushPromises() {
  await act(async () => {
    await Promise.resolve();
  });
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
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
  test('starts with DEFAULT_SETTINGS and ready=false until load resolves', async () => {
    // Keep the load pending so we can observe the pre-load state.
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

    const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
    await act(async () => {
      resolveLoad(loaded);
    });
    await flushPromises();

    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(loaded);
  });

  test('becomes ready with the loaded settings when the store returns defaults', async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    await flushPromises();

    expect(mockedLoad).toHaveBeenCalledTimes(1);
    expect(latest.ready).toBe(true);
    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  });
});

describe('setFlameStyle', () => {
  beforeEach(async () => {
    mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    await flushPromises();
  });

  test('updates flameStyle and persists when given a valid catalog id', async () => {
    const id = nonDefaultFlameId();

    await act(async () => {
      latest.setFlameStyle(id);
    });

    expect(latest.settings.flameStyle).toBe(id);
    expect(mockedSave).toHaveBeenCalledTimes(1);
    expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: id });
  });

  test('ignores an unknown id: state and saveSettings stay untouched', async () => {
    const before = latest.settings;
    const bogus = 'not-a-real-flame' as FlameId;

    // Sanity check: the catalog resolves the bogus id to a different (base) flame.
    expect(flameById(bogus).id).not.toBe(bogus);

    await act(async () => {
      latest.setFlameStyle(bogus);
    });

    expect(latest.settings).toBe(before);
    expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
    expect(mockedSave).not.toHaveBeenCalled();
  });

  test('a save failure does not throw or revert the in-memory selection', async () => {
    mockedSave.mockRejectedValue(new Error('disk full'));
    const id = nonDefaultFlameId();

    await act(async () => {
      latest.setFlameStyle(id);
    });
    await flushPromises();

    expect(latest.settings.flameStyle).toBe(id);
    expect(mockedSave).toHaveBeenCalledTimes(1);
  });
});

describe('unmount guard', () => {
  test('a load that resolves after unmount does not update state', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockedLoad.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );

    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    // Capture the last rendered value, then unmount before the load settles.
    const beforeUnmount = latest;
    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() });
    });
    await flushPromises();

    // No state update means the probe never re-rendered with the loaded value.
    expect(latest).toBe(beforeUnmount);
    expect(latest.ready).toBe(false);
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

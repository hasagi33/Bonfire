/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * A tiny probe component exposes the hook's return value through a ref so tests can
 * inspect settings, trigger setFlameStyle, and unmount to exercise the unmount guard.
 * The settings store is mocked so no AsyncStorage or real I/O is touched.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import { FLAMES, flameById } from '../src/domain/flames';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';

// Replace the persistence layer with jest mocks. DEFAULT_SETTINGS is passed through
// unchanged so the hook's initial state matches the real default object.
jest.mock('../src/data/settingsStore', () => {
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockLoadSettings = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockSaveSettings = saveSettings as jest.MockedFunction<typeof saveSettings>;

// Holds the most recent hook return value so tests can read and call it.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  latest = useSettings();
  return <Text>{latest.settings.flameStyle}</Text>;
}

// Renders the probe and flushes pending effects (including the loadSettings promise).
async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  await act(async () => {});
}

// Returns a catalog flame id that differs from the default, so a change is observable.
function nonDefaultFlameId() {
  const other = FLAMES.find(f => f.id !== DEFAULT_SETTINGS.flameStyle);
  if (!other) {
    throw new Error('catalog must contain more than one flame');
  }
  return other.id;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadSettings.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockSaveSettings.mockResolvedValue(undefined);
  latest = undefined as unknown as UseSettings;
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

describe('useSettings initial load', () => {
  test('starts with DEFAULT_SETTINGS and ready=false before load completes', () => {
    // Keep loadSettings pending so we observe the pre-load state.
    mockLoadSettings.mockReturnValue(new Promise<Settings>(() => {}));
    act(() => {
      rendered = ReactTestRenderer.create(<Probe />);
    });

    expect(latest.settings).toEqual(DEFAULT_SETTINGS);
    expect(latest.ready).toBe(false);
  });

  test('replaces defaults with loaded values and flips ready to true', async () => {
    const saved: Settings = { ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() };
    mockLoadSettings.mockResolvedValue(saved);

    await renderProbe();

    expect(mockLoadSettings).toHaveBeenCalledTimes(1);
    expect(latest.settings).toEqual(saved);
    expect(latest.ready).toBe(true);
  });
});

describe('setFlameStyle', () => {
  test('valid catalog id updates settings.flameStyle and persists deep-equal data', async () => {
    await renderProbe();
    const id = nonDefaultFlameId();

    await act(async () => {
      latest.setFlameStyle(id);
    });

    expect(latest.settings.flameStyle).toBe(id);
    expect(mockSaveSettings).toHaveBeenCalledTimes(1);
    expect(mockSaveSettings).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: id });
  });

  test('unknown id leaves state and storage untouched', async () => {
    await renderProbe();
    const before = latest.settings;

    await act(async () => {
      // Cast to exercise the runtime guard against an id outside the catalog.
      latest.setFlameStyle('not-a-real-flame' as Parameters<UseSettings['setFlameStyle']>[0]);
    });

    expect(latest.settings).toEqual(before);
    expect(latest.settings.flameStyle).toBe(flameById(DEFAULT_SETTINGS.flameStyle).id);
    expect(mockSaveSettings).not.toHaveBeenCalled();
  });

  test('swallows save failures so the UI state still updates', async () => {
    mockSaveSettings.mockRejectedValue(new Error('disk full'));
    await renderProbe();
    const id = nonDefaultFlameId();

    await act(async () => {
      latest.setFlameStyle(id);
    });

    expect(latest.settings.flameStyle).toBe(id);
    expect(mockSaveSettings).toHaveBeenCalledTimes(1);
  });
});

describe('unmount guard', () => {
  test('a pending load does not update state after unmount', async () => {
    let resolveLoad!: (value: Settings) => void;
    mockLoadSettings.mockReturnValue(
      new Promise<Settings>(resolve => {
        resolveLoad = resolve;
      }),
    );
    await act(async () => {
      rendered = ReactTestRenderer.create(<Probe />);
    });
    const snapshot = latest;

    act(() => {
      rendered?.unmount();
    });
    rendered = null;

    await act(async () => {
      resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: nonDefaultFlameId() });
    });

    // Probe's last render should be unchanged: the guard blocked the post-unmount update.
    expect(latest).toBe(snapshot);
    expect(snapshot.ready).toBe(false);
    expect(snapshot.settings).toEqual(DEFAULT_SETTINGS);
  });
});

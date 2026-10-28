/**
 * useSettings.test.tsx — hook tests for persisted user settings (flame style).
 *
 * The settings store is mocked so no AsyncStorage is touched. A tiny probe
 * component exposes hook state through module-level variables so tests can
 * drive loading, flame selection, and persistence failures deterministically.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';
import { FLAMES, type FlameId } from '../src/domain/flames';

jest.mock('../src/data/settingsStore', () => {
  // Keep the real DEFAULT_SETTINGS so tests compare against the true defaults.
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

// Probe component: stores the hook result in a module variable for assertions.
function Probe() {
  const value = useSettings();
  React.useEffect(() => {
    latest = value;
  });
  return <Text>{value.settings.flameStyle}</Text>;
}

async function renderProbe() {
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
}

// Picks a catalog flame that differs from the default so the update is observable.
function pickNonDefaultFlame(): FlameId {
  const candidate = FLAMES.find(flame => flame.id !== DEFAULT_SETTINGS.flameStyle);
  if (!candidate) {
    throw new Error('catalog must contain a flame other than the default');
  }
  return candidate.id;
}

beforeEach(() => {
  jest.clearAllMocks();
  latest = undefined as unknown as UseSettings;
  mockedLoad.mockResolvedValue({ ...DEFAULT_SETTINGS });
  mockedSave.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts from DEFAULT_SETTINGS and becomes ready after loading', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValueOnce(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );

  await renderProbe();
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);

  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: pickNonDefaultFlame() };
  await act(async () => {
    resolveLoad(loaded);
  });

  expect(latest.settings).toEqual(loaded);
  expect(latest.ready).toBe(true);
});

test('setFlameStyle with a catalog id updates state and saves deep-equal data', async () => {
  await renderProbe();
  const id = pickNonDefaultFlame();

  await act(async () => {
    latest.setFlameStyle(id);
  });

  expect(latest.settings.flameStyle).toBe(id);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: id });
});

test('setFlameStyle with an unknown id leaves state and saveSettings untouched', async () => {
  await renderProbe();
  const before = latest.settings;

  await act(async () => {
    latest.setFlameStyle('not-a-real-flame' as FlameId);
  });

  expect(latest.settings).toEqual(before);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('a rejected saveSettings is swallowed and state still updates', async () => {
  mockedSave.mockRejectedValueOnce(new Error('disk full'));
  await renderProbe();
  const id = pickNonDefaultFlame();

  await act(async () => {
    latest.setFlameStyle(id);
    // Let the swallowed rejection settle so it cannot leak as an unhandled error.
    await Promise.resolve();
  });

  expect(latest.settings.flameStyle).toBe(id);
  expect(mockedSave).toHaveBeenCalledTimes(1);
});

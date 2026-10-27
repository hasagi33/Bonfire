/**
 * useSettings.test.tsx — hook tests for persisted user settings.
 *
 * The settings store is mocked so AsyncStorage is never touched directly. A tiny
 * probe component exposes hook state through a mutable reference so tests can
 * drive loading, flame selection, and unmount behavior without native UI.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { useSettings, type UseSettings } from '../src/hooks/useSettings';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../src/data/settingsStore';
import { flameById, type FlameId } from '../src/domain/flames';

jest.mock('../src/data/settingsStore', () => {
  // Keep the real defaults shape, but replace the storage-backed functions with mocks.
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

// Latest hook result, updated by the probe on every render.
let latest!: UseSettings;
let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function Probe() {
  latest = useSettings();
  return null;
}

// Pick a catalog id that is guaranteed to differ from the default style.
function otherFlameId(): FlameId {
  const current = DEFAULT_SETTINGS.flameStyle;
  const candidates: FlameId[] = ['crimson', 'sapphire', 'amber'];
  const pick = candidates.find(id => id !== current && flameById(id).id === id);
  if (!pick) throw new Error('no alternate flame id available in test catalog');
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

test('starts with DEFAULT_SETTINGS and ready=false, then ready=true once load resolves', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: otherFlameId() };
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  // Before the load resolves, the hook reports the defaults and is not ready.
  expect(latest.settings).toEqual(DEFAULT_SETTINGS);
  expect(latest.ready).toBe(false);

  await act(async () => {
    resolveLoad(loaded);
  });

  expect(latest.ready).toBe(true);
  expect(latest.settings).toEqual(loaded);
  expect(mockedLoad).toHaveBeenCalledTimes(1);
});

test('setFlameStyle with a valid catalog id updates flameStyle and saves deep-equal data', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  const target = otherFlameId();
  await act(async () => {
    latest.setFlameStyle(target);
  });

  expect(latest.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  // The saved object must equal the full updated settings, not just the flame id.
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id is ignored and does not call saveSettings', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });

  const bogus = 'not-a-real-flame' as FlameId;
  await act(async () => {
    latest.setFlameStyle(bogus);
  });

  expect(latest.settings.flameStyle).toBe(DEFAULT_SETTINGS.flameStyle);
  expect(mockedSave).not.toHaveBeenCalled();
});

test('unmounting before load resolves does not set state', async () => {
  let resolveLoad!: (value: Settings) => void;
  mockedLoad.mockReturnValue(
    new Promise<Settings>(resolve => {
      resolveLoad = resolve;
    }),
  );
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe />);
  });
  const snapshotBeforeUnmount = latest;

  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: otherFlameId() });
  });

  // The hook must not update state after unmount, so the last render stays unready.
  expect(latest).toBe(snapshotBeforeUnmount);
  expect(latest.ready).toBe(false);
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

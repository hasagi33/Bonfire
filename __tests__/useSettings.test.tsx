/**
 * useSettings.test.tsx — hook tests for persisted user preferences.
 *
 * The settings store is mocked so AsyncStorage is never touched directly. A small
 * probe component reports hook state through a callback prop so tests can drive
 * loading, flame style changes, and unmount behavior without native UI.
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
  const actual = jest.requireActual('../src/data/settingsStore');
  return {
    ...actual,
    loadSettings: jest.fn(),
    saveSettings: jest.fn(),
  };
});

const mockedLoad = loadSettings as jest.MockedFunction<typeof loadSettings>;
const mockedSave = saveSettings as jest.MockedFunction<typeof saveSettings>;

let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

// Minimal component that runs the hook and reports its latest return value
// through a callback prop, keeping render itself free of side effects.
function Probe({ onRender }: { onRender: (value: UseSettings) => void }) {
  const value = useSettings();
  onRender(value);
  return null;
}

// Renders the probe and flushes pending effects/promises so loading settles.
// Returns a getter that always yields the hook's most recent value.
async function renderProbe() {
  let latest: UseSettings | undefined;
  const onRender = (value: UseSettings) => {
    latest = value;
  };
  await act(async () => {
    rendered = ReactTestRenderer.create(<Probe onRender={onRender} />);
  });
  return {
    get current(): UseSettings {
      if (!latest) {
        throw new Error('probe has not rendered');
      }
      return latest;
    },
  };
}

// Returns a valid, non-default catalog id so tests can detect a real change.
function someOtherFlame(): FlameId {
  const ids = ['crimson', 'sapphire'] as FlameId[];
  const pick = ids.find(id => id !== DEFAULT_SETTINGS.flameStyle);
  if (!pick) {
    throw new Error('expected at least one alternate flame id');
  }
  return pick;
}

beforeEach(() => {
  mockedLoad.mockReset();
  mockedSave.mockReset();
  mockedSave.mockResolvedValue(undefined);
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('starts with DEFAULT_SETTINGS and ready=false while loading', async () => {
  // Never resolves during this test, so the hook stays in its loading state.
  mockedLoad.mockReturnValue(new Promise<Settings>(() => {}));

  const probe = await renderProbe();

  expect(probe.current.settings).toEqual(DEFAULT_SETTINGS);
  expect(probe.current.ready).toBe(false);
});

test('flips ready to true and adopts the loaded settings', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: someOtherFlame() };
  mockedLoad.mockResolvedValue(loaded);

  const probe = await renderProbe();

  expect(mockedLoad).toHaveBeenCalledTimes(1);
  expect(probe.current.ready).toBe(true);
  expect(probe.current.settings).toEqual(loaded);
});

test('setFlameStyle with a valid catalog id updates state and saves the new settings', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  const probe = await renderProbe();

  const target = someOtherFlame();
  act(() => {
    probe.current.setFlameStyle(target);
  });

  expect(probe.current.settings.flameStyle).toBe(target);
  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, flameStyle: target });
});

test('setFlameStyle with an unknown id is ignored and does not save', async () => {
  mockedLoad.mockResolvedValue(DEFAULT_SETTINGS);
  const probe = await renderProbe();

  // flameById falls back to the base flame for unknown ids, so this id will not
  // resolve to itself and the hook must refuse it.
  const bogus = 'not-a-real-flame' as FlameId;
  expect(flameById(bogus).id).not.toBe(bogus);

  act(() => {
    probe.current.setFlameStyle(bogus);
  });

  expect(probe.current.settings).toEqual(DEFAULT_SETTINGS);
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

  const probe = await renderProbe();
  const snapshotBeforeUnmount = probe.current;
  act(() => {
    rendered?.unmount();
  });
  rendered = null;

  await act(async () => {
    resolveLoad({ ...DEFAULT_SETTINGS, flameStyle: someOtherFlame() });
  });

  // The active guard means the late resolution must not update the probe's state.
  expect(probe.current).toBe(snapshotBeforeUnmount);
  expect(probe.current.ready).toBe(false);
  expect(probe.current.settings).toEqual(DEFAULT_SETTINGS);
  expect(errorSpy).not.toHaveBeenCalled();
  errorSpy.mockRestore();
});

test('saved settings deep-equal the loaded settings after a round trip', async () => {
  const loaded: Settings = { ...DEFAULT_SETTINGS, flameStyle: someOtherFlame() };
  mockedLoad.mockResolvedValue(loaded);
  const probe = await renderProbe();

  // Re-select the already loaded flame; the saved object must match what was loaded.
  act(() => {
    probe.current.setFlameStyle(loaded.flameStyle);
  });

  expect(mockedSave).toHaveBeenCalledTimes(1);
  expect(mockedSave.mock.calls[0][0]).toEqual(loaded);
  expect(probe.current.settings).toEqual(loaded);
});

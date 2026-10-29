/**
 * BonfireScreen.health.test.tsx — render wiring for Fire Health.
 *
 * Seeds persisted score history, renders the real screen, then verifies the
 * visible caption label and the exact health state handed to the flame layer.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BonfireScreen from '../src/screens/BonfireScreen';
import { addDays, todayKey } from '../src/domain/dates';
import type { Entries, Score } from '../src/domain/fire';

const STORAGE_KEY = 'bonfire.entries.v1';
const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function build(entries: [string, Score][]): Entries {
  const out: Entries = {};
  for (const [date, score] of entries) out[date] = score;
  return out;
}

async function seedEntries(entries: Entries) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

async function renderScreen() {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <BonfireScreen />
      </SafeAreaProvider>,
    );
  });
  await act(async () => {});
  rendered = tree;
  return tree;
}

function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (node: ReactTestRenderer.ReactTestRendererJSON | string | null): void => {
    if (node == null) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    (node.children ?? []).forEach(walk);
  };
  const json = tree.toJSON();
  (Array.isArray(json) ? json : [json]).forEach(walk);
  return out.join('');
}

function findFlame(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    node => node.props && typeof node.props.fire === 'object' && node.props.palette && 'dim' in node.props,
  );
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

test('renders Bright Fire Health for a perfect week and passes the state to the flame', async () => {
  const today = todayKey();
  await seedEntries(
    build(Array.from({ length: 7 }, (_, index) => [addDays(today, index - 7), 5] as [string, Score])),
  );

  const tree = await renderScreen();
  const flame = findFlame(tree);

  expect(allText(tree)).toContain('Bright');
  expect(allText(tree)).not.toMatch(/fire health Bright/i);
  expect(flame.props.health).toMatchObject({
    name: 'bright',
    label: 'Bright',
    visible: true,
    sampleCount: 7,
  });
});

test('does not count the current day in Fire Health', async () => {
  const today = todayKey();
  await seedEntries(
    build([
      [addDays(today, -3), 1],
      [addDays(today, -2), 2],
      [addDays(today, -1), 2],
      [today, 5],
    ]),
  );

  const tree = await renderScreen();
  const flame = findFlame(tree);

  expect(flame.props.fire.state).toBe('lit');
  expect(flame.props.health).toMatchObject({
    name: 'faint',
    label: 'Faint',
    visible: true,
    sampleCount: 3,
  });
  expect(allText(tree)).toContain('Faint');
  expect(allText(tree)).not.toMatch(/fire health Faint/i);
});

test('suppresses Fire Health label and flame visibility state when fire is out', async () => {
  const today = todayKey();
  await seedEntries(build([[addDays(today, -3), 5]]));

  const tree = await renderScreen();
  const flame = findFlame(tree);

  expect(flame.props.fire.state).toBe('out');
  expect(flame.props.health.visible).toBe(false);
  expect(allText(tree)).not.toMatch(/fire health/i);
});

test('does not render the legacy fire subline under the logs', async () => {
  const today = todayKey();
  await seedEntries(
    build(Array.from({ length: 30 }, (_, index) => [addDays(today, index - 29), 5] as [string, Score])),
  );

  const tree = await renderScreen();
  const text = allText(tree);

  expect(text).toContain('INFERNO');
  expect(text).not.toContain('unstoppable');
});

/**
 * useFlamePulses.test.tsx — hook memoization and exposed pulse constants.
 *
 * A tiny probe makes the hook observable without involving the Skia scene.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { useFlamePulses, type UseFlamePulses } from '@hooks/useFlamePulses';
import type { Entries, FireState } from '@domain/fire';

let latest!: UseFlamePulses;

const litFire: FireState = {
  state: 'lit',
  strength: 10,
  everLit: true,
  label: { word: 'Steady', sub: 'burning well' },
};

function Probe({ entries, today, fire = litFire }: { entries: Entries; today: string; fire?: FireState }) {
  const result = useFlamePulses(entries, today, fire);
  React.useEffect(() => {
    latest = result;
  }, [result]);
  return <Text>{result.pulse.family ?? 'none'}</Text>;
}

function render(entries: Entries, today: string, fire?: FireState) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Probe entries={entries} today={today} fire={fire} />);
  });
  return tree;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
});

test('derives high-score pulse and exposes duration constants', () => {
  render(
    {
      '2026-06-01': 3,
      '2026-06-02': 4,
      '2026-06-03': 4,
      '2026-06-04': 5,
    },
    '2026-06-04',
  );

  expect(latest.pulse.family).toBe('highScore');
  expect(latest.durations).toEqual({
    highScoreActiveMs: 1800,
    highScoreFadeMs: 600,
    consistencyActiveMs: 2600,
    consistencyFadeMs: 800,
  });
});

test('plays a qualifying pulse once, fades it, then settles without replaying same date', () => {
  const qualifying = {
    '2026-06-01': 3,
    '2026-06-02': 4,
    '2026-06-03': 4,
    '2026-06-04': 5,
  } satisfies Entries;
  const tree = render(qualifying, '2026-06-04');

  expect(latest.pulse).toMatchObject({
    active: true,
    family: 'highScore',
    visualWeight: 1,
  });

  act(() => {
    jest.advanceTimersByTime(1800);
  });
  expect(latest.pulse).toMatchObject({
    active: true,
    family: 'highScore',
    visualWeight: 0,
  });

  act(() => {
    jest.advanceTimersByTime(600);
  });
  expect(latest.pulse).toMatchObject({
    active: false,
    family: null,
    visualWeight: 0,
  });

  act(() => {
    tree.update(<Probe entries={qualifying} today="2026-06-04" />);
  });
  expect(latest.pulse.active).toBe(false);
});

test('derives cooldown, not-lit, consistency tint, and memoization boundaries', () => {
  const qualifying = {
    '2026-06-01': 4,
    '2026-06-02': 4,
    '2026-06-03': 4,
    '2026-06-04': 4,
    '2026-06-05': 5,
  } satisfies Entries;
  const tree = render(qualifying, '2026-06-05');
  const first = latest.pulse;

  expect(first.family).toBe('highScore');
  expect(first.consistencyTint).toBe(true);

  act(() => {
    tree.update(<Probe entries={qualifying} today="2026-06-05" />);
  });
  expect(latest.pulse).toBe(first);

  const unlit = { ...litFire, state: 'out' as const };
  act(() => {
    tree.update(<Probe entries={qualifying} today="2026-06-05" fire={unlit} />);
  });
  expect(latest.pulse.suppressedReason).toBe('not-lit');
});

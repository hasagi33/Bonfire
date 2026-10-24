/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the row's status text for unlocked/locked/expired states, a11y labels,
 * the equip path for unlocked rows, and the locked-tap rejection cue (shown,
 * then cleared after REJECT_MS via fake timers). The row's pure helpers
 * (statusFor, swatchColors, REJECT_MS) are module-private in FlameRow.tsx, so
 * they are exercised through the rendered component rather than imported.
 *
 * Reanimated and expo-linear-gradient are mocked so the animated shake/flash is
 * driven by rendered state, not by frame timing.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// Mirrors the module-private REJECT_MS in FlameRow.tsx.
const REJECT_MS = 250;

// ---- Mocks ----------------------------------------------------------------

// LinearGradient: render as a plain View-like host element so it stays in the tree.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: object) => React.createElement(View, props),
  };
});

// Reanimated: pass-through Animated.View, inert shared values, and no-op
// animation builders. Shake motion is not frame-checked; only state is asserted.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Animated = {
    View: (props: object) => React.createElement(View, props),
  };
  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (toValue: number) => toValue,
  };
});

// ---- Fixtures -------------------------------------------------------------

const amberFlame = {
  id: 'amber',
  name: 'Amber',
  achievement: null,
  gradient: ['#fff1c1', '#ffae3b', '#ff7a18'],
  embered: { core: '#5a3a1a', gold: '#6b4a24', amber: '#7a4f22', ember: '#4a2a12', red: '#3a1a0a' },
  palette: { core: '#fff1c1' },
} as unknown as FlameStyle;

const streakFlame = {
  id: 'sodium',
  name: 'Sodium',
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
  gradient: ['#ffffff', '#e0f0ff', '#8ab4ff'],
  embered: { core: '#333', gold: '#444', amber: '#555', ember: '#666', red: '#777' },
  palette: { core: '#ffffff' },
} as unknown as FlameStyle;

const timeFlame = {
  id: 'toxic',
  name: 'Toxic',
  achievement: { type: 'time', requirement: 'Log 3 days in a row', windowDays: 7 },
  gradient: ['#eaffea', '#7dff7d', '#1aa31a'],
  embered: { core: '#222', gold: '#333', amber: '#444', ember: '#555', red: '#666' },
  palette: { core: '#eaffea' },
} as unknown as FlameStyle;

function state(partial: Partial<AchievementState> & { flameId: string }): AchievementState {
  return {
    unlocked: false,
    progress: { value: 0, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...partial,
  } as AchievementState;
}

function render(props: Partial<React.ComponentProps<typeof FlameRow>> = {}) {
  const onPress = jest.fn();
  const base = {
    flame: amberFlame,
    state: state({ flameId: 'amber', unlocked: true, progress: { value: 1, target: 1 } }),
    active: false,
    onPress,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<FlameRow {...base} {...props} />);
  });
  return { tree, onPress };
}

function findRow(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

function allStrings(tree: ReactTestRenderer.ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (n: ReactTestRenderer.ReactTestRendererJSON | string | null): void => {
    if (n == null) return;
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    (n.children ?? []).forEach(walk);
  };
  const json = tree.toJSON();
  (Array.isArray(json) ? json : [json]).forEach(walk);
  return out.join('|');
}

// ---- FlameRow component ---------------------------------------------------

describe('FlameRow', () => {
  test('unlocked base row renders name, "Unlocked" status and an enabled radio', () => {
    const { tree } = render();
    const text = allStrings(tree);
    expect(text).toContain('Amber');
    expect(text).toContain('Unlocked');
    const row = findRow(tree);
    expect(row.props.accessibilityState.disabled).toBe(false);
    expect(row.props.accessibilityLabel).toBe('Amber. Unlocked');
  });

  test('active flame shows the check mark and "Active" in its label', () => {
    const { tree } = render({ active: true });
    expect(allStrings(tree)).toContain('✓');
    expect(findRow(tree).props.accessibilityLabel).toContain('. Active');
    expect(findRow(tree).props.accessibilityState.selected).toBe(true);
  });

  test('unlocked time flame shows the countdown and clamps negative daysLeft to 0', () => {
    const { tree } = render({
      flame: timeFlame,
      state: state({ flameId: 'toxic', unlocked: true, daysLeft: -4 }),
    });
    expect(allStrings(tree)).toContain('Unlocked · 0d left');
  });

  test('unlocked time flame shows positive countdown', () => {
    const { tree } = render({
      flame: timeFlame,
      state: state({ flameId: 'toxic', unlocked: true, daysLeft: 5 }),
    });
    expect(allStrings(tree)).toContain('Unlocked · 5d left');
  });

  test('locked streak row is announced as disabled with a "Locked — " prefix and counter', () => {
    const { tree } = render({
      flame: streakFlame,
      state: state({ flameId: 'sodium', progress: { value: 2, target: 7 } }),
    });
    const row = findRow(tree);
    expect(row.props.accessibilityState.disabled).toBe(true);
    expect(row.props.accessibilityLabel).toBe('Sodium. Locked — Keep a 7-day run · 2/7');
  });

  test('locked streak progress counter clamps value to target', () => {
    const { tree } = render({
      flame: streakFlame,
      state: state({ flameId: 'sodium', progress: { value: 9, target: 7 } }),
    });
    expect(allStrings(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('expired time flame prompts re-earn', () => {
    const { tree } = render({
      flame: timeFlame,
      state: state({ flameId: 'toxic', expired: true, progress: { value: 3, target: 3 } }),
    });
    expect(allStrings(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });

  test('justUnlocked prefixes the status with "Just unlocked! "', () => {
    const { tree } = render({
      flame: timeFlame,
      state: state({ flameId: 'toxic', unlocked: true, daysLeft: 6 }),
      justUnlocked: true,
    });
    expect(allStrings(tree)).toContain('Just unlocked! Unlocked · 6d left');
  });

  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render();
    act(() => {
      findRow(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('pressing a locked row never calls onPress', () => {
    jest.useFakeTimers();
    const { tree, onPress } = render({
      flame: streakFlame,
      state: state({ flameId: 'sodium', progress: { value: 1, target: 7 } }),
    });
    act(() => {
      findRow(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('pressing a locked row shows the rejection cue, cleared after REJECT_MS', () => {
    jest.useFakeTimers();
    const { tree } = render({
      flame: streakFlame,
      state: state({ flameId: 'sodium', progress: { value: 1, target: 7 } }),
    });
    const cueId = 'flame-reject-sodium';
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);

    act(() => {
      findRow(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);
    jest.useRealTimers();
  });

  test('pressing an unlocked row shows no rejection cue', () => {
    const { tree } = render();
    act(() => {
      findRow(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-amber' }).length).toBe(0);
  });
});

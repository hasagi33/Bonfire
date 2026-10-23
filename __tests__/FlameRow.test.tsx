/**
 * FlameRow.test.tsx — unit tests for the FlameRow gallery row component.
 *
 * Covers the status text derivation (statusFor), the swatch color selection
 * (swatchColors via the swatch gradient props), the accessibility label
 * prefixes, the just-unlocked celebration prefix, and the press behavior:
 * unlocked rows equip (onPress with the flame id), locked rows never equip
 * and instead trigger the brief rejection cue state (FR-001, FR-002).
 *
 * react-native-reanimated and expo-linear-gradient are replaced with
 * lightweight stubs so the tests run deterministically in Jest without the
 * native runtime. No network access is performed.
 *
 * Teardown note: every test that creates a renderer unmounts it at the end,
 * and every test that starts fake timers flushes them and restores real timers
 * before finishing. This prevents pending rejection-cue timeouts from firing
 * after the Jest environment is torn down.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// ---- Lightweight stubs -------------------------------------------------------

// Reanimated stub: the shared value is a plain mutable box, the animated style
// is evaluated directly, and the animation helpers return their target value
// so the component can assign them without a native runtime.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (fn: () => object) => fn(),
    useSharedValue: (initial: number) => ({ value: initial }),
    withSequence: (...values: unknown[]) => values[values.length - 1],
    withTiming: (value: number) => value,
  };
});

// LinearGradient stub: renders a plain View that exposes its colors prop so the
// tests can inspect which palette was chosen.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: { colors: string[]; testID?: string }) =>
      React.createElement(View, { testID: props.testID, colors: props.colors }),
  };
});

// ---- Fixtures ----------------------------------------------------------------

const BASE_FLAME: FlameStyle = {
  id: 'amber',
  name: 'Amber',
  achievement: null,
  gradient: ['#fff4d6', '#ffd27a', '#ffae3b', '#ff7a18', '#c2410c'],
  embered: {
    core: '#3a2a1a',
    gold: '#4a3520',
    amber: '#5a3d22',
    ember: '#6a4426',
    red: '#7a4a2a',
  },
  palette: { core: '#fff4d6' },
} as unknown as FlameStyle;

const STREAK_FLAME: FlameStyle = {
  id: 'sodium',
  name: 'Sodium',
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
  gradient: ['#ffffff', '#fde68a', '#fbbf24', '#f59e0b', '#b45309'],
  embered: {
    core: '#2a2a2a',
    gold: '#303030',
    amber: '#363636',
    ember: '#3c3c3c',
    red: '#424242',
  },
  palette: { core: '#ffffff' },
} as unknown as FlameStyle;

const TIME_FLAME: FlameStyle = {
  id: 'toxic',
  name: 'Toxic',
  achievement: { type: 'time', requirement: 'Log 3 days in a row' },
  gradient: ['#eaffea', '#86efac', '#22c55e', '#15803d', '#14532d'],
  embered: {
    core: '#1a2a1a',
    gold: '#203020',
    amber: '#263626',
    ember: '#2c3c2c',
    red: '#324232',
  },
  palette: { core: '#eaffea' },
} as unknown as FlameStyle;

function lockedState(flameId: string, value = 0, target = 7): AchievementState {
  return {
    flameId,
    unlocked: false,
    progress: { value, target },
    achievementDay: null,
    daysLeft: null,
    expired: false,
  } as unknown as AchievementState;
}

function unlockedState(flameId: string, daysLeft: number | null = null): AchievementState {
  return {
    flameId,
    unlocked: true,
    progress: { value: 1, target: 1 },
    achievementDay: '2026-06-10',
    daysLeft,
    expired: false,
  } as unknown as AchievementState;
}

function expiredState(flameId: string): AchievementState {
  return {
    flameId,
    unlocked: false,
    progress: { value: 3, target: 3 },
    achievementDay: '2026-05-01',
    daysLeft: -3,
    expired: true,
  } as unknown as AchievementState;
}

// ---- Helpers -----------------------------------------------------------------

type Renderer = ReactTestRenderer.ReactTestRenderer;

// Renders a row and returns the renderer plus the onPress spy. Callers must
// unmount via `cleanup` (or rely on afterEach) so no timers outlive the test.
const mounted: Renderer[] = [];

function renderRow(props: {
  flame: FlameStyle;
  state: AchievementState;
  active?: boolean;
  justUnlocked?: boolean;
  onPress?: jest.Mock;
}) {
  const onPress = props.onPress ?? jest.fn();
  let tree!: Renderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={props.flame}
        state={props.state}
        active={props.active ?? false}
        justUnlocked={props.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  mounted.push(tree);
  return { tree, onPress };
}

function cleanup(tree: Renderer) {
  act(() => {
    tree.unmount();
  });
  const idx = mounted.indexOf(tree);
  if (idx >= 0) mounted.splice(idx, 1);
}

// Collect every rendered string child so text assertions stay readable.
function allText(tree: Renderer): string {
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
  return out.join('|');
}

function pressable(tree: Renderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

function gradientNode(tree: Renderer) {
  return tree.root.find(n => Array.isArray(n.props.colors) && n.props.colors.length > 0);
}

// Tear down every renderer and restore real timers so nothing leaks between tests.
afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers();
  });
  for (const tree of mounted.splice(0)) {
    act(() => {
      tree.unmount();
    });
  }
  jest.useRealTimers();
});

// ---- Tests -------------------------------------------------------------------

describe('FlameRow status text', () => {
  test('base flame (no achievement) always reads "Unlocked"', () => {
    const { tree } = renderRow({ flame: BASE_FLAME, state: unlockedState('amber') });
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows the day countdown', () => {
    const { tree } = renderRow({ flame: TIME_FLAME, state: unlockedState('toxic', 5) });
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative countdown to 0d left', () => {
    const { tree } = renderRow({ flame: TIME_FLAME, state: unlockedState('toxic', -2) });
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('locked streak flame shows requirement and progress counter', () => {
    const { tree } = renderRow({
      flame: STREAK_FLAME,
      state: lockedState('sodium', 4, 7),
    });
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('locked streak progress counter caps the value at the target', () => {
    const { tree } = renderRow({
      flame: STREAK_FLAME,
      state: lockedState('sodium', 9, 7),
    });
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('expired time flame shows the re-earn prompt', () => {
    const { tree } = renderRow({ flame: TIME_FLAME, state: expiredState('toxic') });
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });
});

describe('FlameRow accessibility', () => {
  test('unlocked row label has the flame name and status, no Locked prefix', () => {
    const { tree } = renderRow({ flame: BASE_FLAME, state: unlockedState('amber') });
    const label = pressable(tree).props.accessibilityLabel as string;
    expect(label).toBe('Amber. Unlocked');
    expect(label.startsWith('Locked')).toBe(false);
  });

  test('locked row label is prefixed with "Locked —"', () => {
    const { tree } = renderRow({
      flame: STREAK_FLAME,
      state: lockedState('sodium', 0, 7),
    });
    const label = pressable(tree).props.accessibilityLabel as string;
    expect(label.startsWith('Sodium. Locked — ')).toBe(true);
  });

  test('active row is marked selected and labelled Active', () => {
    const { tree } = renderRow({
      flame: BASE_FLAME,
      state: unlockedState('amber'),
      active: true,
    });
    const node = pressable(tree);
    expect(node.props.accessibilityState.selected).toBe(true);
    expect(node.props.accessibilityLabel).toContain('. Active');
  });

  test('locked row is announced as disabled', () => {
    const { tree } = renderRow({
      flame: STREAK_FLAME,
      state: lockedState('sodium'),
    });
    expect(pressable(tree).props.accessibilityState.disabled).toBe(true);
  });
});

describe('FlameRow just-unlocked celebration', () => {
  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = renderRow({
      flame: TIME_FLAME,
      state: unlockedState('toxic', 5),
      justUnlocked: true,
    });
    expect(allText(tree)).toContain('Just unlocked! Unlocked · 5d left');
  });

  test('without justUnlocked there is no celebration prefix', () => {
    const { tree } = renderRow({
      flame: TIME_FLAME,
      state: unlockedState('toxic', 5),
      justUnlocked: false,
    });
    expect(allText(tree)).not.toContain('Just unlocked!');
  });
});

describe('FlameRow press behavior', () => {
  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = renderRow({
      flame: BASE_FLAME,
      state: unlockedState('amber'),
    });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
    cleanup(tree);
  });

  test('pressing a locked row does NOT call onPress (FR-001)', () => {
    const { tree, onPress } = renderRow({
      flame: STREAK_FLAME,
      state: lockedState('sodium'),
    });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    cleanup(tree);
  });

  test('pressing a locked row shows the rejection cue, then clears it (FR-002)', () => {
    jest.useFakeTimers();
    const { tree } = renderRow({
      flame: STREAK_FLAME,
      state: lockedState('sodium'),
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);

    act(() => {
      pressable(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    // Flush the one-shot cue timer inside act so no state update leaks.
    act(() => {
      jest.runAllTimers();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
    cleanup(tree);
  });

  test('pressing an unlocked row shows no rejection cue', () => {
    const { tree } = renderRow({
      flame: BASE_FLAME,
      state: unlockedState('amber'),
    });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-amber' }).length).toBe(0);
    cleanup(tree);
  });
});

describe('FlameRow swatch colors', () => {
  test('unlocked row uses the full gradient colors', () => {
    const { tree } = renderRow({ flame: BASE_FLAME, state: unlockedState('amber') });
    expect(gradientNode(tree).props.colors).toEqual(BASE_FLAME.gradient);
  });

  test('locked row uses the embered stops instead of the full gradient', () => {
    const { tree } = renderRow({
      flame: STREAK_FLAME,
      state: lockedState('sodium'),
    });
    const e = STREAK_FLAME.embered;
    expect(gradientNode(tree).props.colors).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
  });
});

/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the pure helpers (swatchColors, statusFor) through the rendered
 * output, the accessibility contract, and the locked/unlocked press behavior
 * including the ~250ms rejection cue. Uses react-test-renderer and jest fake
 * timers so the suite is deterministic and never touches the network.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import { FLAMES, type FlameId, type FlameStyle } from '../src/domain/flames';
import type { AchievementState } from '../src/domain/achievements';

// Mock Reanimated: useSharedValue/useAnimatedStyle/withTiming/withSequence
// become plain values so the tree renders without the native runtime.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (v: number) => v,
    withSequence: (...vals: number[]) => vals[vals.length - 1],
  };
});

// Mock LinearGradient so tests can inspect the `colors` prop directly.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: (props: object) => require('react').createElement(View, props) };
});

// Mirror the real REJECT_MS value (not exported from the component).
const REJECT_MS = 250;

function findFlame(id: FlameId): FlameStyle {
  const flame = FLAMES.find(f => f.id === id);
  if (!flame) throw new Error(`fixture missing flame ${id}`);
  return flame;
}

// Builds an AchievementState with sensible defaults; override per test.
function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber',
    unlocked: true,
    progress: { value: 1, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

function renderRow(
  flame: FlameStyle,
  state: AchievementState,
  props: { active?: boolean; justUnlocked?: boolean; onPress?: jest.Mock } = {},
) {
  const onPress = props.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={flame}
        state={state}
        active={props.active ?? false}
        justUnlocked={props.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// The outer Pressable is the element carrying the radio role.
function getRadio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio' && n.props.onPress);
}

// Collect every rendered text string, joined for substring assertions.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
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

describe('FlameRow swatch colors', () => {
  test('unlocked row renders the full flame gradient', () => {
    const flame = findFlame('crimson');
    const { tree } = renderRow(flame, makeState({ flameId: flame.id, unlocked: true }));
    const gradient = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    expect(gradient.props.colors).toEqual(flame.gradient);
  });

  test('locked row renders the embered stops in order', () => {
    const flame = findFlame('crimson');
    const { tree } = renderRow(
      flame,
      makeState({ flameId: flame.id, unlocked: false, progress: { value: 0, target: 7 } }),
    );
    const gradient = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    const e = flame.embered;
    expect(gradient.props.colors).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
  });
});

describe('FlameRow status line (statusFor)', () => {
  test('base flame with no achievement shows plain "Unlocked" and no progress bar', () => {
    const flame = findFlame('amber');
    const { tree } = renderRow(flame, makeState({ flameId: flame.id, unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows "Unlocked · Nd left"', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'time');
    if (!flame) throw new Error('fixture: no time flame in catalog');
    const { tree } = renderRow(
      flame,
      makeState({ flameId: flame.id, unlocked: true, daysLeft: 4, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 4d left');
  });

  test('unlocked time flame clamps a negative daysLeft to 0', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'time');
    if (!flame) throw new Error('fixture: no time flame in catalog');
    const { tree } = renderRow(
      flame,
      makeState({ flameId: flame.id, unlocked: true, daysLeft: -2, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('locked streak flame shows requirement and clamped counter with progress', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'streak');
    if (!flame?.achievement) throw new Error('fixture: no streak flame in catalog');
    const req = flame.achievement.requirement;
    const { tree } = renderRow(
      flame,
      makeState({
        flameId: flame.id,
        unlocked: false,
        progress: { value: 99, target: 7 },
      }),
    );
    // Counter is clamped to the target, not the raw overshoot value.
    expect(allText(tree)).toContain(`${req} · 7/7`);
    const fill = tree.root.findAll(
      n => n.props.style && typeof n.props.style.width === 'string' && n.props.style.width.endsWith('%'),
    );
    expect(fill.length).toBeGreaterThan(0);
    expect(fill[0].props.style.width).toBe('100%');
  });

  test('expired time flame shows "Expired — re-earn: <requirement>"', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'time');
    if (!flame?.achievement) throw new Error('fixture: no time flame in catalog');
    const { tree } = renderRow(
      flame,
      makeState({
        flameId: flame.id,
        unlocked: false,
        expired: true,
        progress: { value: 3, target: 3 },
      }),
    );
    expect(allText(tree)).toContain(`Expired — re-earn: ${flame.achievement.requirement}`);
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const flame = findFlame('amber');
    const { tree } = renderRow(flame, makeState({ flameId: flame.id, unlocked: true }), {
      justUnlocked: true,
    });
    expect(allText(tree)).toContain('Just unlocked! Unlocked');
  });
});

describe('FlameRow accessibility', () => {
  test('locked row is labelled "Locked — ..." and disabled', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'streak');
    if (!flame) throw new Error('fixture: no streak flame');
    const { tree } = renderRow(flame, makeState({ flameId: flame.id, unlocked: false }));
    const radio = getRadio(tree);
    expect(radio.props.accessibilityLabel).toMatch(/^flame names?|^.*Locked — /);
    expect(radio.props.accessibilityLabel).toContain('Locked — ');
    expect(radio.props.accessibilityState.disabled).toBe(true);
  });

  test('unlocked row is not labelled Locked and is not disabled', () => {
    const flame = findFlame('amber');
    const { tree } = renderRow(flame, makeState({ flameId: flame.id, unlocked: true }));
    const radio = getRadio(tree);
    expect(radio.props.accessibilityLabel).not.toContain('Locked');
    expect(radio.props.accessibilityState.disabled).toBe(false);
  });

  test('selected state reflects the active prop', () => {
    const flame = findFlame('amber');
    const { tree } = renderRow(flame, makeState({ flameId: flame.id }), { active: true });
    const radio = getRadio(tree);
    expect(radio.props.accessibilityState.selected).toBe(true);
    expect(radio.props.accessibilityLabel).toContain('Active');
  });
});

describe('FlameRow press behavior', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('pressing an unlocked row calls onPress with the flame id', () => {
    const flame = findFlame('amber');
    const { tree, onPress } = renderRow(flame, makeState({ flameId: flame.id, unlocked: true }));
    act(() => {
      getRadio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(flame.id);
  });

  test('pressing a locked row does not call onPress', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'streak');
    if (!flame) throw new Error('fixture: no streak flame');
    const { tree, onPress } = renderRow(flame, makeState({ flameId: flame.id, unlocked: false }));
    act(() => {
      getRadio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('pressing a locked row shows the rejection cue, which resets after REJECT_MS', () => {
    jest.useFakeTimers();
    const flame = FLAMES.find(f => f.achievement?.type === 'streak');
    if (!flame) throw new Error('fixture: no streak flame');
    const { tree } = renderRow(flame, makeState({ flameId: flame.id, unlocked: false }));
    const cueId = `flame-reject-${flame.id}`;

    act(() => {
      getRadio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    // Just before the window closes the cue is still visible.
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    // At REJECT_MS the cue clears itself.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);
  });
});

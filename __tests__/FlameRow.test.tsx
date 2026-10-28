/**
 * FlameRow.test.tsx — unit tests for the flame gallery row component.
 *
 * Covers the pure helpers `swatchColors` and `statusFor` (exported via the
 * module's behavior through rendering) and the FlameRow component itself:
 * gradient swatch colors, status text per achievement state, press handling
 * for unlocked vs locked rows, the locked-tap rejection cue (250ms, fake
 * timers), accessibility labels, and the just-unlocked prefix.
 *
 * Mocks: expo-linear-gradient (renders as a plain host element so its props
 * can be inspected) and react-native-reanimated (no native worklet runtime in
 * Jest). No network, no wall-clock dependence: timers are faked.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { FLAMES, type FlameId, type FlameStyle } from '../src/domain/flames';
import type { AchievementState } from '../src/domain/achievements';

// Replace LinearGradient with a host-level element that keeps its props, so
// tests can read the `colors` array the component computed.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(View, { ...props, testID: 'linear-gradient' }),
  };
});

// Minimal Reanimated stand-in: hooks return plain values and withTiming /
// withSequence are identity-like so no worklet runtime is required.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (value: number) => value,
  };
});

import FlameRow from '../src/components/Settings/FlameRow';

function findFlame(id: FlameId): FlameStyle {
  const flame = FLAMES.find(f => f.id === id);
  if (!flame) throw new Error(`missing flame fixture: ${id}`);
  return flame;
}

// Builds an AchievementState with sensible defaults, overridable per test.
function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber',
    unlocked: true,
    progress: { value: 1, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  };
}

function renderRow(
  flame: FlameStyle,
  state: AchievementState,
  props: { active?: boolean; justUnlocked?: boolean; onPress?: (id: FlameId) => void } = {},
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

// The Pressable is the element carrying the radio role and label.
function pressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function',
  );
}

// Collects every rendered string child so we can assert visible status text.
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

function swatchProps(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findByProps({ testID: 'linear-gradient' }).props;
}

describe('swatchColors (via LinearGradient colors prop)', () => {
  const sodium = findFlame('sodium');

  test('unlocked rows use the full gradient', () => {
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: true }));
    expect(swatchProps(tree).colors).toEqual(sodium.gradient);
  });

  test('locked rows use the five embered stops in order', () => {
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: false }));
    const e = sodium.embered;
    expect(swatchProps(tree).colors).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
  });

  test('colors always holds at least two stops for LinearGradient', () => {
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: false }));
    expect(swatchProps(tree).colors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('statusFor (via rendered status text)', () => {
  test('base flame (no achievement) reads "Unlocked" with no progress bar', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow(amber, makeState({ flameId: 'amber', unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked streak flame reads "Unlocked"', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows the day countdown', () => {
    const toxic = findFlame('toxic');
    const { tree } = renderRow(
      toxic,
      makeState({ flameId: 'toxic', unlocked: true, daysLeft: 5, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('negative daysLeft is clamped to 0d left', () => {
    const toxic = findFlame('toxic');
    const { tree } = renderRow(
      toxic,
      makeState({ flameId: 'toxic', unlocked: true, daysLeft: -2, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const toxic = findFlame('toxic');
    const { tree } = renderRow(
      toxic,
      makeState({
        flameId: 'toxic',
        unlocked: false,
        expired: true,
        daysLeft: -3,
        progress: { value: 3, target: 3 },
      }),
    );
    expect(allText(tree)).toContain(`Expired — re-earn: ${toxic.achievement!.requirement}`);
  });

  test('locked streak flame shows requirement and value/target counter', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow(
      sodium,
      makeState({ flameId: 'sodium', unlocked: false, progress: { value: 4, target: 7 } }),
    );
    expect(allText(tree)).toContain(`${sodium.achievement!.requirement} · 4/7`);
  });

  test('locked progress counter is capped at the target', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow(
      sodium,
      makeState({ flameId: 'sodium', unlocked: false, progress: { value: 9, target: 7 } }),
    );
    expect(allText(tree)).toContain('7/7');
  });

  test('zero target yields a zero-width progress fill without dividing by zero', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow(
      sodium,
      makeState({ flameId: 'sodium', unlocked: false, progress: { value: 0, target: 0 } }),
    );
    const fills = tree.root.findAll(
      n => n.props.style && Array.isArray(n.props.style)
        ? false
        : n.props.style && typeof n.props.style === 'object' && 'width' in n.props.style,
    );
    fills.forEach(f => expect(f.props.style.width).toBe('0%'));
  });
});

describe('press handling', () => {
  test('pressing an unlocked row calls onPress with the flame id', () => {
    const amber = findFlame('amber');
    const onPress = jest.fn();
    const { tree } = renderRow(amber, makeState({ flameId: 'amber', unlocked: true }), { onPress });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('pressing a locked row does not call onPress', () => {
    jest.useFakeTimers();
    const sodium = findFlame('sodium');
    const onPress = jest.fn();
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: false }), { onPress });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    act(() => {
      jest.runAllTimers();
    });
    jest.useRealTimers();
  });

  test('locked press shows the rejection cue testID, cleared after 250ms', () => {
    jest.useFakeTimers();
    const sodium = findFlame('sodium');
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: false }));
    const cueId = `flame-reject-${sodium.id}`;

    act(() => {
      pressable(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);
    jest.useRealTimers();
  });

  test('unlocked press never shows the rejection cue', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow(amber, makeState({ flameId: 'amber', unlocked: true }));
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: `flame-reject-${amber.id}` }).length).toBe(0);
  });
});

describe('accessibility', () => {
  test('locked rows are announced as disabled with a "Locked —" prefix', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: false }));
    const p = pressable(tree).props;
    expect(p.accessibilityState.disabled).toBe(true);
    expect(p.accessibilityLabel).toContain('Locked — ');
  });

  test('unlocked rows are not disabled and have no "Locked —" prefix', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow(amber, makeState({ flameId: 'amber', unlocked: true }));
    const p = pressable(tree).props;
    expect(p.accessibilityState.disabled).toBe(false);
    expect(p.accessibilityLabel).not.toContain('Locked');
  });

  test('active row reports selected and labels itself Active', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow(amber, makeState({ flameId: 'amber', unlocked: true }), { active: true });
    const p = pressable(tree).props;
    expect(p.accessibilityState.selected).toBe(true);
    expect(p.accessibilityLabel).toContain('Active');
  });
});

describe('justUnlocked', () => {
  test('prefixes the status with "Just unlocked!"', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow(
      sodium,
      makeState({ flameId: 'sodium', unlocked: true }),
      { justUnlocked: true },
    );
    expect(allText(tree)).toContain('Just unlocked! Unlocked');
  });

  test('without justUnlocked the prefix is absent', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow(sodium, makeState({ flameId: 'sodium', unlocked: true }));
    expect(allText(tree)).not.toContain('Just unlocked!');
  });
});

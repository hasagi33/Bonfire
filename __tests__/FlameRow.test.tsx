/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the pure helpers (swatchColors, statusFor) and the FlameRow component:
 * unlocked equip path, locked-tap rejection (no equip, one-shot 250ms cue),
 * the "Just unlocked!" prefix, and the locked accessibility label.
 *
 * All animation (reanimated) and gradient (expo-linear-gradient) output is
 * mocked so tests are deterministic and never depend on native modules.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle, FlameId } from '../src/domain/flames';

// ---- Mocks ----------------------------------------------------------------

// expo-linear-gradient: render a plain host element that keeps its colors prop.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'linear-gradient', colors: props.colors, style: props.style }),
  };
});

// react-native-reanimated: a tiny in-memory shared value and identity animations.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...steps: unknown[]) => steps[steps.length - 1],
    withTiming: (toValue: number) => toValue,
  };
});

// Import after mocks are registered.
import FlameRow, { REJECT_MS, statusFor, swatchColors } from '../src/components/Settings/FlameRow';

// ---- Fixtures -------------------------------------------------------------

const GRADIENT = ['#111111', '#222222', '#333333', '#444444', '#555555'];
const EMBERED = {
  core: '#aaaaaa',
  gold: '#bbbbbb',
  amber: '#cccccc',
  ember: '#dddddd',
  red: '#eeeeee',
};

function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'sodium' as FlameId,
    name: 'Sodium',
    gradient: GRADIENT,
    embered: EMBERED,
    palette: { core: '#ffcc00' },
    achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'sodium' as FlameId,
    unlocked: false,
    progress: { value: 0, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  };
}

function renderRow(
  props: Partial<React.ComponentProps<typeof FlameRow>> = {},
) {
  const onPress = jest.fn();
  const flame = props.flame ?? makeFlame();
  const state = props.state ?? makeState();
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

function pressableOf(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

// ---- swatchColors ---------------------------------------------------------

describe('swatchColors', () => {
  test('returns the full gradient when unlocked', () => {
    expect(swatchColors(makeFlame(), true)).toEqual(GRADIENT);
  });

  test('returns the embered stops when locked', () => {
    expect(swatchColors(makeFlame(), false)).toEqual([
      EMBERED.core,
      EMBERED.gold,
      EMBERED.amber,
      EMBERED.ember,
      EMBERED.red,
    ]);
  });
});

// ---- statusFor ------------------------------------------------------------

describe('statusFor', () => {
  test('base flame (no achievement) is always "Unlocked" with no progress', () => {
    const flame = makeFlame({ achievement: undefined } as Partial<FlameStyle>);
    expect(statusFor(flame, makeState({ unlocked: true }))).toEqual({
      text: 'Unlocked',
      progress: null,
    });
  });

  test('unlocked streak flame is "Unlocked"', () => {
    const flame = makeFlame();
    expect(statusFor(flame, makeState({ unlocked: true })).text).toBe('Unlocked');
  });

  test('unlocked time flame shows the day countdown', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(flame, makeState({ unlocked: true, daysLeft: 4 }));
    expect(result).toEqual({ text: 'Unlocked · 4d left', progress: null });
  });

  test('unlocked time flame clamps a negative countdown to 0d', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(flame, makeState({ unlocked: true, daysLeft: -2 }));
    expect(result.text).toBe('Unlocked · 0d left');
  });

  test('expired time flame prompts re-earn with a progress fraction', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(
      flame,
      makeState({ expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(result).toEqual({ text: 'Expired — re-earn: Log 3 days', progress: 1 });
  });

  test('locked streak flame shows requirement, counter and fraction', () => {
    const result = statusFor(makeFlame(), makeState({ progress: { value: 4, target: 7 } }));
    expect(result.text).toBe('Keep a 7-day run · 4/7');
    expect(result.progress).toBeCloseTo(4 / 7);
  });

  test('locked progress is clamped to the target and fraction capped at 1', () => {
    const result = statusFor(makeFlame(), makeState({ progress: { value: 9, target: 7 } }));
    expect(result.text).toBe('Keep a 7-day run · 7/7');
    expect(result.progress).toBe(1);
  });

  test('zero target yields a 0 fraction without dividing by zero', () => {
    const result = statusFor(makeFlame(), makeState({ progress: { value: 0, target: 0 } }));
    expect(result.progress).toBe(0);
  });
});

// ---- FlameRow component ---------------------------------------------------

describe('FlameRow', () => {
  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = renderRow({
      state: makeState({ unlocked: true }),
    });
    act(() => {
      pressableOf(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('sodium');
  });

  test('pressing a locked row does NOT call onPress', () => {
    jest.useFakeTimers();
    const { tree, onPress } = renderRow();
    act(() => {
      pressableOf(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('a locked tap shows the rejection cue and clears it after REJECT_MS', () => {
    jest.useFakeTimers();
    const { tree } = renderRow();
    act(() => {
      pressableOf(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    // Just before the window ends, the cue is still visible.
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    // At the boundary the one-shot reset fires exactly once.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
    jest.useRealTimers();
  });

  test('REJECT_MS is the 250ms cue duration', () => {
    expect(REJECT_MS).toBe(250);
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = renderRow({
      state: makeState({ unlocked: true }),
      justUnlocked: true,
    });
    expect(pressableOf(tree).props.accessibilityLabel).toContain('Just unlocked! Unlocked');
  });

  test('locked accessibility label announces "Locked — ..."', () => {
    const { tree } = renderRow();
    const label: string = pressableOf(tree).props.accessibilityLabel;
    expect(label).toContain('Locked — Keep a 7-day run · 0/7');
    expect(pressableOf(tree).props.accessibilityState.disabled).toBe(true);
  });

  test('unlocked row is not disabled and marks selection state', () => {
    const { tree } = renderRow({
      state: makeState({ unlocked: true }),
      active: true,
    });
    const node = pressableOf(tree);
    expect(node.props.accessibilityState.disabled).toBe(false);
    expect(node.props.accessibilityState.selected).toBe(true);
    expect(node.props.accessibilityLabel).toContain('Active');
  });
});

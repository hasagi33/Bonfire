/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the four public symbols of src/components/Settings/FlameRow.tsx:
 *  - FlameRow (default export, memoised): status text, progress bar, locked/unlocked
 *    press handling, the ~250ms locked-tap rejection cue, and accessibility labels.
 *  - statusFor / swatchColors (internal helpers, exercised through rendering and
 *    through the swatch's LinearGradient colors prop).
 *  - REJECT_MS (internal constant, verified via fake-timer advancement).
 *
 * expo-linear-gradient and react-native-reanimated are mocked so the tests run
 * deterministically under jest-expo without native modules or real animation
 * timing. Fake timers drive the rejection cue; no network is touched.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// ---- Mocks -----------------------------------------------------------------

// LinearGradient is a native view; a plain host element is enough for assertions
// on the `colors` prop, which is what we need to verify swatch behaviour.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }),
  };
});

// Reanimated's worklet runtime is unavailable in Jest. We replace the hooks with
// simple stand-ins: a shared value is a plain mutable box, the animated style
// returns an empty object, and the animation builders are identity functions.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSequence: (...steps: unknown[]) => steps[steps.length - 1],
    withTiming: (to: unknown) => to,
    // Keep React referenced so the factory closure is valid under strict lint.
    __react: React,
  };
});

// ---- Fixtures --------------------------------------------------------------

const EMBERED = { core: '#111111', gold: '#222222', amber: '#333333', ember: '#444444', red: '#555555' };

const BASE_FLAME: FlameStyle = {
  id: 'amber',
  name: 'Amber',
  gradient: ['#a0', '#a1', '#a2', '#a3', '#a4'],
  embered: EMBERED,
  palette: { core: '#ffcc66' },
  achievement: undefined,
} as unknown as FlameStyle;

const STREAK_FLAME: FlameStyle = {
  id: 'sodium',
  name: 'Sodium',
  gradient: ['#b0', '#b1', '#b2', '#b3', '#b4'],
  embered: EMBERED,
  palette: { core: '#ffdd88' },
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
} as unknown as FlameStyle;

const TIME_FLAME: FlameStyle = {
  id: 'toxic',
  name: 'Toxic',
  gradient: ['#c0', '#c1', '#c2', '#c3', '#c4'],
  embered: EMBERED,
  palette: { core: '#88ff88' },
  achievement: { type: 'time', requirement: 'Log 3 days in a row' },
} as unknown as FlameStyle;

function state(partial: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'sodium',
    unlocked: false,
    progress: { value: 0, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...partial,
  } as AchievementState;
}

interface RenderOpts {
  flame?: FlameStyle;
  st?: AchievementState;
  active?: boolean;
  justUnlocked?: boolean;
}

function renderRow(opts: RenderOpts = {}) {
  const onPress = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={opts.flame ?? STREAK_FLAME}
        state={opts.st ?? state()}
        active={opts.active ?? false}
        justUnlocked={opts.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// Collect every string child in the rendered tree, joined for substring checks.
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

function pressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

// ---- Tests -----------------------------------------------------------------

describe('FlameRow status line', () => {
  test('base flame with no achievement always reads "Unlocked" and has no progress bar', () => {
    const { tree } = renderRow({ flame: BASE_FLAME, st: state({ unlocked: true }) });
    expect(allText(tree)).toContain('Unlocked');
    expect(tree.root.findAllByProps({ height: 4 }).length).toBe(0);
  });

  test('unlocked time flame shows "Unlocked · Nd left"', () => {
    const { tree } = renderRow({
      flame: TIME_FLAME,
      st: state({ flameId: 'toxic', unlocked: true, daysLeft: 5 }),
    });
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative daysLeft to 0d left', () => {
    const { tree } = renderRow({
      flame: TIME_FLAME,
      st: state({ flameId: 'toxic', unlocked: true, daysLeft: -2 }),
    });
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('locked streak flame shows requirement plus value/target counter', () => {
    const { tree } = renderRow({ st: state({ progress: { value: 4, target: 7 } }) });
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('locked streak progress bar width reflects value/target fraction', () => {
    const { tree } = renderRow({ st: state({ progress: { value: 4, target: 8 } }) });
    const fill = tree.root.find(n => n.props.style && n.props.style.width !== undefined && n.props.style.height === 4 && n.props.style.backgroundColor === '#ffae3b');
    expect(fill.props.style.width).toBe('50%');
  });

  test('progress counter never exceeds the target when value overshoots', () => {
    const { tree } = renderRow({ st: state({ progress: { value: 12, target: 7 } }) });
    expect(allText(tree)).toContain('7/7');
  });

  test('progress fraction is 0 when target is 0 (no division by zero)', () => {
    const { tree } = renderRow({ st: state({ progress: { value: 3, target: 0 } }) });
    const fill = tree.root.find(n => n.props.style && n.props.style.height === 4 && n.props.style.backgroundColor === '#ffae3b');
    expect(fill.props.style.width).toBe('0%');
  });

  test('locked expired time flame shows "Expired — re-earn: <requirement>"', () => {
    const { tree } = renderRow({
      flame: TIME_FLAME,
      st: state({ flameId: 'toxic', expired: true, progress: { value: 3, target: 3 } }),
    });
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = renderRow({
      flame: TIME_FLAME,
      st: state({ flameId: 'toxic', unlocked: true, daysLeft: 2 }),
      justUnlocked: true,
    });
    expect(allText(tree)).toContain('Just unlocked! Unlocked · 2d left');
  });
});

describe('FlameRow press handling', () => {
  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = renderRow({ flame: BASE_FLAME, st: state({ flameId: 'amber', unlocked: true }) });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('pressing a locked row does NOT call onPress', () => {
    jest.useFakeTimers();
    const { tree, onPress } = renderRow();
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  test('a locked press shows the rejection cue, which resets after REJECT_MS (250ms)', () => {
    jest.useFakeTimers();
    const { tree } = renderRow();
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
    jest.useRealTimers();
  });

  test('repeated locked presses restart the cue timer instead of stacking', () => {
    jest.useFakeTimers();
    const { tree } = renderRow();
    act(() => {
      pressable(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      pressable(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // 400ms total, but the second press restarted the 250ms window at 200ms,
    // so the cue must still be visible at t=400.
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
    jest.useRealTimers();
  });
});

describe('FlameRow swatch colors', () => {
  test('unlocked row uses the full gradient stops', () => {
    const { tree } = renderRow({ flame: BASE_FLAME, st: state({ flameId: 'amber', unlocked: true }) });
    const gradient = tree.root.findByProps({ testID: 'linear-gradient' });
    expect(gradient.props.colors).toEqual(BASE_FLAME.gradient);
  });

  test('locked row uses the embered stops in core, gold, amber, ember, red order', () => {
    const { tree } = renderRow({ flame: STREAK_FLAME });
    const gradient = tree.root.findByProps({ testID: 'linear-gradient' });
    expect(gradient.props.colors).toEqual([
      EMBERED.core,
      EMBERED.gold,
      EMBERED.amber,
      EMBERED.ember,
      EMBERED.red,
    ]);
  });
});

describe('FlameRow accessibility', () => {
  test('locked row label starts with "Locked — " and is disabled', () => {
    const { tree } = renderRow({ st: state({ progress: { value: 1, target: 7 } }) });
    const node = pressable(tree);
    expect(node.props.accessibilityLabel).toMatch(/^Sodium\. Locked — /);
    expect(node.props.accessibilityState.disabled).toBe(true);
  });

  test('unlocked row is not disabled and has no "Locked" prefix', () => {
    const { tree } = renderRow({ flame: BASE_FLAME, st: state({ flameId: 'amber', unlocked: true }) });
    const node = pressable(tree);
    expect(node.props.accessibilityLabel).not.toContain('Locked');
    expect(node.props.accessibilityState.disabled).toBe(false);
  });

  test('selected state reflects the active prop', () => {
    const { tree: active } = renderRow({ flame: BASE_FLAME, st: state({ flameId: 'amber', unlocked: true }), active: true });
    expect(pressable(active).props.accessibilityState.selected).toBe(true);
    expect(pressable(active).props.accessibilityLabel).toContain('Active');

    const { tree: inactive } = renderRow({ flame: BASE_FLAME, st: state({ flameId: 'amber', unlocked: true }), active: false });
    expect(pressable(inactive).props.accessibilityState.selected).toBe(false);
    expect(pressable(inactive).props.accessibilityLabel).not.toContain('Active');
  });
});

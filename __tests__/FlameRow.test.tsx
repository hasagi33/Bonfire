/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the four public helpers/behaviors of FlameRow:
 *  - swatchColors: full gradient when unlocked, embered stops when locked.
 *  - statusFor: unlocked / time countdown / locked progress / expired re-earn.
 *  - tap handling: unlocked rows equip; locked rows are rejected with a ~250ms cue.
 *  - justUnlocked: prefixes the status label with "Just unlocked!".
 *
 * Reanimated and expo-linear-gradient are mocked so the tests stay deterministic
 * and never touch native modules. Time is controlled with Jest fake timers.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameId, FlameStyle } from '../src/domain/flames';

// ---- Mocks -----------------------------------------------------------------
// expo-linear-gradient: render a plain View so the tree stays simple.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: object) => React.createElement(View, props),
  };
});

// react-native-reanimated: shared values are plain boxes, animated styles are
// plain objects, and withTiming/withSequence just return their target value.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (toValue: number) => toValue,
    withSequence: (...values: number[]) => values[values.length - 1],
  };
});

// Imported after mocks so the component picks up the mocked modules.
import FlameRow from '../src/components/Settings/FlameRow';

// ---- Fixtures --------------------------------------------------------------
const timeFlame: FlameStyle = {
  id: 'toxic' as FlameId,
  name: 'Toxic',
  gradient: ['#111111', '#222222', '#333333', '#444444', '#555555'],
  embered: { core: '#a', gold: '#b', amber: '#c', ember: '#d', red: '#e' },
  palette: { core: '#00ff00' },
  achievement: { type: 'time', requirement: 'Log 3 days in a row', window: 7 },
} as unknown as FlameStyle;

const streakFlame: FlameStyle = {
  id: 'sodium' as FlameId,
  name: 'Sodium',
  gradient: ['#aaaaaa', '#bbbbbb', '#cccccc', '#dddddd', '#eeeeee'],
  embered: { core: '#1', gold: '#2', amber: '#3', ember: '#4', red: '#5' },
  palette: { core: '#ffff00' },
  achievement: { type: 'streak', requirement: 'Keep a 7-day run', window: null },
} as unknown as FlameStyle;

const baseFlame: FlameStyle = {
  id: 'amber' as FlameId,
  name: 'Amber',
  gradient: ['#ff0000', '#ff7700', '#ffaa00', '#ffcc00', '#ffff00'],
  embered: { core: '#x', gold: '#y', amber: '#z', ember: '#w', red: '#v' },
  palette: { core: '#ffae3b' },
  achievement: null,
} as unknown as FlameStyle;

function state(partial: Partial<AchievementState> & { flameId: FlameId }): AchievementState {
  return {
    unlocked: false,
    progress: { value: 0, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...partial,
  };
}

function render(
  flame: FlameStyle,
  st: AchievementState,
  opts: { active?: boolean; justUnlocked?: boolean; onPress?: jest.Mock } = {},
) {
  const onPress = opts.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={flame}
        state={st}
        active={opts.active ?? false}
        justUnlocked={opts.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// Gather every rendered string so tests can assert on visible text.
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

// ---- swatchColors (exercised through the rendered LinearGradient) ----------
describe('swatchColors', () => {
  test('uses the full gradient when the flame is unlocked', () => {
    const { tree } = render(baseFlame, state({ flameId: 'amber', unlocked: true }));
    const grad = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    expect(grad.props.colors).toEqual(baseFlame.gradient);
  });

  test('uses the embered stops when the flame is locked', () => {
    const { tree } = render(streakFlame, state({ flameId: 'sodium' }));
    const grad = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    expect(grad.props.colors).toEqual(['#1', '#2', '#3', '#4', '#5']);
  });
});

// ---- statusFor (exercised through the rendered status line) ----------------
describe('statusFor', () => {
  test('base flame with no achievement always reads "Unlocked"', () => {
    const { tree } = render(baseFlame, state({ flameId: 'amber', unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
  });

  test('unlocked time achievement shows the day countdown', () => {
    const { tree } = render(timeFlame, state({ flameId: 'toxic', unlocked: true, daysLeft: 4 }));
    expect(allText(tree)).toContain('Unlocked · 4d left');
  });

  test('unlocked time achievement clamps a negative countdown to 0d', () => {
    const { tree } = render(timeFlame, state({ flameId: 'toxic', unlocked: true, daysLeft: -2 }));
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('locked streak achievement shows requirement with counter and progress bar', () => {
    const { tree } = render(
      streakFlame,
      state({ flameId: 'sodium', progress: { value: 4, target: 7 } }),
    );
    const text = allText(tree);
    expect(text).toContain('Keep a 7-day run · 4/7');
    // progress fraction 4/7 ≈ 57% drives the bar width
    const fill = tree.root.findAll(n => n.props.style && n.props.style.width !== undefined);
    expect(fill.some(n => n.props.style.width === '57%')).toBe(true);
  });

  test('locked counter never exceeds the target', () => {
    const { tree } = render(
      streakFlame,
      state({ flameId: 'sodium', progress: { value: 9, target: 7 } }),
    );
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('expired time achievement prompts a re-earn', () => {
    const { tree } = render(
      timeFlame,
      state({ flameId: 'toxic', expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });
});

// ---- Tap handling ----------------------------------------------------------
describe('tap handling', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('tapping an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render(baseFlame, state({ flameId: 'amber', unlocked: true }));
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('tapping a locked row does not equip and shows the rejection cue', () => {
    const { tree, onPress } = render(streakFlame, state({ flameId: 'sodium' }));
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
  });

  test('the rejection cue clears after ~250ms', () => {
    const { tree } = render(streakFlame, state({ flameId: 'sodium' }));
    act(() => {
      pressable(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
  });

  test('repeated locked taps restart the cue window instead of stacking timers', () => {
    const { tree } = render(streakFlame, state({ flameId: 'sodium' }));
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
    // 400ms since first tap but only 200ms since the latest — cue still visible
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
  });

  test('unmounting clears a pending rejection timer without errors', () => {
    const { tree } = render(streakFlame, state({ flameId: 'sodium' }));
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(() => {
      act(() => {
        tree.unmount();
        jest.runOnlyPendingTimers();
      });
    }).not.toThrow();
  });
});

// ---- justUnlocked ----------------------------------------------------------
describe('justUnlocked', () => {
  test('prefixes the status label with "Just unlocked!"', () => {
    const { tree } = render(
      timeFlame,
      state({ flameId: 'toxic', unlocked: true, daysLeft: 6 }),
      { justUnlocked: true },
    );
    expect(allText(tree)).toContain('Just unlocked! Unlocked · 6d left');
  });

  test('is not applied by default', () => {
    const { tree } = render(baseFlame, state({ flameId: 'amber', unlocked: true }));
    expect(allText(tree)).not.toContain('Just unlocked!');
  });
});

// ---- Accessibility ---------------------------------------------------------
describe('accessibility', () => {
  test('locked rows are announced as disabled with a "Locked —" label', () => {
    const { tree } = render(streakFlame, state({ flameId: 'sodium' }));
    const node = pressable(tree);
    expect(node.props.accessibilityState.disabled).toBe(true);
    expect(node.props.accessibilityLabel).toContain('Locked — ');
  });

  test('the active flame is marked selected and checked', () => {
    const { tree } = render(baseFlame, state({ flameId: 'amber', unlocked: true }), {
      active: true,
    });
    expect(pressable(tree).props.accessibilityState.selected).toBe(true);
    expect(allText(tree)).toContain('✓');
  });
});

/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the pure helpers (statusFor, swatchColors) and the FlameRow component:
 * unlocked/locked/expired status text, progress bounds, equip vs. rejection
 * behavior on press, the ~250ms rejection cue reset, the "Just unlocked!"
 * prefix, and locked accessibility labels.
 *
 * Expo/Reanimated/gradient are mocked so the suite runs deterministically under
 * jest-expo with no native modules and no real timers.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRowModule, { REJECT_MS } from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// ---- Mocks ----------------------------------------------------------------

// Render the gradient as a plain View so the tree stays simple to inspect.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: object) => React.createElement(View, props),
  };
});

// Reanimated: stub the hooks so shared values are plain holders and the
// animated style is an inert object; withSequence/withTiming just return a value.
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
    withTiming: (to: number) => to,
  };
});

// ---- Fixtures -------------------------------------------------------------

const BASE_FLAME: FlameStyle = {
  id: 'amber',
  name: 'Amber',
  achievement: null,
  gradient: ['#fff1c1', '#ffae3b', '#ff7a18', '#c2410c', '#7c2d12'],
  embered: {
    core: '#3a2a20',
    gold: '#4a3324',
    amber: '#55392a',
    ember: '#402b22',
    red: '#2a1a16',
  },
  palette: { core: '#ffd27a' },
} as unknown as FlameStyle;

const STREAK_FLAME = {
  ...BASE_FLAME,
  id: 'sodium',
  name: 'Sodium',
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
} as unknown as FlameStyle;

const TIME_FLAME = {
  ...BASE_FLAME,
  id: 'toxic',
  name: 'Toxic',
  achievement: { type: 'time', requirement: 'Score 3 days in a row' },
} as unknown as FlameStyle;

function state(overrides: Partial<AchievementState> = {}): AchievementState {
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
  st: AchievementState,
  opts: { active?: boolean; justUnlocked?: boolean; onPress?: jest.Mock } = {},
) {
  const onPress = opts.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRowModule
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

// Find the single radio Pressable that the row renders.
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio' && n.props.onPress);
}

// Collect every rendered string so we can substring-match visible text.
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

// ---- Tests ----------------------------------------------------------------

describe('statusFor (via rendered status line)', () => {
  test('base flame with no achievement reads just "Unlocked"', () => {
    const { tree } = renderRow(BASE_FLAME, state());
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows the day countdown', () => {
    const { tree } = renderRow(TIME_FLAME, state({ daysLeft: 4 }));
    expect(allText(tree)).toContain('Unlocked · 4d left');
  });

  test('unlocked time flame clamps a negative daysLeft to 0d', () => {
    const { tree } = renderRow(TIME_FLAME, state({ daysLeft: -2 }));
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('locked streak flame shows requirement with counter clamped to target', () => {
    const { tree } = renderRow(
      STREAK_FLAME,
      state({ unlocked: false, progress: { value: 9, target: 7 } }),
    );
    const text = allText(tree);
    expect(text).toContain('Keep a 7-day run · 7/7');
  });

  test('locked streak flame shows its partial counter', () => {
    const { tree } = renderRow(
      STREAK_FLAME,
      state({ unlocked: false, progress: { value: 4, target: 7 } }),
    );
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const { tree } = renderRow(
      TIME_FLAME,
      state({ unlocked: false, expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(allText(tree)).toContain('Expired — re-earn: Score 3 days in a row');
  });

  test('progress bar fraction is bounded to 0..1 (zero target yields 0)', () => {
    const { tree } = renderRow(
      STREAK_FLAME,
      state({ unlocked: false, progress: { value: 5, target: 0 } }),
    );
    // A zero-target row has no meaningful progress, so the track renders with 0 width.
    const fill = tree.root.findAll(
      n => n.props.style && n.props.style.width !== undefined && n.props.style.height === 4,
    );
    expect(fill.length).toBeGreaterThan(0);
    expect(fill[0].props.style.width).toBe('0%');
  });

  test('progress bar never exceeds 100% even when value > target', () => {
    const { tree } = renderRow(
      STREAK_FLAME,
      state({ unlocked: false, progress: { value: 12, target: 7 } }),
    );
    const fill = tree.root.findAll(
      n => n.props.style && n.props.style.width !== undefined && n.props.style.height === 4,
    );
    expect(fill[0].props.style.width).toBe('100%');
  });
});

describe('swatchColors (via gradient props)', () => {
  function gradientColors(tree: ReactTestRenderer.ReactTestRenderer): string[] {
    const grad = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    return grad.props.colors as string[];
  }

  test('unlocked row uses the full flame gradient', () => {
    const { tree } = renderRow(BASE_FLAME, state({ unlocked: true }));
    expect(gradientColors(tree)).toEqual(BASE_FLAME.gradient);
  });

  test('locked row uses the embered stops in core→gold→amber→ember→red order', () => {
    const { tree } = renderRow(BASE_FLAME, state({ unlocked: false }));
    expect(gradientColors(tree)).toEqual([
      BASE_FLAME.embered.core,
      BASE_FLAME.embered.gold,
      BASE_FLAME.embered.amber,
      BASE_FLAME.embered.ember,
      BASE_FLAME.embered.red,
    ]);
  });
});

describe('FlameRow interaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('tapping an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = renderRow(BASE_FLAME, state({ unlocked: true }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('tapping a locked row does NOT call onPress', () => {
    const { tree, onPress } = renderRow(STREAK_FLAME, state({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('tapping a locked row shows the rejection cue', () => {
    const { tree } = renderRow(STREAK_FLAME, state({ unlocked: false }));
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
  });

  test('the rejection cue resets after REJECT_MS', () => {
    const { tree } = renderRow(STREAK_FLAME, state({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
  });

  test('repeated locked taps restart the cue timer rather than stacking', () => {
    const { tree, onPress } = renderRow(STREAK_FLAME, state({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    // Still visible: the second tap pushed the reset out.
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('unmounting clears a pending cue timer without errors', () => {
    const { tree } = renderRow(STREAK_FLAME, state({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(() => {
      act(() => {
        tree.unmount();
        jest.advanceTimersByTime(REJECT_MS);
      });
    }).not.toThrow();
  });
});

describe('justUnlocked and accessibility', () => {
  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = renderRow(TIME_FLAME, state({ daysLeft: 6 }), { justUnlocked: true });
    expect(allText(tree)).toContain('Just unlocked! Unlocked · 6d left');
  });

  test('locked rows prefix the accessibility label with "Locked — "', () => {
    const { tree } = renderRow(STREAK_FLAME, state({ unlocked: false }));
    expect(radio(tree).props.accessibilityLabel).toMatch(/^Sodium\. Locked — /);
  });

  test('unlocked rows do not carry the "Locked — " prefix', () => {
    const { tree } = renderRow(BASE_FLAME, state({ unlocked: true }));
    expect(radio(tree).props.accessibilityLabel).not.toContain('Locked');
  });

  test('active row is marked selected and labelled "Active"', () => {
    const { tree } = renderRow(BASE_FLAME, state({ unlocked: true }), { active: true });
    expect(radio(tree).props.accessibilityState.selected).toBe(true);
    expect(radio(tree).props.accessibilityLabel).toContain('Active');
  });

  test('locked row is announced as disabled', () => {
    const { tree } = renderRow(STREAK_FLAME, state({ unlocked: false }));
    expect(radio(tree).props.accessibilityState.disabled).toBe(true);
  });
});

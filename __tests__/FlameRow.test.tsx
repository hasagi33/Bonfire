/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the pure helpers (swatchColors, statusFor) and the FlameRow component:
 * status text for base/streak/time flames, locked vs unlocked press behaviour,
 * accessibility labels, and the one-shot rejection cue that resets after
 * REJECT_MS. Reanimated and expo-linear-gradient are mocked so the suite stays
 * deterministic and runs under jest-expo without native modules.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow, { REJECT_MS, statusFor, swatchColors } from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// ---- Mocks ----
// Reanimated: replace the animated primitives with plain host components so the
// tree stays inspectable, and make shared values / sequences inert.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (v: number) => v,
  };
});

// LinearGradient: render as a plain View; the test only cares about its props.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, LinearGradient: View };
});

// ---- Fixtures ----
// A minimal base (no-achievement) flame.
const BASE_FLAME = {
  id: 'amber',
  name: 'Amber',
  gradient: ['#fff1c1', '#ffb347', '#ff7a18', '#c2410c', '#7c2d12'],
  embered: { core: '#5a4632', gold: '#6b5a44', amber: '#5e4a36', ember: '#4a3a2c', red: '#3a2a20' },
  palette: { core: '#fff1c1' },
  achievement: null,
} as unknown as FlameStyle;

// A streak-achievement flame.
const STREAK_FLAME = {
  ...BASE_FLAME,
  id: 'sodium',
  name: 'Sodium',
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
} as unknown as FlameStyle;

// A time-achievement flame.
const TIME_FLAME = {
  ...BASE_FLAME,
  id: 'toxic',
  name: 'Toxic',
  achievement: { type: 'time', requirement: 'Log 3 days in a row' },
} as unknown as FlameStyle;

function state(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber',
    unlocked: false,
    progress: { value: 0, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

function render(
  flame: FlameStyle,
  s: AchievementState,
  extra: Partial<React.ComponentProps<typeof FlameRow>> = {},
) {
  const onPress = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow flame={flame} state={s} active={false} onPress={onPress} {...extra} />,
    );
  });
  return { tree, onPress };
}

function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio' && n.props.onPress);
}

// ---- swatchColors ----

describe('swatchColors', () => {
  test('returns the full gradient when unlocked', () => {
    expect(swatchColors(STREAK_FLAME, true)).toEqual(STREAK_FLAME.gradient);
  });

  test('returns the embered stops when locked', () => {
    const e = STREAK_FLAME.embered;
    expect(swatchColors(STREAK_FLAME, false)).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
  });
});

// ---- statusFor ----

describe('statusFor', () => {
  test('base flame (no achievement) is always "Unlocked" with no progress bar', () => {
    expect(statusFor(BASE_FLAME, state({ unlocked: true }))).toEqual({
      text: 'Unlocked',
      progress: null,
    });
    expect(statusFor(BASE_FLAME, state())).toEqual({ text: 'Unlocked', progress: null });
  });

  test('unlocked streak flame reads "Unlocked" with no countdown', () => {
    expect(statusFor(STREAK_FLAME, state({ unlocked: true })).text).toBe('Unlocked');
  });

  test('unlocked time flame shows the day countdown', () => {
    const r = statusFor(TIME_FLAME, state({ unlocked: true, daysLeft: 5 }));
    expect(r).toEqual({ text: 'Unlocked · 5d left', progress: null });
  });

  test('unlocked time flame clamps a negative day count to 0', () => {
    const r = statusFor(TIME_FLAME, state({ unlocked: true, daysLeft: -2 }));
    expect(r.text).toBe('Unlocked · 0d left');
  });

  test('locked streak flame shows requirement, counter and clamped progress fraction', () => {
    const r = statusFor(STREAK_FLAME, state({ progress: { value: 4, target: 7 } }));
    expect(r.text).toBe('Keep a 7-day run · 4/7');
    expect(r.progress).toBeCloseTo(4 / 7);
  });

  test('locked streak flame clamps progress to 1 when value exceeds target', () => {
    const r = statusFor(STREAK_FLAME, state({ progress: { value: 9, target: 7 } }));
    expect(r.progress).toBe(1);
    expect(r.text).toBe('Keep a 7-day run · 7/7');
  });

  test('locked flame with zero target yields progress 0 (no division by zero)', () => {
    const r = statusFor(STREAK_FLAME, state({ progress: { value: 0, target: 0 } }));
    expect(r.progress).toBe(0);
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const r = statusFor(TIME_FLAME, state({ expired: true, progress: { value: 3, target: 3 } }));
    expect(r.text).toBe('Expired — re-earn: Log 3 days in a row');
    expect(r.progress).toBe(1);
  });
});

// ---- FlameRow component ----

describe('FlameRow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders the flame name and status text', () => {
    const { tree } = render(STREAK_FLAME, state({ progress: { value: 2, target: 7 } }));
    const texts = tree.root
      .findAll(n => typeof n.props.children === 'string')
      .map(n => n.props.children);
    expect(texts).toContain('Sodium');
    expect(texts).toContain('Keep a 7-day run · 2/7');
  });

  test('locked row is announced as Locked and disabled', () => {
    const { tree } = render(STREAK_FLAME, state());
    const r = radio(tree);
    expect(r.props.accessibilityLabel).toContain('Locked — Keep a 7-day run');
    expect(r.props.accessibilityState.disabled).toBe(true);
  });

  test('unlocked row is not disabled and has no Locked prefix', () => {
    const { tree } = render(BASE_FLAME, state({ unlocked: true }));
    const r = radio(tree);
    expect(r.props.accessibilityLabel).toBe('Amber. Unlocked');
    expect(r.props.accessibilityState.disabled).toBe(false);
  });

  test('active row is marked selected and labelled Active', () => {
    const { tree } = render(BASE_FLAME, state({ unlocked: true }), { active: true });
    const r = radio(tree);
    expect(r.props.accessibilityState.selected).toBe(true);
    expect(r.props.accessibilityLabel).toContain('Active');
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = render(TIME_FLAME, state({ unlocked: true, daysLeft: 4 }), {
      justUnlocked: true,
    });
    expect(radio(tree).props.accessibilityLabel).toContain('Just unlocked! Unlocked · 4d left');
  });

  test('tapping an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render(BASE_FLAME, state({ unlocked: true }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('tapping a locked row does NOT call onPress', () => {
    const { tree, onPress } = render(STREAK_FLAME, state());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('a locked tap shows the rejection cue, which resets after REJECT_MS', () => {
    jest.useFakeTimers();
    const { tree } = render(STREAK_FLAME, state());
    const cueId = 'flame-reject-sodium';
    const hasCue = () => tree.root.findAll(n => n.props.testID === cueId).length > 0;

    expect(hasCue()).toBe(false);

    act(() => {
      radio(tree).props.onPress();
    });
    expect(hasCue()).toBe(true);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(hasCue()).toBe(true);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(hasCue()).toBe(false);
  });

  test('an unlocked tap never shows the rejection cue', () => {
    const { tree } = render(BASE_FLAME, state({ unlocked: true }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAll(n => n.props.testID === 'flame-reject-amber').length).toBe(0);
  });

  test('renders a progress track only for locked flames with progress', () => {
    const locked = render(STREAK_FLAME, state({ progress: { value: 3, target: 7 } }));
    const unlocked = render(BASE_FLAME, state({ unlocked: true }));
    const fillWidth = (t: ReactTestRenderer.ReactTestRenderer) =>
      t.root.findAll(n => n.props.style && Array.isArray(n.props.style)
        ? n.props.style.some((s: { width?: string }) => s && typeof s.width === 'string')
        : false).length;
    expect(fillWidth(locked.tree)).toBeGreaterThan(0);
    expect(fillWidth(unlocked.tree)).toBe(0);
  });
});

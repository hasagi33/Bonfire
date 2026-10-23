/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the pure helpers `statusFor` and `swatchColors`, the exported
 * `REJECT_MS` constant, and the `FlameRow` component's rendering and tap
 * behavior: unlocked taps equip (onPress with the flame id), locked taps are
 * rejected (no onPress, rejection cue on then off after REJECT_MS).
 *
 * Reanimated and expo-linear-gradient are mocked so the tree renders under
 * react-test-renderer without native modules. Timers are faked so the
 * rejection cue's reset is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow, { REJECT_MS, statusFor, swatchColors } from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// ---- Mocks ----------------------------------------------------------------

// Reanimated: replace the animated view with a plain View and make the shared
// value / style hooks inert so no native worklet runtime is needed.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (value: number) => value,
  };
});

// expo-linear-gradient renders a native view; a plain View stands in for it.
jest.mock('expo-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return { __esModule: true, LinearGradient: View };
});

// ---- Fixtures -------------------------------------------------------------

const embered = {
  core: '#2a1a10',
  gold: '#3a2410',
  amber: '#4a2c12',
  ember: '#5a3414',
  red: '#6a3c16',
};

// Minimal FlameStyle fixture: only the fields FlameRow reads are meaningful.
function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'sodium',
    name: 'Sodium',
    gradient: ['#ffd700', '#ff8c00', '#ff4500', '#b22222', '#800000'],
    embered,
    palette: { core: '#ffe9a8' },
    achievement: {
      type: 'streak',
      requirement: 'Keep a 7-day run',
    },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'sodium',
    unlocked: true,
    progress: { value: 7, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

// ---- statusFor ------------------------------------------------------------

describe('statusFor', () => {
  test('base flame with no achievement always reads "Unlocked" with no progress', () => {
    const flame = makeFlame({ achievement: undefined } as Partial<FlameStyle>);
    expect(statusFor(flame, makeState({ unlocked: false }))).toEqual({
      text: 'Unlocked',
      progress: null,
    });
  });

  test('unlocked streak flame reads "Unlocked" with no progress bar', () => {
    expect(statusFor(makeFlame(), makeState({ unlocked: true }))).toEqual({
      text: 'Unlocked',
      progress: null,
    });
  });

  test('unlocked time flame shows the days-left countdown', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(flame, makeState({ unlocked: true, daysLeft: 5 }));
    expect(result).toEqual({ text: 'Unlocked · 5d left', progress: null });
  });

  test('unlocked time flame with negative daysLeft clamps the countdown to 0', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(flame, makeState({ unlocked: true, daysLeft: -2 }));
    expect(result.text).toBe('Unlocked · 0d left');
  });

  test('locked streak flame shows requirement, counter, and fractional progress', () => {
    const state = makeState({
      unlocked: false,
      progress: { value: 4, target: 7 },
    });
    const result = statusFor(makeFlame(), state);
    expect(result.text).toBe('Keep a 7-day run · 4/7');
    expect(result.progress).toBeCloseTo(4 / 7);
  });

  test('locked streak counter caps the displayed value at the target', () => {
    const state = makeState({
      unlocked: false,
      progress: { value: 9, target: 7 },
    });
    const result = statusFor(makeFlame(), state);
    expect(result.text).toBe('Keep a 7-day run · 7/7');
    expect(result.progress).toBe(1);
  });

  test('locked streak with zero target yields zero progress without dividing by zero', () => {
    const state = makeState({
      unlocked: false,
      progress: { value: 0, target: 0 },
    });
    const result = statusFor(makeFlame(), state);
    expect(result.progress).toBe(0);
    expect(Number.isNaN(result.progress)).toBe(false);
  });

  test('expired time flame prompts re-earn and keeps partial progress', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const state = makeState({
      unlocked: false,
      expired: true,
      progress: { value: 3, target: 3 },
    });
    expect(statusFor(flame, state)).toEqual({
      text: 'Expired — re-earn: Log 3 days',
      progress: 1,
    });
  });
});

// ---- swatchColors ---------------------------------------------------------

describe('swatchColors', () => {
  test('returns the full gradient when unlocked', () => {
    const flame = makeFlame();
    expect(swatchColors(flame, true)).toBe(flame.gradient);
  });

  test('returns the embered stops in core→gold→amber→ember→red order when locked', () => {
    expect(swatchColors(makeFlame(), false)).toEqual([
      embered.core,
      embered.gold,
      embered.amber,
      embered.ember,
      embered.red,
    ]);
  });
});

// ---- FlameRow component ---------------------------------------------------

function render(
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

// The Pressable is the element carrying the radio role.
function pressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function',
  );
}

describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('REJECT_MS is the 250ms rejection cue duration', () => {
    expect(REJECT_MS).toBe(250);
  });

  test('renders the flame name and status text', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }));
    const texts = tree.root
      .findAll(n => n.type === 'Text' || n.props.children === 'Sodium')
      .map(n => n.props.children);
    expect(texts).toContain('Sodium');
    expect(texts).toContain('Unlocked');
  });

  test('locked row is announced as disabled with a "Locked —" label', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: false, progress: { value: 2, target: 7 } }));
    const node = pressable(tree);
    expect(node.props.accessibilityState.disabled).toBe(true);
    expect(node.props.accessibilityLabel).toContain('Locked — Keep a 7-day run · 2/7');
  });

  test('active row is marked selected and labelled "Active"', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { active: true });
    const node = pressable(tree);
    expect(node.props.accessibilityState.selected).toBe(true);
    expect(node.props.accessibilityLabel).toContain('Active');
  });

  test('tapping an UNLOCKED row calls onPress with the flame id', () => {
    const { tree, onPress } = render(makeFlame(), makeState({ unlocked: true }));
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('sodium');
  });

  test('tapping a LOCKED row does not call onPress', () => {
    const { tree, onPress } = render(makeFlame(), makeState({ unlocked: false }));
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('tapping a LOCKED row shows the rejection cue, which clears after REJECT_MS', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: false }));
    const cueQuery = () =>
      tree.root.findAll(n => n.props.testID === 'flame-reject-sodium');

    expect(cueQuery().length).toBe(0);

    act(() => {
      pressable(tree).props.onPress();
    });
    expect(cueQuery().length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(cueQuery().length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(cueQuery().length).toBe(0);
  });

  test('repeated locked taps restart the rejection window instead of stacking timers', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: false }));
    const cueQuery = () =>
      tree.root.findAll(n => n.props.testID === 'flame-reject-sodium');

    act(() => {
      pressable(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    act(() => {
      pressable(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(cueQuery().length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(cueQuery().length).toBe(0);
  });

  test('justUnlocked prefixes the status with a celebratory label', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { justUnlocked: true });
    const texts = tree.root.findAll(n => n.props.children === 'Just unlocked! Unlocked');
    expect(texts.length).toBeGreaterThan(0);
  });

  test('does not throw when the timer is pending and the row unmounts', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: false }));
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

/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers:
 *  - statusFor(): status text for base, unlocked/locked/expired time flames and
 *    locked streak flames (progress counter included)
 *  - swatchColors(): embered palette when locked, full gradient when unlocked
 *  - FlameRow rendering: accessibility label/state, justUnlocked prefix
 *  - FlameRow interaction: unlocked taps equip; locked taps never equip and
 *    show a rejection cue for REJECT_MS, then reset (fake timers)
 *
 * expo-linear-gradient and react-native-reanimated are mocked here only, so the
 * tests stay deterministic and never depend on native modules or real animation
 * timing. No network or storage is touched.
 */

import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import type { AchievementState } from '../../domain/achievements';
import type { FlameStyle } from '../../domain/flames';

// ---- Mocks (test-file only) ----

// LinearGradient is a native view; a plain View stand-in is enough for rendering.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: (props: object) => <View {...props} /> };
});

// Reanimated's worklet runtime is not available under Jest; provide inert
// stand-ins. The shared value is a plain object so tests can still read it.
jest.mock('react-native-reanimated', () => {
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

// Import after mocks are registered.
import FlameRowModule, { REJECT_MS, statusFor, swatchColors } from './FlameRow';

const FlameRow = FlameRowModule;

// ---- Fixtures ----

const palette = {
  core: '#fff7d6',
  gold: '#ffd66b',
  amber: '#ffae3b',
  ember: '#ff7a18',
  red: '#e0412b',
};

const embered = {
  core: '#5a4a3a',
  gold: '#6b5a44',
  amber: '#6e4a2e',
  ember: '#5c3424',
  red: '#4a2a22',
};

const gradient = ['#fff7d6', '#ffd66b', '#ffae3b', '#ff7a18', '#e0412b'];

const baseFlame = {
  id: 'amber',
  name: 'Amber',
  palette,
  embered,
  gradient,
  achievement: undefined,
} as unknown as FlameStyle;

const streakFlame = {
  id: 'crimson',
  name: 'Crimson',
  palette,
  embered,
  gradient,
  achievement: { type: 'streak', requirement: '7-day streak' },
} as unknown as FlameStyle;

const timeFlame = {
  id: 'sapphire',
  name: 'Sapphire',
  palette,
  embered,
  gradient,
  achievement: { type: 'time', requirement: 'Score 5 on a single day' },
} as unknown as FlameStyle;

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    unlocked: false,
    expired: false,
    daysLeft: null,
    progress: { value: 0, target: 7 },
    ...overrides,
  } as AchievementState;
}

// ---- statusFor ----

describe('statusFor', () => {
  it('returns "Unlocked" with no progress for a base flame without achievement', () => {
    expect(statusFor(baseFlame, makeState({ unlocked: true }))).toEqual({
      text: 'Unlocked',
      progress: null,
    });
  });

  it('returns "Unlocked · Nd left" for an unlocked time flame with daysLeft', () => {
    const result = statusFor(
      timeFlame,
      makeState({ unlocked: true, daysLeft: 3 }),
    );
    expect(result).toEqual({ text: 'Unlocked · 3d left', progress: null });
  });

  it('clamps negative daysLeft to 0d for unlocked time flames', () => {
    const result = statusFor(
      timeFlame,
      makeState({ unlocked: true, daysLeft: -2 }),
    );
    expect(result.text).toBe('Unlocked · 0d left');
  });

  it('returns requirement with n/m counter for a locked streak flame', () => {
    const result = statusFor(
      streakFlame,
      makeState({ progress: { value: 3, target: 7 } }),
    );
    expect(result.text).toBe('7-day streak · 3/7');
    expect(result.progress).toBeCloseTo(3 / 7);
  });

  it('caps the displayed counter at the target when value exceeds it', () => {
    const result = statusFor(
      streakFlame,
      makeState({ progress: { value: 9, target: 7 } }),
    );
    expect(result.text).toBe('7-day streak · 7/7');
    expect(result.progress).toBe(1);
  });

  it('returns progress 0 when the target is zero (no divide-by-zero)', () => {
    const result = statusFor(
      streakFlame,
      makeState({ progress: { value: 0, target: 0 } }),
    );
    expect(result.progress).toBe(0);
  });

  it('returns "Expired — re-earn: <requirement>" for an expired time flame', () => {
    const result = statusFor(
      timeFlame,
      makeState({ expired: true, progress: { value: 1, target: 1 } }),
    );
    expect(result.text).toBe('Expired — re-earn: Score 5 on a single day');
    expect(result.progress).toBe(1);
  });
});

// ---- swatchColors ----

describe('swatchColors', () => {
  it('returns the embered palette stops when locked', () => {
    expect(swatchColors(timeFlame, false)).toEqual([
      embered.core,
      embered.gold,
      embered.amber,
      embered.ember,
      embered.red,
    ]);
  });

  it('returns flame.gradient when unlocked', () => {
    expect(swatchColors(timeFlame, true)).toBe(gradient);
  });
});

// ---- FlameRow rendering ----

describe('FlameRow rendering', () => {
  it('marks an active unlocked row as selected and enabled', () => {
    const { getByRole } = render(
      <FlameRow
        flame={baseFlame}
        state={makeState({ unlocked: true })}
        active
        onPress={jest.fn()}
      />,
    );
    const row = getByRole('radio');
    expect(row.props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(row.props.accessibilityLabel).toBe('Amber. Unlocked. Active');
  });

  it('marks a locked row as disabled with a "Locked —" label', () => {
    const { getByRole } = render(
      <FlameRow
        flame={streakFlame}
        state={makeState({ progress: { value: 2, target: 7 } })}
        active={false}
        onPress={jest.fn()}
      />,
    );
    const row = getByRole('radio');
    expect(row.props.accessibilityState).toEqual({ selected: false, disabled: true });
    expect(row.props.accessibilityLabel).toMatch(/^Crimson\. Locked — /);
  });

  it('prefixes the status with "Just unlocked!" when justUnlocked is set', () => {
    const { getByText } = render(
      <FlameRow
        flame={baseFlame}
        state={makeState({ unlocked: true })}
        active={false}
        justUnlocked
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Just unlocked! Unlocked')).toBeTruthy();
  });

  it('shows the check mark only when active', () => {
    const { queryByText, rerender } = render(
      <FlameRow
        flame={baseFlame}
        state={makeState({ unlocked: true })}
        active={false}
        onPress={jest.fn()}
      />,
    );
    expect(queryByText('✓')).toBeNull();
    rerender(
      <FlameRow
        flame={baseFlame}
        state={makeState({ unlocked: true })}
        active
        onPress={jest.fn()}
      />,
    );
    expect(queryByText('✓')).toBeTruthy();
  });
});

// ---- FlameRow interaction ----

describe('FlameRow interaction', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onPress with the flame id when an unlocked row is tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <FlameRow
        flame={baseFlame}
        state={makeState({ unlocked: true })}
        active={false}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByRole('radio'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  it('never calls onPress for a locked row', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <FlameRow
        flame={streakFlame}
        state={makeState()}
        active={false}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByRole('radio'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows the rejection cue on a locked tap and clears it after REJECT_MS', () => {
    const { getByRole, queryByTestId } = render(
      <FlameRow
        flame={streakFlame}
        state={makeState()}
        active={false}
        onPress={jest.fn()}
      />,
    );
    expect(queryByTestId('flame-reject-crimson')).toBeNull();

    fireEvent.press(getByRole('radio'));
    expect(queryByTestId('flame-reject-crimson')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(queryByTestId('flame-reject-crimson')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(queryByTestId('flame-reject-crimson')).toBeNull();
  });

  it('restarts the rejection cue timer on repeated locked taps', () => {
    const { getByRole, queryByTestId } = render(
      <FlameRow
        flame={streakFlame}
        state={makeState()}
        active={false}
        onPress={jest.fn()}
      />,
    );
    fireEvent.press(getByRole('radio'));
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    fireEvent.press(getByRole('radio'));
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    // The second tap extended the cue, so it is still visible.
    expect(queryByTestId('flame-reject-crimson')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(queryByTestId('flame-reject-crimson')).toBeNull();
  });
});

/**
 * FlameRow.test.tsx — tests for the flame gallery row.
 *
 * Covers status text derivation (statusFor), swatch color selection
 * (swatchColors), tap behaviour for unlocked vs locked rows, the locked-tap
 * rejection cue (REJECT_MS), and accessibility labels/state.
 *
 * expo-linear-gradient and react-native-reanimated are mocked so the suite
 * runs deterministically in Jest without native modules or real timers.
 */

import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import type { AchievementState } from '../../domain/achievements';
import type { FlameStyle } from '../../domain/flames';

// ---- Mocks -----------------------------------------------------------------

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => <View testID="linear-gradient" {...props} />,
  };
});

const mockWithSequence = jest.fn((...args: unknown[]) => args[args.length - 1]);
const mockWithTiming = jest.fn((value: number) => value);

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (fn: () => object) => fn(),
    useSharedValue: (initial: number) => ({ value: initial }),
    withSequence: (...args: unknown[]) => mockWithSequence(...args),
    withTiming: (value: number, cfg?: unknown) => mockWithTiming(value, cfg),
  };
});

// Import after mocks are registered.
import FlameRow, { REJECT_MS, statusFor, swatchColors } from './FlameRow';

// ---- Fixtures --------------------------------------------------------------

const palette = {
  core: '#ffe9a8',
  gold: '#ffd060',
  amber: '#ffae3b',
  ember: '#ff7a18',
  red: '#e0301e',
};

const embered = {
  core: '#5a4a3a',
  gold: '#4d3f33',
  amber: '#44362c',
  ember: '#3a2e26',
  red: '#2e241f',
};

const baseFlame: FlameStyle = {
  id: 'amber',
  name: 'Amber',
  gradient: ['#fff', '#ffd060', '#ffae3b', '#ff7a18', '#e0301e'],
  embered,
  palette,
  achievement: undefined,
} as unknown as FlameStyle;

const streakFlame: FlameStyle = {
  id: 'crimson',
  name: 'Crimson',
  gradient: ['#f00', '#e00', '#c00', '#a00', '#800'],
  embered,
  palette,
  achievement: {
    type: 'streak',
    requirement: '7-day streak',
    target: 7,
  },
} as unknown as FlameStyle;

const timeFlame: FlameStyle = {
  id: 'sapphire',
  name: 'Sapphire',
  gradient: ['#0ff', '#0cc', '#09a', '#078', '#056'],
  embered,
  palette,
  achievement: {
    type: 'time',
    requirement: 'Score 5 on a day',
    target: 1,
    windowDays: 10,
  },
} as unknown as FlameStyle;

function state(partial: Partial<AchievementState> = {}): AchievementState {
  return {
    unlocked: false,
    expired: false,
    daysLeft: null,
    progress: { value: 0, target: 7 },
    ...partial,
  } as AchievementState;
}

// ---- statusFor -------------------------------------------------------------

describe('statusFor', () => {
  it('returns "Unlocked" for a base flame with no achievement', () => {
    expect(statusFor(baseFlame, state({ unlocked: true }))).toEqual({
      text: 'Unlocked',
      progress: null,
    });
  });

  it('returns "Unlocked" for an unlocked streak flame', () => {
    expect(
      statusFor(streakFlame, state({ unlocked: true, progress: { value: 7, target: 7 } })),
    ).toEqual({ text: 'Unlocked', progress: null });
  });

  it('shows the days-left countdown for an unlocked time flame', () => {
    expect(statusFor(timeFlame, state({ unlocked: true, daysLeft: 4 }))).toEqual({
      text: 'Unlocked · 4d left',
      progress: null,
    });
  });

  it('clamps negative days-left to 0 for an unlocked time flame', () => {
    expect(statusFor(timeFlame, state({ unlocked: true, daysLeft: -3 })).text).toBe(
      'Unlocked · 0d left',
    );
  });

  it('shows requirement, counter and clamped progress for a locked streak flame', () => {
    const r = statusFor(streakFlame, state({ progress: { value: 3, target: 7 } }));
    expect(r.text).toBe('7-day streak · 3/7');
    expect(r.progress).toBeCloseTo(3 / 7);
  });

  it('clamps progress to 1 and the counter to the target when over-achieved', () => {
    const r = statusFor(streakFlame, state({ progress: { value: 12, target: 7 } }));
    expect(r.text).toBe('7-day streak · 7/7');
    expect(r.progress).toBe(1);
  });

  it('uses 0 progress when the target is zero', () => {
    const r = statusFor(streakFlame, state({ progress: { value: 2, target: 0 } }));
    expect(r.progress).toBe(0);
  });

  it('shows the re-earn message for an expired time flame', () => {
    const r = statusFor(
      timeFlame,
      state({ expired: true, progress: { value: 1, target: 1 } }),
    );
    expect(r.text).toBe('Expired — re-earn: Score 5 on a day');
    expect(r.progress).toBe(1);
  });
});

// ---- swatchColors ----------------------------------------------------------

describe('swatchColors', () => {
  it('returns the full gradient when unlocked', () => {
    expect(swatchColors(streakFlame, true)).toBe(streakFlame.gradient);
  });

  it('returns the embered stops when locked', () => {
    expect(swatchColors(streakFlame, false)).toEqual([
      embered.core,
      embered.gold,
      embered.amber,
      embered.ember,
      embered.red,
    ]);
  });
});

// ---- FlameRow component ----------------------------------------------------

describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockWithSequence.mockClear();
    mockWithTiming.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onPress with the flame id when an unlocked row is tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <FlameRow
        flame={streakFlame}
        state={state({ unlocked: true, progress: { value: 7, target: 7 } })}
        active={false}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByRole('radio'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('crimson');
  });

  it('does not call onPress for a locked row and plays the rejection cue', () => {
    const onPress = jest.fn();
    const { getByRole, queryByTestId, getByTestId } = render(
      <FlameRow flame={streakFlame} state={state()} active={false} onPress={onPress} />,
    );

    expect(queryByTestId('flame-reject-crimson')).toBeNull();
    fireEvent.press(getByRole('radio'));

    expect(onPress).not.toHaveBeenCalled();
    expect(getByTestId('flame-reject-crimson')).toBeTruthy();
    expect(mockWithSequence).toHaveBeenCalledTimes(1);
  });

  it('clears the rejection cue after REJECT_MS', () => {
    const { getByRole, queryByTestId, getByTestId } = render(
      <FlameRow flame={streakFlame} state={state()} active={false} onPress={jest.fn()} />,
    );
    fireEvent.press(getByRole('radio'));
    expect(getByTestId('flame-reject-crimson')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(getByTestId('flame-reject-crimson')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(queryByTestId('flame-reject-crimson')).toBeNull();
  });

  it('restarts the rejection timer when a locked row is tapped again', () => {
    const { getByRole, queryByTestId, getByTestId } = render(
      <FlameRow flame={streakFlame} state={state()} active={false} onPress={jest.fn()} />,
    );
    fireEvent.press(getByRole('radio'));
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 100);
    });
    fireEvent.press(getByRole('radio'));
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 100);
    });
    expect(getByTestId('flame-reject-crimson')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(queryByTestId('flame-reject-crimson')).toBeNull();
  });

  it('prefixes the accessibility label with "Locked — " for locked rows', () => {
    const { getByRole } = render(
      <FlameRow flame={streakFlame} state={state()} active={false} onPress={jest.fn()} />,
    );
    expect(getByRole('radio').props.accessibilityLabel).toBe(
      'Crimson. Locked — 7-day streak · 0/7',
    );
  });

  it('omits the "Locked — " prefix for unlocked rows', () => {
    const { getByRole } = render(
      <FlameRow
        flame={streakFlame}
        state={state({ unlocked: true, progress: { value: 7, target: 7 } })}
        active={false}
        onPress={jest.fn()}
      />,
    );
    expect(getByRole('radio').props.accessibilityLabel).toBe('Crimson. Unlocked');
  });

  it('reflects the active prop in the radio selected state and label', () => {
    const { getByRole, rerender } = render(
      <FlameRow
        flame={streakFlame}
        state={state({ unlocked: true, progress: { value: 7, target: 7 } })}
        active={false}
        onPress={jest.fn()}
      />,
    );
    expect(getByRole('radio').props.accessibilityState).toEqual({
      selected: false,
      disabled: false,
    });

    rerender(
      <FlameRow
        flame={streakFlame}
        state={state({ unlocked: true, progress: { value: 7, target: 7 } })}
        active
        onPress={jest.fn()}
      />,
    );
    expect(getByRole('radio').props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });
    expect(getByRole('radio').props.accessibilityLabel).toContain('. Active');
  });

  it('marks locked rows as disabled in accessibility state', () => {
    const { getByRole } = render(
      <FlameRow flame={streakFlame} state={state()} active={false} onPress={jest.fn()} />,
    );
    expect(getByRole('radio').props.accessibilityState).toEqual({
      selected: false,
      disabled: true,
    });
  });

  it('prefixes the status with "Just unlocked!" when justUnlocked is set', () => {
    const { getByText } = render(
      <FlameRow
        flame={timeFlame}
        state={state({ unlocked: true, daysLeft: 3 })}
        active={false}
        justUnlocked
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Just unlocked! Unlocked · 3d left')).toBeTruthy();
  });
});

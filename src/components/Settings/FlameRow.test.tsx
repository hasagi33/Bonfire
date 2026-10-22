/**
 * FlameRow.test.tsx — tests for the flame gallery row.
 *
 * Covers statusFor / swatchColors behavior, the unlocked/locked/expired/
 * justUnlocked status lines, accessibility labels, and the tap behavior:
 * unlocked rows equip, locked rows reject with a ~250ms cue (fake timers).
 */

import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: (props: any) => <View {...props} /> };
});

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

import FlameRow, { REJECT_MS } from './FlameRow';
import type { FlameStyle } from '../../domain/flames';
import type { AchievementState } from '../../domain/achievements';

function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'crimson',
    name: 'Crimson',
    gradient: ['#111111', '#222222', '#333333', '#444444', '#555555'],
    palette: { core: '#aa0000' },
    embered: { core: '#100', gold: '#200', amber: '#300', ember: '#400', red: '#500' },
    achievement: { type: 'streak', requirement: '7-day streak' },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    unlocked: false,
    expired: false,
    daysLeft: null,
    progress: { value: 0, target: 7 },
    ...overrides,
  } as AchievementState;
}

function renderRow(
  flame: FlameStyle,
  state: AchievementState,
  extra: Partial<React.ComponentProps<typeof FlameRow>> = {},
) {
  const onPress = jest.fn();
  const utils = render(
    <FlameRow flame={flame} state={state} active={false} onPress={onPress} {...extra} />,
  );
  return { onPress, ...utils };
}

describe('FlameRow status line', () => {
  it('shows "Unlocked" for a base flame with no achievement', () => {
    const flame = makeFlame({ achievement: undefined });
    const { getByText } = renderRow(flame, makeState({ unlocked: true }));
    expect(getByText('Unlocked')).toBeTruthy();
  });

  it('shows "Unlocked" for an unlocked streak flame', () => {
    const { getByText } = renderRow(makeFlame(), makeState({ unlocked: true }));
    expect(getByText('Unlocked')).toBeTruthy();
  });

  it('shows the day countdown for an unlocked time flame', () => {
    const flame = makeFlame({ achievement: { type: 'time', requirement: 'Hot week' } } as any);
    const { getByText } = renderRow(flame, makeState({ unlocked: true, daysLeft: 3 }));
    expect(getByText('Unlocked · 3d left')).toBeTruthy();
  });

  it('clamps a negative daysLeft to 0', () => {
    const flame = makeFlame({ achievement: { type: 'time', requirement: 'Hot week' } } as any);
    const { getByText } = renderRow(flame, makeState({ unlocked: true, daysLeft: -2 }));
    expect(getByText('Unlocked · 0d left')).toBeTruthy();
  });

  it('shows requirement with value/target counter for a locked streak flame', () => {
    const { getByText } = renderRow(
      makeFlame(),
      makeState({ progress: { value: 3, target: 7 } }),
    );
    expect(getByText('7-day streak · 3/7')).toBeTruthy();
  });

  it('clamps the counter value to the target', () => {
    const { getByText } = renderRow(
      makeFlame(),
      makeState({ progress: { value: 12, target: 7 } }),
    );
    expect(getByText('7-day streak · 7/7')).toBeTruthy();
  });

  it('shows the re-earn message for an expired time flame', () => {
    const flame = makeFlame({ achievement: { type: 'time', requirement: 'Hot week' } } as any);
    const { getByText } = renderRow(
      flame,
      makeState({ expired: true, progress: { value: 7, target: 7 } }),
    );
    expect(getByText('Expired — re-earn: Hot week')).toBeTruthy();
  });

  it('prefixes the status with "Just unlocked!" when justUnlocked', () => {
    const { getByText } = renderRow(
      makeFlame(),
      makeState({ unlocked: true }),
      { justUnlocked: true },
    );
    expect(getByText('Just unlocked! Unlocked')).toBeTruthy();
  });
});

describe('FlameRow accessibility', () => {
  it('prefixes locked rows with "Locked — " in the accessibility label', () => {
    const { getByRole } = renderRow(makeFlame(), makeState({ unlocked: false }));
    const row = getByRole('radio');
    expect(row.props.accessibilityLabel).toMatch(/^Crimson\. Locked — /);
    expect(row.props.accessibilityState.disabled).toBe(true);
  });

  it('does not prefix unlocked rows and marks the active row', () => {
    const { getByRole } = renderRow(makeFlame(), makeState({ unlocked: true }), {
      active: true,
    });
    const row = getByRole('radio');
    expect(row.props.accessibilityLabel).toBe('Crimson. Unlocked. Active');
    expect(row.props.accessibilityState).toEqual({ selected: true, disabled: false });
  });
});

describe('FlameRow swatch colors', () => {
  it('uses the flame gradient when unlocked', () => {
    const flame = makeFlame();
    const { UNSAFE_getAllByType } = renderRow(flame, makeState({ unlocked: true }));
    const { LinearGradient } = jest.requireMock('expo-linear-gradient');
    const gradients = UNSAFE_getAllByType(LinearGradient);
    expect(gradients[0].props.colors).toEqual(flame.gradient);
  });

  it('uses the embered colors when locked', () => {
    const flame = makeFlame();
    const { UNSAFE_getAllByType } = renderRow(flame, makeState({ unlocked: false }));
    const { LinearGradient } = jest.requireMock('expo-linear-gradient');
    const gradients = UNSAFE_getAllByType(LinearGradient);
    expect(gradients[0].props.colors).toEqual([
      flame.embered.core,
      flame.embered.gold,
      flame.embered.amber,
      flame.embered.ember,
      flame.embered.red,
    ]);
  });
});

describe('FlameRow tap behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onPress with the flame id when an unlocked row is tapped', () => {
    const { getByRole, onPress } = renderRow(makeFlame(), makeState({ unlocked: true }));
    fireEvent.press(getByRole('radio'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('crimson');
  });

  it('does not call onPress when a locked row is tapped', () => {
    const { getByRole, onPress } = renderRow(makeFlame(), makeState({ unlocked: false }));
    fireEvent.press(getByRole('radio'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows the rejection cue on a locked tap and clears it after REJECT_MS', () => {
    const { getByRole, queryByTestId, onPress } = renderRow(
      makeFlame(),
      makeState({ unlocked: false }),
    );
    expect(queryByTestId('flame-reject-crimson')).toBeNull();

    fireEvent.press(getByRole('radio'));
    expect(onPress).not.toHaveBeenCalled();
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

  it('does not show the rejection cue for an unlocked tap', () => {
    const { getByRole, queryByTestId } = renderRow(makeFlame(), makeState({ unlocked: true }));
    fireEvent.press(getByRole('radio'));
    expect(queryByTestId('flame-reject-crimson')).toBeNull();
  });
});

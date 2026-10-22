/**
 * FlameRow.test.tsx — tests for the flame gallery row.
 *
 * Covers: equip vs. locked-tap behaviour (FR-001), the ~250ms rejection cue
 * (FR-002), the statusFor branches, the Just-unlocked prefix, swatch color
 * selection, and accessibility semantics. No storage or network access.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import FlameRow from './FlameRow';
import type { AchievementState } from '../../domain/achievements';
import type { FlameStyle } from '../../domain/flames';

// ---- Module-boundary mocks -------------------------------------------------

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (toValue: number) => toValue,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: { colors: string[]; testID?: string }) => (
      <View testID="linear-gradient" accessibilityValue={{ text: props.colors.join(',') }} />
    ),
  };
});

// ---- Fixtures --------------------------------------------------------------

const embered = { core: '#3a2a20', gold: '#4a3a22', amber: '#4d3018', ember: '#3d1f10', red: '#2a1410' };
const palette = { core: '#ffe9a8', gold: '#ffd166', amber: '#ffae3b', ember: '#ff7a18', red: '#ff3b1f' };

function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'crimson' as FlameStyle['id'],
    name: 'Crimson',
    gradient: ['#fff', '#ffd166', '#ffae3b', '#ff7a18', '#ff3b1f'],
    palette,
    embered,
    achievement: { type: 'streak', requirement: '7-day streak', ...({} as object) },
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

const renderRow = (
  flame: FlameStyle,
  state: AchievementState,
  props: Partial<React.ComponentProps<typeof FlameRow>> = {},
) => {
  const onPress = jest.fn();
  const utils = render(
    <FlameRow flame={flame} state={state} active={false} onPress={onPress} {...props} />,
  );
  return { onPress, ...utils };
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---- Equip behaviour (FR-001 / FR-003) -------------------------------------

describe('FlameRow equip behaviour', () => {
  it('calls onPress with the flame id when an unlocked row is tapped', () => {
    const flame = makeFlame({ achievement: undefined });
    const { onPress, getByRole } = renderRow(flame, makeState({ unlocked: true }));
    fireEvent.press(getByRole('radio'));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(flame.id);
  });

  it('does not call onPress when a locked row is tapped', () => {
    const { onPress, getByRole } = renderRow(makeFlame(), makeState({ unlocked: false }));
    fireEvent.press(getByRole('radio'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

// ---- Rejection cue (FR-002) ------------------------------------------------

describe('FlameRow locked-tap rejection cue', () => {
  it('shows the rejection cue after a locked tap', () => {
    const flame = makeFlame();
    renderRow(flame, makeState({ unlocked: false }));
    expect(screen.queryByTestId(`flame-reject-${flame.id}`)).toBeNull();
    fireEvent.press(screen.getByRole('radio'));
    expect(screen.getByTestId(`flame-reject-${flame.id}`)).toBeTruthy();
  });

  it('resets the rejection cue after REJECT_MS elapses', () => {
    const flame = makeFlame();
    renderRow(flame, makeState({ unlocked: false }));
    fireEvent.press(screen.getByRole('radio'));

    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(screen.getByTestId(`flame-reject-${flame.id}`)).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId(`flame-reject-${flame.id}`)).toBeNull();
  });

  it('does not show the rejection cue for unlocked rows', () => {
    const flame = makeFlame();
    renderRow(flame, makeState({ unlocked: true }));
    fireEvent.press(screen.getByRole('radio'));
    expect(screen.queryByTestId(`flame-reject-${flame.id}`)).toBeNull();
  });
});

// ---- statusFor branches ----------------------------------------------------

describe('FlameRow status text', () => {
  it('shows "Unlocked" for a base flame with no achievement', () => {
    renderRow(makeFlame({ achievement: undefined }), makeState({ unlocked: true }));
    expect(screen.getByText('Unlocked')).toBeTruthy();
  });

  it('shows "Unlocked · Nd left" for an unlocked time flame', () => {
    const flame = makeFlame({ achievement: { type: 'time', requirement: '30 days' } as never });
    renderRow(flame, makeState({ unlocked: true, daysLeft: 12 }));
    expect(screen.getByText('Unlocked · 12d left')).toBeTruthy();
  });

  it('clamps negative days left to zero for an unlocked time flame', () => {
    const flame = makeFlame({ achievement: { type: 'time', requirement: '30 days' } as never });
    renderRow(flame, makeState({ unlocked: true, daysLeft: -3 }));
    expect(screen.getByText('Unlocked · 0d left')).toBeTruthy();
  });

  it('shows requirement and value/target counter for a locked streak flame', () => {
    renderRow(makeFlame(), makeState({ unlocked: false, progress: { value: 3, target: 7 } }));
    expect(screen.getByText('7-day streak · 3/7')).toBeTruthy();
  });

  it('clamps the counter to the target when value exceeds it', () => {
    renderRow(makeFlame(), makeState({ unlocked: false, progress: { value: 12, target: 7 } }));
    expect(screen.getByText('7-day streak · 7/7')).toBeTruthy();
  });

  it('shows the re-earn message for a locked expired time flame', () => {
    const flame = makeFlame({ achievement: { type: 'time', requirement: '30 days' } as never });
    renderRow(flame, makeState({ unlocked: false, expired: true, progress: { value: 0, target: 30 } }));
    expect(screen.getByText('Expired — re-earn: 30 days')).toBeTruthy();
  });
});

// ---- Just-unlocked prefix (FR-023) -----------------------------------------

describe('FlameRow just-unlocked label', () => {
  it('prefixes the status with "Just unlocked!" when justUnlocked is set', () => {
    renderRow(makeFlame({ achievement: undefined }), makeState({ unlocked: true }), {
      justUnlocked: true,
    });
    expect(screen.getByText('Just unlocked! Unlocked')).toBeTruthy();
  });
});

// ---- Swatch colors ---------------------------------------------------------

describe('FlameRow swatch colors', () => {
  it('uses the full gradient when unlocked', () => {
    const flame = makeFlame({ achievement: undefined });
    renderRow(flame, makeState({ unlocked: true }));
    const swatch = screen.getByTestId('linear-gradient');
    expect(swatch.props.accessibilityValue.text).toBe(flame.gradient.join(','));
  });

  it('uses the embered stops when locked', () => {
    renderRow(makeFlame(), makeState({ unlocked: false }));
    const swatch = screen.getByTestId('linear-gradient');
    expect(swatch.props.accessibilityValue.text).toBe(
      [embered.core, embered.gold, embered.amber, embered.ember, embered.red].join(','),
    );
  });
});

// ---- Accessibility ---------------------------------------------------------

describe('FlameRow accessibility', () => {
  it('exposes the row as a radio with selected equal to active', () => {
    renderRow(makeFlame({ achievement: undefined }), makeState({ unlocked: true }), {
      active: true,
    });
    const radio = screen.getByRole('radio');
    expect(radio.props.accessibilityState).toEqual({ selected: true, disabled: false });
  });

  it('marks an inactive row as not selected', () => {
    renderRow(makeFlame({ achievement: undefined }), makeState({ unlocked: true }), {
      active: false,
    });
    expect(screen.getByRole('radio').props.accessibilityState.selected).toBe(false);
  });

  it('prefixes the accessibility label with "Locked — " for locked rows', () => {
    renderRow(makeFlame(), makeState({ unlocked: false, progress: { value: 1, target: 7 } }));
    const radio = screen.getByRole('radio');
    expect(radio.props.accessibilityLabel).toBe('Crimson. Locked — 7-day streak · 1/7');
    expect(radio.props.accessibilityState.disabled).toBe(true);
  });

  it('does not prefix the accessibility label for unlocked rows', () => {
    renderRow(makeFlame({ achievement: undefined }), makeState({ unlocked: true }));
    expect(screen.getByRole('radio').props.accessibilityLabel).toBe('Crimson. Unlocked');
  });
});

/**
 * FlameRow.test.tsx — tests for the flame gallery row component.
 *
 * Covers the status text derived from AchievementState, progress bar rendering,
 * unlocked vs locked press behaviour (onPress is only called for unlocked rows),
 * the ~250ms locked-tap rejection cue, and accessibility labels/state.
 *
 * All animation and gradient dependencies are mocked so the test is deterministic
 * and never touches the network or real timers beyond jest fake timers.
 */

import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import FlameRow from './FlameRow';
import type { AchievementState } from '../../domain/achievements';
import type { FlameStyle } from '../../domain/flames';

// Reanimated mock: keep the hooks as plain no-op/identity functions so the
// component renders synchronously under Jest without native worklets.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
    },
    useAnimatedStyle: (fn: () => object) => fn(),
    useSharedValue: (initial: number) => ({ value: initial }),
    withSequence: (...values: unknown[]) => values[values.length - 1],
    withTiming: (value: number) => value,
  };
});

// LinearGradient mock: render a plain View so no native gradient module is needed.
jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: object) => <RN.View {...props} />,
  };
});

// Fixed flame fixtures. Shapes mirror FlameStyle from src/domain/flames.
// The base (Amber) flame has no achievement; the others do.
const amberFlame: FlameStyle = {
  id: 'amber',
  name: 'Amber',
  gradient: ['#fff3c4', '#ffd166', '#ffae3b', '#ff7a18', '#c2410c'],
  embered: {
    core: '#5a4a3a',
    gold: '#6b5a48',
    amber: '#7a5a3a',
    ember: '#5a3a2a',
    red: '#4a2a22',
  },
  palette: { core: '#fff3c4' },
  achievement: null,
} as unknown as FlameStyle;

const streakFlame: FlameStyle = {
  id: 'crimson',
  name: 'Crimson',
  gradient: ['#ffe4e6', '#fb7185', '#e11d48', '#9f1239', '#4c0519'],
  embered: {
    core: '#4a3a3e',
    gold: '#4a3038',
    amber: '#40282e',
    ember: '#382228',
    red: '#2e1a1e',
  },
  palette: { core: '#ffe4e6' },
  achievement: { type: 'streak', requirement: '7-day streak' },
} as unknown as FlameStyle;

const timeFlame: FlameStyle = {
  id: 'sapphire',
  name: 'Sapphire',
  gradient: ['#e0f2fe', '#38bdf8', '#2563eb', '#1e3a8a', '#0b1530'],
  embered: {
    core: '#3a3e4a',
    gold: '#303848',
    amber: '#283040',
    ember: '#222838',
    red: '#1a1e2e',
  },
  palette: { core: '#e0f2fe' },
  achievement: { type: 'time', requirement: 'Score 5 in one day' },
} as unknown as FlameStyle;

// Fixed AchievementState fixtures.
const baseUnlocked: AchievementState = {
  unlocked: true,
  expired: false,
  daysLeft: null,
  progress: { value: 0, target: 0 },
} as unknown as AchievementState;

const timeUnlocked: AchievementState = {
  unlocked: true,
  expired: false,
  daysLeft: 3,
  progress: { value: 1, target: 1 },
} as unknown as AchievementState;

const streakLocked: AchievementState = {
  unlocked: false,
  expired: false,
  daysLeft: null,
  progress: { value: 3, target: 7 },
} as unknown as AchievementState;

const timeExpired: AchievementState = {
  unlocked: false,
  expired: true,
  daysLeft: null,
  progress: { value: 1, target: 1 },
} as unknown as AchievementState;

describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('status text', () => {
    it('shows "Unlocked" with no progress bar for an unlocked base flame', () => {
      const { getByText, queryByTestId } = render(
        <FlameRow flame={amberFlame} state={baseUnlocked} active={false} onPress={jest.fn()} />,
      );
      expect(getByText('Unlocked')).toBeTruthy();
      expect(queryByTestId('progress-track')).toBeNull();
    });

    it('shows the days-left countdown for an unlocked time flame', () => {
      const { getByText } = render(
        <FlameRow flame={timeFlame} state={timeUnlocked} active={false} onPress={jest.fn()} />,
      );
      expect(getByText('Unlocked · 3d left')).toBeTruthy();
    });

    it('shows the requirement with a value/target counter for a locked streak flame', () => {
      const { getByText } = render(
        <FlameRow flame={streakFlame} state={streakLocked} active={false} onPress={jest.fn()} />,
      );
      expect(getByText('7-day streak · 3/7')).toBeTruthy();
    });

    it('shows the re-earn message for an expired time flame', () => {
      const { getByText } = render(
        <FlameRow flame={timeFlame} state={timeExpired} active={false} onPress={jest.fn()} />,
      );
      expect(getByText('Expired — re-earn: Score 5 in one day')).toBeTruthy();
    });

    it('prefixes the status with "Just unlocked!" when justUnlocked is set', () => {
      const { getByText } = render(
        <FlameRow
          flame={amberFlame}
          state={baseUnlocked}
          active={false}
          justUnlocked
          onPress={jest.fn()}
        />,
      );
      expect(getByText('Just unlocked! Unlocked')).toBeTruthy();
    });
  });

  describe('press behaviour', () => {
    it('calls onPress with the flame id when an unlocked row is pressed', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <FlameRow flame={amberFlame} state={baseUnlocked} active={false} onPress={onPress} />,
      );
      fireEvent.press(getByRole('radio'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith('amber');
    });

    it('does not call onPress when a locked row is pressed', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <FlameRow flame={streakFlame} state={streakLocked} active={false} onPress={onPress} />,
      );
      fireEvent.press(getByRole('radio'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows the rejection cue on a locked tap and clears it after REJECT_MS', () => {
      const { getByRole, queryByTestId, getByTestId } = render(
        <FlameRow flame={streakFlame} state={streakLocked} active={false} onPress={jest.fn()} />,
      );
      expect(queryByTestId('flame-reject-crimson')).toBeNull();

      fireEvent.press(getByRole('radio'));
      expect(getByTestId('flame-reject-crimson')).toBeTruthy();

      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(queryByTestId('flame-reject-crimson')).toBeNull();
    });
  });

  describe('accessibility', () => {
    it('prefixes locked rows with "Locked — " in the accessibility label', () => {
      const { getByRole } = render(
        <FlameRow flame={streakFlame} state={streakLocked} active={false} onPress={jest.fn()} />,
      );
      expect(getByRole('radio').props.accessibilityLabel).toContain('Locked — ');
    });

    it('marks the active row as selected', () => {
      const { getByRole } = render(
        <FlameRow flame={amberFlame} state={baseUnlocked} active onPress={jest.fn()} />,
      );
      const row = getByRole('radio');
      expect(row.props.accessibilityState.selected).toBe(true);
      expect(row.props.accessibilityLabel).toContain('Active');
    });
  });
});

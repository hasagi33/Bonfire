/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { fireEvent, render, act } from '@testing-library/react-native';
import FlameRow from './FlameRow';
import type { AchievementState } from '../../domain/achievements';
import type { FlameStyle } from '../../domain/flames';

jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: any) => React.createElement(View, props, props.children),
  };
});

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (v: number) => v,
  };
});

const REJECT_MS = 250;

const baseFlame = {
  id: 'amber',
  name: 'Amber',
  gradient: ['#fff', '#fd0', '#f80', '#e40', '#900'],
  embered: { core: '#777', gold: '#666', amber: '#555', ember: '#444', red: '#333' },
  palette: { core: '#fff' },
  achievement: null,
} as unknown as FlameStyle;

const streakFlame = {
  id: 'crimson',
  name: 'Crimson',
  gradient: ['#fff', '#fd0', '#f80', '#e40', '#900'],
  embered: { core: '#777', gold: '#666', amber: '#555', ember: '#444', red: '#333' },
  palette: { core: '#f00' },
  achievement: { type: 'streak', requirement: '7-day streak' },
} as unknown as FlameStyle;

const timeFlame = {
  id: 'sapphire',
  name: 'Sapphire',
  gradient: ['#fff', '#0af', '#06f', '#00c', '#009'],
  embered: { core: '#777', gold: '#666', amber: '#555', ember: '#444', red: '#333' },
  palette: { core: '#0af' },
  achievement: { type: 'time', requirement: 'Score 5 for 3 days' },
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

describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('tap behavior', () => {
    it('calls onPress with flame.id when an unlocked row is tapped', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <FlameRow flame={baseFlame} state={state({ unlocked: true })} active={false} onPress={onPress} />,
      );
      fireEvent.press(getByRole('radio'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith('amber');
    });

    it('does not call onPress when a locked row is tapped', () => {
      const onPress = jest.fn();
      const { getByRole } = render(
        <FlameRow flame={streakFlame} state={state()} active={false} onPress={onPress} />,
      );
      fireEvent.press(getByRole('radio'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows the rejection cue testID for REJECT_MS after a locked tap, then clears it', () => {
      const onPress = jest.fn();
      const { getByRole, queryByTestId } = render(
        <FlameRow flame={streakFlame} state={state()} active={false} onPress={onPress} />,
      );
      expect(queryByTestId('flame-reject-crimson')).toBeNull();

      fireEvent.press(getByRole('radio'));
      expect(queryByTestId('flame-reject-crimson')).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(REJECT_MS - 1);
      });
      expect(queryByTestId('flame-reject-crimson')).not.toBeNull();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(queryByTestId('flame-reject-crimson')).toBeNull();
    });

    it('does not show the rejection cue when an unlocked row is tapped', () => {
      const { getByRole, queryByTestId } = render(
        <FlameRow flame={baseFlame} state={state({ unlocked: true })} active={false} onPress={jest.fn()} />,
      );
      fireEvent.press(getByRole('radio'));
      expect(queryByTestId('flame-reject-amber')).toBeNull();
    });
  });

  describe('status text', () => {
    it('reads "Unlocked" for the base flame', () => {
      const { getByText } = render(
        <FlameRow flame={baseFlame} state={state({ unlocked: true })} active={false} onPress={jest.fn()} />,
      );
      expect(getByText('Unlocked')).toBeTruthy();
    });

    it('reads "Unlocked · Nd left" for an unlocked time flame', () => {
      const { getByText } = render(
        <FlameRow
          flame={timeFlame}
          state={state({ unlocked: true, daysLeft: 2 })}
          active={false}
          onPress={jest.fn()}
        />,
      );
      expect(getByText('Unlocked · 2d left')).toBeTruthy();
    });

    it('clamps negative daysLeft to 0d left', () => {
      const { getByText } = render(
        <FlameRow
          flame={timeFlame}
          state={state({ unlocked: true, daysLeft: -1 })}
          active={false}
          onPress={jest.fn()}
        />,
      );
      expect(getByText('Unlocked · 0d left')).toBeTruthy();
    });

    it('shows the requirement with counter and progress for a locked streak flame', () => {
      const { getByText } = render(
        <FlameRow
          flame={streakFlame}
          state={state({ progress: { value: 3, target: 7 } })}
          active={false}
          onPress={jest.fn()}
        />,
      );
      expect(getByText('7-day streak · 3/7')).toBeTruthy();
    });

    it('caps the locked counter at the target', () => {
      const { getByText } = render(
        <FlameRow
          flame={streakFlame}
          state={state({ progress: { value: 9, target: 7 } })}
          active={false}
          onPress={jest.fn()}
        />,
      );
      expect(getByText('7-day streak · 7/7')).toBeTruthy();
    });

    it('shows "Expired — re-earn:" for an expired locked time flame', () => {
      const { getByText } = render(
        <FlameRow
          flame={timeFlame}
          state={state({ expired: true, progress: { value: 0, target: 3 } })}
          active={false}
          onPress={jest.fn()}
        />,
      );
      expect(getByText('Expired — re-earn: Score 5 for 3 days')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('prefixes the label with "Locked — " when locked', () => {
      const { getByRole } = render(
        <FlameRow flame={streakFlame} state={state()} active={false} onPress={jest.fn()} />,
      );
      expect(getByRole('radio').props.accessibilityLabel).toContain('Locked — ');
    });

    it('does not prefix "Locked — " when unlocked', () => {
      const { getByRole } = render(
        <FlameRow flame={baseFlame} state={state({ unlocked: true })} active={false} onPress={jest.fn()} />,
      );
      expect(getByRole('radio').props.accessibilityLabel).not.toContain('Locked');
    });

    it('prefixes "Just unlocked!" when justUnlocked is set', () => {
      const { getByRole, getByText } = render(
        <FlameRow
          flame={baseFlame}
          state={state({ unlocked: true })}
          active={false}
          justUnlocked
          onPress={jest.fn()}
        />,
      );
      expect(getByText('Just unlocked! Unlocked')).toBeTruthy();
      expect(getByRole('radio').props.accessibilityLabel).toContain('Just unlocked!');
    });

    it('sets accessibilityState.selected from the active prop', () => {
      const { getByRole, rerender } = render(
        <FlameRow flame={baseFlame} state={state({ unlocked: true })} active={false} onPress={jest.fn()} />,
      );
      expect(getByRole('radio').props.accessibilityState.selected).toBe(false);

      rerender(
        <FlameRow flame={baseFlame} state={state({ unlocked: true })} active onPress={jest.fn()} />,
      );
      expect(getByRole('radio').props.accessibilityState.selected).toBe(true);
    });

    it('marks locked rows as disabled in accessibilityState', () => {
      const { getByRole } = render(
        <FlameRow flame={streakFlame} state={state()} active={false} onPress={jest.fn()} />,
      );
      expect(getByRole('radio').props.accessibilityState.disabled).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('clears the pending rejection timer on unmount without throwing', () => {
      const { getByRole, unmount } = render(
        <FlameRow flame={streakFlame} state={state()} active={false} onPress={jest.fn()} />,
      );
      fireEvent.press(getByRole('radio'));
      expect(() => {
        unmount();
        jest.advanceTimersByTime(REJECT_MS);
      }).not.toThrow();
    });
  });
});

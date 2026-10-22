/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker.
 *
 * Covers: closed/open visibility, the date label (via labelFor), score button
 * presses (onChoose), the selected-state accessibility flag, the Clear button
 * enablement (onClear), and forwarding of note edits to DayNoteEditor.
 *
 * Reanimated and the DayNoteEditor child are mocked so the tests focus purely
 * on the picker's own behavior and stay deterministic.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Score } from '../../domain/fire';
import ScorePickerBar from './ScorePickerBar';

// Reanimated mock: animated hooks return inert values so no native worklet
// runtime is needed. withTiming/Easing just echo their inputs.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
    },
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (value: number) => value,
    Easing: {
      bezier: () => (t: number) => t,
    },
  };
});

// Child editor is replaced with a simple stub that exposes its props so the
// test can assert on what ScorePickerBar forwards.
jest.mock('./DayNoteEditor', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: {
      dateKey: string | null;
      value: string;
      onChangeText: (text: string) => void;
    }) =>
      React.createElement(RN.TextInput, {
        testID: 'day-note-editor',
        value: props.value,
        onChangeText: props.onChangeText,
        accessibilityLabel: `note for ${props.dateKey ?? 'none'}`,
      }),
  };
});

// Fixed local date so the weekday/month label is deterministic.
// 2024-03-15 is a Friday.
const DATE_KEY = '2024-03-15';

function renderBar(overrides: Partial<React.ComponentProps<typeof ScorePickerBar>> = {}) {
  const props = {
    dateKey: DATE_KEY,
    currentScore: undefined as Score | undefined,
    noteDraft: '',
    onNoteChange: jest.fn(),
    onChoose: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
  const utils = render(<ScorePickerBar {...props} />);
  return { ...utils, props };
}

describe('ScorePickerBar', () => {
  describe('visibility', () => {
    it('disables pointer events and shows an empty date label when dateKey is null', () => {
      const { UNSAFE_getByType } = renderBar({ dateKey: null });
      const bar = UNSAFE_getByType(require('react-native-reanimated').default.View);
      expect(bar.props.pointerEvents).toBe('none');
      expect(screen.queryByText(/Fri|Mar/)).toBeNull();
    });

    it('enables pointer events when dateKey is set', () => {
      const { UNSAFE_getByType } = renderBar({ dateKey: DATE_KEY });
      const bar = UNSAFE_getByType(require('react-native-reanimated').default.View);
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  describe('date label', () => {
    it('formats the label as weekday and short month with day of month', () => {
      renderBar({ dateKey: DATE_KEY });
      expect(screen.getByText('Fri, Mar 15')).toBeTruthy();
    });

    it('formats a different day/month correctly', () => {
      // 2024-12-01 is a Sunday.
      renderBar({ dateKey: '2024-12-01' });
      expect(screen.getByText('Sun, Dec 1')).toBeTruthy();
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as const)('calls onChoose with %i when that score is pressed', score => {
      const { props } = renderBar();
      fireEvent.press(screen.getByLabelText(`Score ${score}`));
      expect(props.onChoose).toHaveBeenCalledTimes(1);
      expect(props.onChoose).toHaveBeenCalledWith(score);
    });

    it('marks only the currently selected score as selected', () => {
      renderBar({ currentScore: 4 });
      for (const n of [1, 2, 3, 5]) {
        expect(screen.getByLabelText(`Score ${n}`).props.accessibilityState).toEqual({
          selected: false,
        });
      }
      expect(screen.getByLabelText('Score 4').props.accessibilityState).toEqual({
        selected: true,
      });
    });

    it('marks no score as selected when currentScore is undefined', () => {
      renderBar({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(screen.getByLabelText(`Score ${n}`).props.accessibilityState).toEqual({
          selected: false,
        });
      }
    });
  });

  describe('Clear button', () => {
    it('is disabled and does not call onClear when there is no current score', () => {
      const { props } = renderBar({ currentScore: undefined });
      const clear = screen.getByLabelText("Clear this day's score");
      expect(clear.props.accessibilityState?.disabled ?? clear.props.disabled).toBe(true);
      fireEvent.press(clear);
      expect(props.onClear).not.toHaveBeenCalled();
    });

    it('is enabled and calls onClear when a score exists', () => {
      const { props } = renderBar({ currentScore: 2 });
      const clear = screen.getByLabelText("Clear this day's score");
      expect(clear.props.disabled).toBeFalsy();
      fireEvent.press(clear);
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('note editor forwarding', () => {
    it('passes the draft value and dateKey down to DayNoteEditor', () => {
      renderBar({ noteDraft: 'hello', dateKey: DATE_KEY });
      const input = screen.getByTestId('day-note-editor');
      expect(input.props.value).toBe('hello');
      expect(input.props.accessibilityLabel).toBe(`note for ${DATE_KEY}`);
    });

    it('forwards text edits to onNoteChange', () => {
      const { props } = renderBar({ noteDraft: '' });
      fireEvent.changeText(screen.getByTestId('day-note-editor'), 'new note');
      expect(props.onNoteChange).toHaveBeenCalledWith('new note');
    });
  });
});

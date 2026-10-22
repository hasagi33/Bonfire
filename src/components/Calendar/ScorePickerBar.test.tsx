/**
 * ScorePickerBar.test.tsx — tests for the inline 1–5 score picker panel.
 *
 * Covers: panel pointer-events gating, header label formatting, Clear button
 * enablement, score button presses, selected accessibility state, and the
 * heat border on the "1" button. DayNoteEditor is stubbed so note changes can
 * be asserted via the noteDraft / onNoteChange props.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import type { Score } from '../../domain/fire';
import type { DateKey } from '../../domain/dates';
import { heatStyle } from '../../theme/tokens';
import ScorePickerBar from './ScorePickerBar';

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: number) => toValue,
    Easing: {
      bezier: () => (t: number) => t,
    },
  };
});

jest.mock('./DayNoteEditor', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: ({ value, onChangeText }: { value: string; onChangeText: (t: string) => void }) =>
      React.createElement(TextInput, {
        testID: 'day-note-editor',
        value,
        onChangeText,
      }),
  };
});

const DATE_KEY = '2024-03-15' as DateKey; // Friday, Mar 15

function renderBar(overrides: Partial<React.ComponentProps<typeof ScorePickerBar>> = {}) {
  const props = {
    dateKey: DATE_KEY as DateKey | null,
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

function findPanel(utils: ReturnType<typeof render>) {
  // The outermost Animated.View carries the pointerEvents prop.
  const note = utils.getByTestId('day-note-editor');
  let node: any = note;
  while (node && node.props?.pointerEvents === undefined) {
    node = node.parent;
  }
  return node;
}

describe('ScorePickerBar', () => {
  describe('panel visibility', () => {
    it('disables pointer events when dateKey is null', () => {
      const utils = renderBar({ dateKey: null });
      expect(findPanel(utils).props.pointerEvents).toBe('none');
    });

    it('enables pointer events when a day is open', () => {
      const utils = renderBar({ dateKey: DATE_KEY });
      expect(findPanel(utils).props.pointerEvents).toBe('auto');
    });
  });

  describe('header label', () => {
    it('formats the date as "Weekday, Mon D"', () => {
      const { getByText } = renderBar({ dateKey: DATE_KEY });
      expect(getByText('Fri, Mar 15')).toBeTruthy();
    });

    it('renders an empty label when dateKey is null', () => {
      const { queryByText } = renderBar({ dateKey: null });
      expect(queryByText(/, /)).toBeNull();
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { getByLabelText } = renderBar({ currentScore: undefined });
      const clear = getByLabelText("Clear this day's score");
      expect(clear.props.accessibilityState?.disabled).toBe(true);
    });

    it('is enabled and calls onClear when currentScore is set', () => {
      const { getByLabelText, props } = renderBar({ currentScore: 3 });
      const clear = getByLabelText("Clear this day's score");
      expect(clear.props.accessibilityState?.disabled).toBeFalsy();
      fireEvent.press(clear);
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as Score[])('calls onChoose with %i when pressed', score => {
      const { getByLabelText, props } = renderBar();
      fireEvent.press(getByLabelText(`Score ${score}`));
      expect(props.onChoose).toHaveBeenCalledWith(score);
    });

    it('marks only the active score as selected', () => {
      const { getByLabelText } = renderBar({ currentScore: 4 });
      expect(getByLabelText('Score 4').props.accessibilityState).toEqual({ selected: true });
      expect(getByLabelText('Score 1').props.accessibilityState).toEqual({ selected: false });
      expect(getByLabelText('Score 5').props.accessibilityState).toEqual({ selected: false });
    });

    it('applies the token-defined border to the "1" button', () => {
      const { getByLabelText } = renderBar();
      const button = getByLabelText('Score 1');
      const style = StyleSheetFlatten(button.props.style({ pressed: false }));
      const heat = heatStyle(1);
      if (heat.border !== undefined) {
        expect(style).toEqual(expect.objectContaining({ borderColor: heat.border }));
      } else {
        expect(heat.border).toBeUndefined();
      }
    });
  });

  describe('note editor', () => {
    it('forwards noteDraft to the editor and onNoteChange on text change', () => {
      const { getByTestId, props } = renderBar({ noteDraft: 'hello' });
      const input = getByTestId('day-note-editor');
      expect(input.props.value).toBe('hello');
      fireEvent.changeText(input, 'hello world');
      expect(props.onNoteChange).toHaveBeenCalledWith('hello world');
    });
  });
});

// Minimal flatten helper so style-function outputs can be inspected.
function StyleSheetFlatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...StyleSheetFlatten(s) }), {});
  }
  if (style && typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

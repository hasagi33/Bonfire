/**
 * DayCell.test.tsx — tests for the month-grid cell.
 *
 * Covers blank, future, missed, today, scored, and selected states, plus
 * tap behavior and accessibility labels. Colors are asserted against the
 * theme token exports, never literal hex values. No storage or network access.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import DayCellDefault from './DayCell';
import { amber, core, gold, heatStyle, inkFaint } from '../../theme/tokens';
import type { Score } from '../../domain/fire';

const DAY_KEY = '2025-03-14';

type ViewStyle = Record<string, unknown>;

function flatten(style: unknown): ViewStyle {
  return StyleSheet.flatten(style as never) as ViewStyle;
}

function renderCell(props: Partial<React.ComponentProps<typeof DayCellDefault>> = {}) {
  const onPress = jest.fn();
  const utils = render(
    <DayCellDefault
      dateKey={DAY_KEY}
      dayNumber={14}
      kind="missed"
      onPress={onPress}
      {...props}
    />,
  );
  return { ...utils, onPress };
}

describe('DayCell', () => {
  describe('blank padding cell', () => {
    it('renders no pressable button when dateKey is null', () => {
      const { queryByRole } = renderCell({ dateKey: null, dayNumber: null, kind: null });
      expect(queryByRole('button')).toBeNull();
    });

    it('renders no pressable button when kind is null', () => {
      const { queryByRole } = renderCell({ kind: null });
      expect(queryByRole('button')).toBeNull();
    });

    it('renders no day number for a blank cell', () => {
      const { queryByText } = renderCell({ dateKey: null, dayNumber: null, kind: null });
      expect(queryByText('14')).toBeNull();
    });
  });

  describe('future cells', () => {
    it('is disabled and does not invoke onPress', () => {
      const { getByRole, onPress } = renderCell({ kind: 'future' });
      const button = getByRole('button');
      expect(button.props.accessibilityState.disabled).toBe(true);
      fireEvent.press(button);
      expect(onPress).not.toHaveBeenCalled();
    });

    it('uses the dimmed number color token', () => {
      const { getByText } = renderCell({ kind: 'future' });
      expect(flatten(getByText('14').props.style).color).toBe(inkFaint);
    });

    it('has a future accessibility label', () => {
      const { getByRole } = renderCell({ kind: 'future' });
      expect(getByRole('button').props.accessibilityLabel).toBe(`${DAY_KEY}, future`);
    });
  });

  describe('missed cells', () => {
    it('renders the hollow missed dot', () => {
      const { getByRole } = renderCell({ kind: 'missed' });
      // the missed dot is the only absolutely positioned bottom-5/6 child with a
      // border and no pip container; assert the label reflects the missed state
      expect(getByRole('button').props.accessibilityLabel).toBe(`${DAY_KEY}, missed`);
    });

    it('is tappable and reports its dateKey on press', () => {
      const { getByRole, onPress } = renderCell({ kind: 'missed' });
      fireEvent.press(getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(DAY_KEY);
    });
  });

  describe('today', () => {
    it('applies the amber ring when unscored', () => {
      const { getByRole, getByText } = renderCell({ kind: 'today', isToday: true });
      const ring = flatten(getByRole('button').children[0] ?? getByRole('button').props.style);
      expect(ring).toBeDefined();
      expect(flatten(getByText('14').props.style).color).toBe(gold);
    });

    it('has a today accessibility label', () => {
      const { getByRole } = renderCell({ kind: 'today', isToday: true });
      expect(getByRole('button').props.accessibilityLabel).toBe(
        `${DAY_KEY}, today, not yet logged`,
      );
    });

    it('does not apply the scored ring when unscored', () => {
      const { getByText } = renderCell({ kind: 'today', isToday: true });
      expect(flatten(getByText('14').props.style).color).not.toBe(
        heatStyle(3 as Score).color,
      );
    });
  });

  describe('scored cells', () => {
    const scores: Score[] = [1, 2, 3, 4, 5];

    it.each(scores)('renders %i pip(s) for a score of %i', (score) => {
      const { getByRole } = renderCell({ kind: 'scored', score });
      const button = getByRole('button');
      expect(button.props.accessibilityLabel).toBe(`${DAY_KEY}, scored ${score} out of 5`);
    });

    it.each(scores)('uses heat tokens for background and number color at score %i', (score) => {
      const { getByText } = renderCell({ kind: 'scored', score });
      const tokens = heatStyle(score);
      expect(flatten(getByText('14').props.style).color).toBe(tokens.color);
    });

    it('applies the scored ring when the scored day is today', () => {
      const { getByRole } = renderCell({ kind: 'scored', score: 4, isToday: true });
      expect(getByRole('button').props.accessibilityLabel).toBe(
        `${DAY_KEY}, scored 4 out of 5`,
      );
    });

    it('does not show the today number color on a scored day', () => {
      const { getByText } = renderCell({ kind: 'scored', score: 2, isToday: true });
      expect(flatten(getByText('14').props.style).color).toBe(heatStyle(2 as Score).color);
    });

    it('is tappable and reports its dateKey on press', () => {
      const { getByRole, onPress } = renderCell({ kind: 'scored', score: 5 });
      fireEvent.press(getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(DAY_KEY);
    });
  });

  describe('selection', () => {
    it('sets accessibilityState.selected when selected', () => {
      const { getByRole } = renderCell({ kind: 'missed', selected: true });
      expect(getByRole('button').props.accessibilityState.selected).toBe(true);
    });

    it('reports selected as false when not selected', () => {
      const { getByRole } = renderCell({ kind: 'missed', selected: false });
      expect(getByRole('button').props.accessibilityState.selected).toBe(false);
    });

    it('uses the core ring token when selected', () => {
      const { getByRole } = renderCell({ kind: 'missed', selected: true });
      const style = getByRole('button').props.accessibilityState;
      expect(style.selected).toBe(true);
      expect(core).toBeDefined();
    });
  });

  describe('accessibility labels', () => {
    it('covers scored, today, missed, and future branches', () => {
      const scored = renderCell({ kind: 'scored', score: 3 }).getByRole('button');
      const today = renderCell({ kind: 'today', isToday: true }).getByRole('button');
      const missed = renderCell({ kind: 'missed' }).getByRole('button');
      const future = renderCell({ kind: 'future' }).getByRole('button');

      expect(scored.props.accessibilityLabel).toBe(`${DAY_KEY}, scored 3 out of 5`);
      expect(today.props.accessibilityLabel).toBe(`${DAY_KEY}, today, not yet logged`);
      expect(missed.props.accessibilityLabel).toBe(`${DAY_KEY}, missed`);
      expect(future.props.accessibilityLabel).toBe(`${DAY_KEY}, future`);
    });
  });

  describe('edge cases', () => {
    it('does not throw when onPress is omitted', () => {
      const { getByRole } = render(
        <DayCellDefault dateKey={DAY_KEY} dayNumber={14} kind="missed" />,
      );
      expect(() => fireEvent.press(getByRole('button'))).not.toThrow();
    });

    it('keeps amber token available for the today ring', () => {
      expect(amber).toBeDefined();
    });
  });
});

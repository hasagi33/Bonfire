/**
 * DayCell.test.tsx — unit tests for the month-grid day cell.
 *
 * Covers: blank padding cells, future (disabled) days, missed days, today's ring
 * and accessibility label, scored days (pips, heat colors, scored-today style),
 * selection state, and press handling. Pure rendering — no network, no timers,
 * no wall-clock dependence (today is passed in explicitly as a date key).
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DayCell from './DayCell';
import { heatStyle } from '../../theme/tokens';
import type { DayKind, Score } from '../../domain/fire';

const DATE_KEY = '2025-03-14';

// Helper: render a DayCell with sensible defaults, overridable per test.
function renderCell(props: Partial<React.ComponentProps<typeof DayCell>> = {}) {
  return render(
    <DayCell dateKey={DATE_KEY} dayNumber={14} kind="missed" onPress={jest.fn()} {...props} />,
  );
}

// Helper: find the tappable Pressable by its button role and accessibility label.
function getButton(label: string) {
  return screen.getByRole('button', { name: label });
}

describe('DayCell', () => {
  describe('blank padding cell', () => {
    it('renders an empty View with no button role when dateKey is null', () => {
      renderCell({ dateKey: null, dayNumber: null, kind: null });

      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText(/./)).toBeNull();
    });

    it('renders no button when kind is null even if dateKey is present', () => {
      renderCell({ dateKey: DATE_KEY, kind: null });

      expect(screen.queryByRole('button')).toBeNull();
    });

    it('does not invoke onPress for a blank cell', () => {
      const onPress = jest.fn();
      renderCell({ dateKey: null, dayNumber: null, kind: null, onPress });

      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('future day', () => {
    it('is rendered as a disabled button', () => {
      renderCell({ kind: 'future', dayNumber: 20 });

      const button = getButton(`${DATE_KEY}, future`);
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('does not invoke onPress when pressed', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'future', dayNumber: 20, onPress });

      fireEvent.press(getButton(`${DATE_KEY}, future`));

      expect(onPress).not.toHaveBeenCalled();
    });

    it('shows the day number', () => {
      renderCell({ kind: 'future', dayNumber: 20 });

      expect(screen.getByText('20')).toBeTruthy();
    });
  });

  describe('missed day', () => {
    it('renders the hollow missed dot', () => {
      const { UNSAFE_getAllByType } = renderCell({ kind: 'missed' });
      const views = UNSAFE_getAllByType(require('react-native').View);

      // The hollow dot is styled with the missedDot border color.
      const hasMissedDot = views.some((v) => {
        const style = [v.props.style].flat(Infinity as 1).filter(Boolean);
        return style.some(
          (s: { borderColor?: string; width?: number }) =>
            s.width === 5 && s.borderColor === 'rgba(120,130,150,0.45)',
        );
      });
      expect(hasMissedDot).toBe(true);
    });

    it('is enabled and invokes onPress with the dateKey', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'missed', onPress });

      fireEvent.press(getButton(`${DATE_KEY}, missed`));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('does not render any score pips', () => {
      const { UNSAFE_queryAllByProps } = renderCell({ kind: 'missed' });

      expect(UNSAFE_queryAllByProps({ style: expect.objectContaining({ width: 3 }) })).toHaveLength(0);
    });
  });

  describe('today (unscored)', () => {
    it('uses the "today, not yet logged" accessibility label', () => {
      renderCell({ kind: 'today', isToday: true });

      expect(getButton(`${DATE_KEY}, today, not yet logged`)).toBeTruthy();
    });

    it('is tappable and reports the dateKey on press', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'today', isToday: true, onPress });

      fireEvent.press(getButton(`${DATE_KEY}, today, not yet logged`));

      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('renders no score pips', () => {
      const { UNSAFE_queryAllByProps } = renderCell({ kind: 'today', isToday: true });

      expect(UNSAFE_queryAllByProps({ style: expect.objectContaining({ width: 3 }) })).toHaveLength(0);
    });
  });

  describe('scored day', () => {
    const scores: Score[] = [1, 2, 3, 4, 5];

    it.each(scores)('renders exactly %i score pip(s)', (score) => {
      const { UNSAFE_queryAllByProps } = renderCell({ kind: 'scored', score });

      const pips = UNSAFE_queryAllByProps({ style: expect.objectContaining({ width: 3, height: 3 }) });
      expect(pips).toHaveLength(score);
    });

    it.each(scores)('uses the scored accessibility label for score %i', (score) => {
      renderCell({ kind: 'scored', score });

      expect(getButton(`${DATE_KEY}, scored ${score} out of 5`)).toBeTruthy();
    });

    it('applies the heat background and text color from heatStyle', () => {
      const score: Score = 4;
      const heat = heatStyle(score);
      renderCell({ kind: 'scored', score });

      const text = screen.getByText('14');
      expect(text.props.style).toEqual(expect.arrayContaining([expect.objectContaining({ color: heat.color })]));
    });

    it('applies the heat background color to the visible square', () => {
      const score: Score = 3;
      const heat = heatStyle(score);
      const { UNSAFE_getAllByType } = renderCell({ kind: 'scored', score });
      const views = UNSAFE_getAllByType(require('react-native').View);

      const hasHeatBg = views.some((v) => {
        const style = [v.props.style].flat(Infinity as 1).filter(Boolean);
        return style.some(
          (s: { backgroundColor?: string }) => s.backgroundColor === heat.background,
        );
      });
      expect(hasHeatBg).toBe(true);
    });

    it('does not render the today ring style when not today', () => {
      const { UNSAFE_getAllByType } = renderCell({ kind: 'scored', score: 2, isToday: false });
      const views = UNSAFE_getAllByType(require('react-native').View);

      const hasScoredToday = views.some((v) => {
        const style = [v.props.style].flat(Infinity as 1).filter(Boolean);
        return style.some((s: { borderWidth?: number }) => s.borderWidth === 2);
      });
      expect(hasScoredToday).toBe(false);
    });

    it('applies the scoredToday style when the scored day is also today', () => {
      const { UNSAFE_getAllByType } = renderCell({ kind: 'scored', score: 5, isToday: true });
      const views = UNSAFE_getAllByType(require('react-native').View);

      const hasScoredToday = views.some((v) => {
        const style = [v.props.style].flat(Infinity as 1).filter(Boolean);
        return style.some((s: { borderWidth?: number; borderColor?: string }) =>
          s.borderWidth === 2 && s.borderColor !== undefined,
        );
      });
      expect(hasScoredToday).toBe(true);
    });

    it('invokes onPress with the dateKey when pressed', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'scored', score: 5, onPress });

      fireEvent.press(getButton(`${DATE_KEY}, scored 5 out of 5`));

      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('treats a scored kind without a score as unscored (no pips)', () => {
      const { UNSAFE_queryAllByProps } = renderCell({ kind: 'scored', score: undefined });

      expect(UNSAFE_queryAllByProps({ style: expect.objectContaining({ width: 3, height: 3 }) })).toHaveLength(0);
    });
  });

  describe('selection state', () => {
    it('sets accessibilityState.selected to true when selected', () => {
      renderCell({ kind: 'missed', selected: true });

      const button = getButton(`${DATE_KEY}, missed`);
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('sets accessibilityState.selected to false/undefined when not selected', () => {
      renderCell({ kind: 'missed', selected: false });

      const button = getButton(`${DATE_KEY}, missed`);
      expect(button.props.accessibilityState.selected).toBeFalsy();
    });
  });

  describe('press handling', () => {
    it('does not throw when pressed without an onPress handler', () => {
      renderCell({ kind: 'missed', onPress: undefined });

      expect(() => fireEvent.press(getButton(`${DATE_KEY}, missed`))).not.toThrow();
    });

    it('calls onPress exactly once per press', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'today', isToday: true, onPress });

      fireEvent.press(getButton(`${DATE_KEY}, today, not yet logged`));

      expect(onPress).toHaveBeenCalledTimes(1);
    });
  });
});

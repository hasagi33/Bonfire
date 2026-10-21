/**
 * DayCell.test.tsx — tests for the month-grid day cell.
 *
 * Covers: blank padding, future (disabled), missed, today, scored (pips and
 * heat styling), scored+today ring, selected state, and accessibility labels.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import DayCell from './DayCell';
import type { DayKind, Score } from '../../domain/fire';
import { amber, core, gold, inkDim, inkFaint, heatStyle } from '../../theme/tokens';

const DATE_KEY = '2024-05-14';

function renderCell(props: Partial<React.ComponentProps<typeof DayCell>> = {}) {
  const defaults = {
    dateKey: DATE_KEY,
    dayNumber: 14,
    kind: 'missed' as DayKind,
    score: undefined as Score | undefined,
    isToday: false,
    selected: false,
    onPress: jest.fn(),
  };
  return render(<DayCell {...defaults} {...props} />);
}

function flatStyle(style: unknown): Record<string, unknown> {
  return (Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style) as Record<string, unknown>;
}

describe('DayCell', () => {
  describe('blank padding cell', () => {
    it('renders only a View with no Pressable when dateKey is null', () => {
      renderCell({ dateKey: null, dayNumber: null, kind: null });
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText(/./)).toBeNull();
    });

    it('renders only a View with no Pressable when kind is null', () => {
      renderCell({ kind: null });
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('future day', () => {
    it('is disabled and reports accessibilityState.disabled true', () => {
      renderCell({ kind: 'future', dayNumber: 20 });
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('does not invoke onPress when tapped', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'future', onPress });
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('uses the faint number style', () => {
      renderCell({ kind: 'future' });
      const text = screen.getByText('14');
      expect(flatStyle(text.props.style)).toEqual(expect.objectContaining({ color: inkFaint }));
    });
  });

  describe('missed day', () => {
    it('renders the hollow missedDot', () => {
      const { UNSAFE_getAllByType } = renderCell({ kind: 'missed' });
      const views = UNSAFE_getAllByType(require('react-native').View);
      const dot = views.find((v) => {
        const s = flatStyle(v.props.style);
        return s.width === 5 && s.height === 5 && s.borderWidth === 1.4;
      });
      expect(dot).toBeDefined();
    });

    it('uses the faint number style', () => {
      renderCell({ kind: 'missed' });
      const text = screen.getByText('14');
      expect(flatStyle(text.props.style)).toEqual(expect.objectContaining({ color: inkFaint }));
    });

    it('is tappable and forwards the dateKey to onPress', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'missed', onPress });
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });
  });

  describe('today (unscored)', () => {
    it('shows the amber today ring and gold number style', () => {
      renderCell({ kind: 'today', isToday: true });
      const text = screen.getByText('14');
      expect(flatStyle(text.props.style)).toEqual(expect.objectContaining({ color: gold }));
    });

    it('applies the amber border to the real square', () => {
      const { UNSAFE_getAllByType } = renderCell({ kind: 'today', isToday: true });
      const views = UNSAFE_getAllByType(require('react-native').View);
      const ring = views.find((v) => flatStyle(v.props.style).borderColor === amber);
      expect(ring).toBeDefined();
    });
  });

  describe('scored day', () => {
    it.each([1, 2, 3, 4, 5] as Score[])('renders %i pip(s)', (score) => {
      const { UNSAFE_getAllByType } = renderCell({ kind: 'scored', score });
      const views = UNSAFE_getAllByType(require('react-native').View);
      const pips = views.filter((v) => {
        const s = flatStyle(v.props.style);
        return s.width === 3 && s.height === 3 && s.borderRadius === 2;
      });
      expect(pips).toHaveLength(score);
    });

    it('applies heat background and text color from heatStyle', () => {
      const score = 4 as Score;
      const heat = heatStyle(score);
      const { UNSAFE_getAllByType } = renderCell({ kind: 'scored', score });
      const text = screen.getByText('14');
      expect(flatStyle(text.props.style)).toEqual(expect.objectContaining({ color: heat.color }));
      const views = UNSAFE_getAllByType(require('react-native').View);
      const square = views.find((v) => flatStyle(v.props.style).backgroundColor === heat.background);
      expect(square).toBeDefined();
    });

    it('shows the token border only for score 1', () => {
      const heat1 = heatStyle(1 as Score);
      const { UNSAFE_getAllByType, unmount } = renderCell({ kind: 'scored', score: 1 as Score });
      const views = UNSAFE_getAllByType(require('react-native').View);
      const bordered = views.find((v) => flatStyle(v.props.style).borderColor === heat1.border);
      if (heat1.border !== undefined) {
        expect(bordered).toBeDefined();
      }
      unmount();

      const heat3 = heatStyle(3 as Score);
      const second = renderCell({ kind: 'scored', score: 3 as Score });
      const views3 = second.UNSAFE_getAllByType(require('react-native').View);
      const none = views3.find(
        (v) => heat3.border !== undefined && flatStyle(v.props.style).borderColor === heat3.border,
      );
      expect(none).toBeUndefined();
    });

    it('adds the scoredToday ring when isToday is also set', () => {
      const { UNSAFE_getAllByType } = renderCell({ kind: 'scored', score: 2 as Score, isToday: true });
      const views = UNSAFE_getAllByType(require('react-native').View);
      const ring = views.find((v) => {
        const s = flatStyle(v.props.style);
        return s.borderWidth === 2 && s.borderColor === core;
      });
      expect(ring).toBeDefined();
    });

    it('does not show the today number style when scored', () => {
      renderCell({ kind: 'scored', score: 2 as Score, isToday: true });
      const text = screen.getByText('14');
      expect(flatStyle(text.props.style)).not.toEqual(expect.objectContaining({ color: gold }));
    });
  });

  describe('selected state', () => {
    it('sets accessibilityState.selected when selected', () => {
      renderCell({ kind: 'missed', selected: true });
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('sets accessibilityState.selected to false when not selected', () => {
      renderCell({ kind: 'missed', selected: false });
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });
  });

  describe('accessibilityLabel', () => {
    it('labels a scored day with its score', () => {
      renderCell({ kind: 'scored', score: 5 as Score });
      expect(screen.getByLabelText(`${DATE_KEY}, scored 5 out of 5`)).toBeTruthy();
    });

    it('labels today as not yet logged', () => {
      renderCell({ kind: 'today', isToday: true });
      expect(screen.getByLabelText(`${DATE_KEY}, today, not yet logged`)).toBeTruthy();
    });

    it('labels a missed day', () => {
      renderCell({ kind: 'missed' });
      expect(screen.getByLabelText(`${DATE_KEY}, missed`)).toBeTruthy();
    });

    it('labels a future day', () => {
      renderCell({ kind: 'future' });
      expect(screen.getByLabelText(`${DATE_KEY}, future`)).toBeTruthy();
    });
  });
});

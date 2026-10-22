/**
 * DayCell.test.tsx — behavioural tests for the month-grid cell.
 *
 * Uses @testing-library/react-native. No network, no storage, no timers.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DayCell from './DayCell';
import type { DayKind, Score } from '../../domain/fire';

// Default export is React.memo(DayCell); the inner component is what we render.
const Cell = DayCell as unknown as React.ComponentType<{
  dateKey: string | null;
  dayNumber: number | null;
  kind: DayKind | null;
  score?: Score;
  isToday?: boolean;
  selected?: boolean;
  onPress?: (dateKey: string) => void;
}>;

const DATE = '2024-05-10';

function renderCell(props: Partial<React.ComponentProps<typeof Cell>> = {}) {
  return render(
    <Cell dateKey={DATE} dayNumber={10} kind="missed" {...props} />,
  );
}

describe('DayCell', () => {
  describe('blank cell', () => {
    it('renders an empty View with no pressable button', () => {
      renderCell({ dateKey: null, dayNumber: null, kind: null });
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText(/./)).toBeNull();
    });

    it('renders blank when kind is null even with a dateKey', () => {
      renderCell({ kind: null });
      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('future cell', () => {
    it('is disabled and reports disabled accessibility state', () => {
      renderCell({ kind: 'future', dayNumber: 20 });
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('does not call onPress when tapped', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'future', onPress });
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('missed cell', () => {
    it('renders the day number and the missed dot', () => {
      renderCell({ kind: 'missed', dayNumber: 10 });
      expect(screen.getByText('10')).toBeTruthy();
      expect(screen.getByRole('button').props.accessibilityLabel).toBe(
        `${DATE}, missed`,
      );
    });

    it('is enabled and calls onPress with the dateKey', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'missed', onPress });
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(DATE);
    });
  });

  describe('today cell', () => {
    it('renders with today accessibility label when unscored', () => {
      renderCell({ kind: 'today', isToday: true });
      expect(screen.getByRole('button').props.accessibilityLabel).toBe(
        `${DATE}, today, not yet logged`,
      );
    });

    it('is tappable and forwards dateKey', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'today', isToday: true, onPress });
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(DATE);
    });
  });

  describe('scored cell', () => {
    it.each([1, 2, 3, 4, 5] as Score[])(
      'renders %i pip(s) for a score of %i',
      (score) => {
        renderCell({ kind: 'scored', score });
        const label = screen.getByRole('button').props.accessibilityLabel;
        expect(label).toBe(`${DATE}, scored ${score} out of 5`);
      },
    );

    it('renders the day number for a scored day', () => {
      renderCell({ kind: 'scored', score: 3, dayNumber: 10 });
      expect(screen.getByText('10')).toBeTruthy();
    });

    it('is tappable and forwards dateKey', () => {
      const onPress = jest.fn();
      renderCell({ kind: 'scored', score: 4, onPress });
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(DATE);
    });

    it('treats a scored kind without a score as unscored (no label score)', () => {
      renderCell({ kind: 'scored', score: undefined });
      expect(screen.getByRole('button').props.accessibilityLabel).toBe(
        `${DATE}, scored undefined out of 5`,
      );
    });
  });

  describe('selection state', () => {
    it('sets accessibilityState.selected when selected', () => {
      renderCell({ kind: 'missed', selected: true });
      expect(screen.getByRole('button').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('reports selected as false when not selected', () => {
      renderCell({ kind: 'missed', selected: false });
      expect(screen.getByRole('button').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });
  });

  describe('onPress handling', () => {
    it('does not throw when tapped without an onPress handler', () => {
      renderCell({ kind: 'missed', onPress: undefined });
      expect(() => fireEvent.press(screen.getByRole('button'))).not.toThrow();
    });
  });
});

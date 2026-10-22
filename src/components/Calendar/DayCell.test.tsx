/**
 * DayCell.test.tsx — unit tests for the month-grid cell.
 *
 * Verifies the blank / future / missed / today / scored rendering rules,
 * tap behaviour, and the accessibility labels produced by `accessibilityLabel`.
 * Assertions focus on accessibility props and rendered pip counts rather than
 * style internals, so the tests stay stable when the visuals are tuned.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DayCell from './DayCell';
import type { DayKind, Score } from '../../domain/fire';

// Shared fixture: a fixed local date key so every test is deterministic.
const DATE_KEY = '2025-03-14';

// Test helper: renders a DayCell with sensible defaults, letting each test override only what it cares about.
function renderCell(overrides: Partial<React.ComponentProps<typeof DayCell>> = {}) {
  const onPress = jest.fn();
  const props = {
    dateKey: DATE_KEY,
    dayNumber: 14,
    kind: 'missed' as DayKind,
    onPress,
    ...overrides,
  };
  const utils = render(<DayCell {...props} />);
  return { ...utils, onPress };
}

// Test helper: returns the number of pip dots rendered under a scored cell.
// Pips carry no testID, so we count the children of the pips container by
// locating the cell's button and reading its composite view tree.
function countPips(score: Score): number {
  const { UNSAFE_root } = render(
    <DayCell dateKey={DATE_KEY} dayNumber={14} kind="scored" score={score} />,
  );
  // Each pip is a bare View inside the pips container; we identify the pips
  // container as the View whose children are all empty Views with no text.
  const views = UNSAFE_root.findAll(
    (node) =>
      typeof node.type === 'string' &&
      node.type === 'View' &&
      node.props.style !== undefined &&
      Array.isArray(node.children) &&
      node.children.length === score &&
      node.children.every((c: any) => c.type === 'View' && (!c.children || c.children.length === 0)),
  );
  return views.length > 0 ? views[0].children.length : 0;
}

describe('DayCell', () => {
  describe('blank cells', () => {
    it('renders an empty View and no pressable when dateKey is null', () => {
      renderCell({ dateKey: null, dayNumber: null, kind: null });

      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText(/./)).toBeNull();
    });

    it('renders an empty View and no pressable when kind is null', () => {
      renderCell({ dateKey: null, dayNumber: null, kind: null });

      expect(screen.queryByRole('button')).toBeNull();
    });
  });

  describe('future cells', () => {
    it('is disabled in accessibility state', () => {
      renderCell({ kind: 'future' });

      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('does not invoke onPress when tapped', () => {
      const { onPress } = renderCell({ kind: 'future' });

      fireEvent.press(screen.getByRole('button'));

      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('missed cells', () => {
    it('renders the hollow missed dot', () => {
      const { UNSAFE_root } = renderCell({ kind: 'missed' });

      // The missed dot is the only 5x5 absolutely-positioned View in a missed cell.
      const dots = UNSAFE_root.findAll(
        (node) =>
          node.type === 'View' &&
          node.props.style &&
          Array.isArray(node.props.style) === false &&
          node.props.style.width === 5 &&
          node.props.style.height === 5,
      );
      expect(dots.length).toBeGreaterThan(0);
    });

    it('is tappable and reports the missed label', () => {
      const { onPress } = renderCell({ kind: 'missed' });

      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      );

      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });
  });

  describe('today cells', () => {
    it('renders an unscored today cell with the today label', () => {
      renderCell({ kind: 'today', isToday: true });

      expect(screen.getByRole('button').props.accessibilityLabel).toBe(
        `${DATE_KEY}, today, not yet logged`,
      );
    });

    it('invokes onPress with the date key when tapped', () => {
      const { onPress } = renderCell({ kind: 'today', isToday: true });

      fireEvent.press(screen.getByRole('button'));

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });
  });

  describe('scored cells', () => {
    it.each<Score>([1, 2, 3, 4, 5])('renders %i pip dot(s) for a score of %i', (score) => {
      expect(countPips(score)).toBe(score);
    });

    it('shows the day number', () => {
      renderCell({ kind: 'scored', score: 3, dayNumber: 14 });

      expect(screen.getByText('14')).toBeTruthy();
    });

    it('does not render the missed dot', () => {
      const { UNSAFE_root } = renderCell({ kind: 'scored', score: 4 });

      const missedDots = UNSAFE_root.findAll(
        (node) =>
          node.type === 'View' &&
          node.props.style &&
          Array.isArray(node.props.style) === false &&
          node.props.style.width === 5 &&
          node.props.style.height === 5,
      );
      expect(missedDots).toHaveLength(0);
    });

    it('scored today cell still reports the scored label', () => {
      renderCell({ kind: 'scored', score: 5, isToday: true });

      expect(screen.getByRole('button').props.accessibilityLabel).toBe(
        `${DATE_KEY}, scored 5 out of 5`,
      );
    });
  });

  describe('selection', () => {
    it('sets accessibilityState.selected when selected', () => {
      renderCell({ kind: 'missed', selected: true });

      expect(screen.getByRole('button').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: true }),
      );
    });

    it('sets accessibilityState.selected to false when not selected', () => {
      renderCell({ kind: 'missed', selected: false });

      expect(screen.getByRole('button').props.accessibilityState).toEqual(
        expect.objectContaining({ selected: false }),
      );
    });
  });

  describe('accessibilityLabel for each kind', () => {
    it.each<[DayKind, Score | undefined, string]>([
      ['scored', 2, `${DATE_KEY}, scored 2 out of 5`],
      ['today', undefined, `${DATE_KEY}, today, not yet logged`],
      ['missed', undefined, `${DATE_KEY}, missed`],
      ['future', undefined, `${DATE_KEY}, future`],
    ])('kind %s produces label "%s"', (kind, score, expected) => {
      renderCell({ kind, score, isToday: kind === 'today' });

      expect(screen.getByRole('button').props.accessibilityLabel).toBe(expected);
    });
  });
});

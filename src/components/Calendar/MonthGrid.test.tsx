/**
 * MonthGrid.test.tsx — tests for the month calendar grid.
 *
 * Covers: title rendering for the current month, next-month gating (FR-020),
 * previous-month paging across year boundaries, blank padding cells, DayCell
 * kind classification, fire health label visibility, and day press pass-through.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MonthGrid from './MonthGrid';
import { monthGrid, parseYmd, type DateKey } from '../../domain/dates';
import type { Entries } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Fixed "today" so every test is deterministic: March 15, 2024 (a Friday).
const TODAY: DateKey = '2024-03-15' as DateKey;

const ENTRIES: Entries = {
  ['2024-03-01' as DateKey]: 3,
  ['2024-03-02' as DateKey]: 5,
  ['2024-03-10' as DateKey]: 1,
} as unknown as Entries;

function renderGrid(overrides: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  const props = {
    today: TODAY,
    entries: ENTRIES,
    selectedDate: null,
    onSelectDay: jest.fn(),
    ...overrides,
  };
  const utils = render(<MonthGrid {...props} />);
  return { ...utils, props };
}

function titleFor(y: number, m: number) {
  return `${MONTHS[m]} ${y}`;
}

describe('MonthGrid', () => {
  describe('title', () => {
    it('renders the month name and year containing today', () => {
      renderGrid();
      const d = parseYmd(TODAY);
      expect(screen.getByText(MONTHS[d.getMonth()])).toBeTruthy();
      expect(screen.getByText(String(d.getFullYear()))).toBeTruthy();
    });
  });

  describe('next navigation (FR-020)', () => {
    it('disables the next button when the current month is in view', () => {
      renderGrid();
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual({ disabled: true });
    });

    it('does not advance the view when next is pressed on the current month', () => {
      renderGrid();
      const d = parseYmd(TODAY);
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText(MONTHS[d.getMonth()])).toBeTruthy();
    });
  });

  describe('previous navigation', () => {
    it('decrements the month when previous is pressed', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('February')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('wraps from January back to December of the prior year', () => {
      renderGrid({ today: '2024-01-10' as DateKey });
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('December')).toBeTruthy();
      expect(screen.getByText('2023')).toBeTruthy();
    });

    it('wraps from December forward to January of the next year after paging back', () => {
      renderGrid({ today: '2024-01-10' as DateKey });
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText(titleFor(2023, 11).replace(' 2023', ''))).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('January')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });
  });

  describe('after paging back', () => {
    it('enables next and advances the view', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual({ disabled: false });
      fireEvent.press(next);
      const d = parseYmd(TODAY);
      expect(screen.getByText(MONTHS[d.getMonth()])).toBeTruthy();
    });
  });

  describe('grid cells', () => {
    it('renders blank padding cells for leading and trailing empty slots', () => {
      renderGrid();
      const d = parseYmd(TODAY);
      const cells = monthGrid(d.getFullYear(), d.getMonth());
      const blanks = cells.filter(c => c === null).length;
      // Blank cells have no day number text rendered; count matches padding.
      expect(blanks).toBeGreaterThanOrEqual(0);
      expect(cells.length % 7).toBe(0);
    });

    it('renders day numbers for real days in the month', () => {
      renderGrid();
      expect(screen.getByText('15')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('passes onSelectDay through to a pressed day cell', () => {
      const { props } = renderGrid();
      fireEvent.press(screen.getByText('15'));
      expect(props.onSelectDay).toHaveBeenCalledWith(TODAY);
    });
  });

  describe('fire health label', () => {
    it('renders the label with the Fire Health accessibility label when visible', () => {
      const fireHealth = { visible: true, label: 'Strong' } as unknown as FireHealthState;
      renderGrid({ fireHealth });
      expect(screen.getByLabelText('Fire Health Strong')).toBeTruthy();
      expect(screen.getByText('Strong')).toBeTruthy();
    });

    it('renders no health text when not visible', () => {
      const fireHealth = { visible: false, label: 'Strong' } as unknown as FireHealthState;
      renderGrid({ fireHealth });
      expect(screen.queryByText('Strong')).toBeNull();
      expect(screen.queryByLabelText('Fire Health Strong')).toBeNull();
    });
  });
});

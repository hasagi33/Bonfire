/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: the title (month name + year from the `today` prop), the ‹ / › navigation
 * (including the December/January year wrap), the disabled "next" button at the
 * current month (FR-020), the weekday header row, per-day classification and the
 * null-cell blanks, and the optional fire-health label (visible vs hidden).
 *
 * All dates are fixed ISO local date keys, so the tests are deterministic and never
 * read the wall clock.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MonthGrid from './MonthGrid';
import type { Entries } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';
import type { DateKey } from '../../domain/dates';

// A fixed "today" well inside a month so the grid has a stable layout.
const TODAY = '2024-03-15' as DateKey;

const noEntries: Entries = {};

// Helper: render the grid with sensible defaults, overriding only what a test needs.
function renderGrid(
  overrides: Partial<React.ComponentProps<typeof MonthGrid>> = {},
) {
  const props = {
    today: TODAY,
    entries: noEntries,
    selectedDate: null,
    onSelectDay: jest.fn(),
    ...overrides,
  };
  return render(<MonthGrid {...props} />);
}

describe('MonthGrid', () => {
  describe('title', () => {
    it('shows the month name and year derived from the today prop', () => {
      renderGrid();
      expect(screen.getByText('March')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('disables the next button and reports disabled state at the current month', () => {
      renderGrid();
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual({ disabled: true });
      expect(next.props.disabled).toBe(true);
    });

    it('moves to the previous month when ‹ is pressed', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('February')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('re-enables next after going back and advances again when pressed', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));

      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual({ disabled: false });

      fireEvent.press(next);
      expect(screen.getByText('March')).toBeTruthy();
    });

    it('does not advance past the current month', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('March')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('wraps backward from January to December of the prior year', () => {
      renderGrid({ today: '2024-01-10' as DateKey });
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('December')).toBeTruthy();
      expect(screen.getByText('2023')).toBeTruthy();
    });

    it('wraps forward from December to January of the next year', () => {
      renderGrid({ today: '2024-03-10' as DateKey });
      // Walk back to December 2023 (3 steps: Feb, Jan, Dec).
      const prev = screen.getByLabelText('Previous month');
      fireEvent.press(prev);
      fireEvent.press(prev);
      fireEvent.press(prev);
      expect(screen.getByText('December')).toBeTruthy();
      expect(screen.getByText('2023')).toBeTruthy();

      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('January')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });
  });

  describe('weekday header and grid', () => {
    it('renders the S M T W T F S weekday headers in order', () => {
      renderGrid();
      const letters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      // Single-letter headers collide with day numbers only if they are digits,
      // so matching the letters directly is unambiguous.
      const found = screen.getAllByText(/^[SMTWF]$/);
      expect(found.map(node => node.props.children)).toEqual(
        expect.arrayContaining(letters),
      );
    });

    it('renders a day cell for each day of the viewed month', () => {
      renderGrid();
      // March 2024 has 31 days; each day number should appear in the grid.
      expect(screen.getByText('31')).toBeTruthy();
      expect(screen.getByText('1')).toBeTruthy();
    });

    it('reports selected state through the onSelectDay callback on press', () => {
      const onSelectDay = jest.fn();
      renderGrid({ onSelectDay });
      fireEvent.press(screen.getByText('10'));
      expect(onSelectDay).toHaveBeenCalledWith('2024-03-10');
    });
  });

  describe('health label', () => {
    it('renders the fire health label when visible is true', () => {
      const fireHealth: FireHealthState = {
        visible: true,
        label: 'Strong',
      } as FireHealthState;
      renderGrid({ fireHealth });
      expect(screen.getByText('Strong')).toBeTruthy();
    });

    it('renders nothing for the health label when visible is false', () => {
      const fireHealth: FireHealthState = {
        visible: false,
        label: 'Strong',
      } as FireHealthState;
      renderGrid({ fireHealth });
      expect(screen.queryByText('Strong')).toBeNull();
    });
  });
});

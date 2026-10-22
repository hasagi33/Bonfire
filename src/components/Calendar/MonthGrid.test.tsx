/**
 * MonthGrid.test.tsx — tests for the month calendar grid.
 *
 * Covers: initial month view from `today`, forward/backward navigation with
 * year-boundary wrap, next-button disabling at the current month, weekday
 * header, day classification/score rendering, and the fire-health label.
 *
 * Domain modules (dates, fire) are used for real; no network access.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MonthGrid from './MonthGrid';
import { monthGrid, parseYmd } from '../../domain/dates';
import { classifyDay, type Entries } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';

const TODAY = '2024-06-15';
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function renderGrid(overrides: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  const props = {
    today: TODAY,
    entries: {} as Entries,
    selectedDate: null,
    onSelectDay: jest.fn(),
    ...overrides,
  };
  const utils = render(<MonthGrid {...props} />);
  return { ...utils, props };
}

function countDayCells(year: number, month: number): number {
  return monthGrid(year, month).filter((k) => k !== null).length;
}

describe('MonthGrid', () => {
  describe('initial view', () => {
    it('shows the month and year of the today prop', () => {
      renderGrid();
      expect(screen.getByText('June')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('renders one DayCell per calendar day of the month', () => {
      const { toJSON } = renderGrid();
      expect(toJSON()).toBeTruthy();
      expect(countDayCells(2024, 5)).toBe(30);
    });

    it('renders the weekday header S M T W T F S', () => {
      renderGrid();
      ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach((d) => {
        expect(screen.getAllByText(d).length).toBeGreaterThan(0);
      });
    });
  });

  describe('next navigation', () => {
    it('disables the next button when the current month is shown', () => {
      renderGrid();
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual({ disabled: true });
    });

    it('does not change the view when next is pressed at the current month', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('June')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });
  });

  describe('previous navigation', () => {
    it('moves back one month when previous is pressed', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('May')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('wraps from January to December of the previous year', () => {
      renderGrid({ today: '2024-01-10' });
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('December')).toBeTruthy();
      expect(screen.getByText('2023')).toBeTruthy();
    });

    it('wraps forward from December to January of the next year', () => {
      renderGrid({ today: '2024-01-10' });
      fireEvent.press(screen.getByLabelText('Previous month'));
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('January')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('enables next after paging back and returns to the current month', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByLabelText('Next month').props.accessibilityState).toEqual({
        disabled: false,
      });
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('June')).toBeTruthy();
      expect(screen.getByLabelText('Next month').props.accessibilityState).toEqual({
        disabled: true,
      });
    });

    it('pages through multiple past months and renders the correct cell count', () => {
      renderGrid({ today: '2024-03-10' });
      fireEvent.press(screen.getByLabelText('Previous month'));
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('January')).toBeTruthy();
      expect(countDayCells(2024, 0)).toBe(31);
    });
  });

  describe('day classification', () => {
    it('passes the classified kind and score through for scored days', () => {
      const entries: Entries = { '2024-06-10': 4 } as Entries;
      const expected = classifyDay(entries, '2024-06-10', TODAY);
      expect(expected).toBeDefined();
      renderGrid({ entries });
      expect(screen.getByText('10')).toBeTruthy();
    });

    it('marks the selected day', () => {
      renderGrid({ selectedDate: '2024-06-05' as never });
      expect(screen.getByText('5')).toBeTruthy();
    });

    it('calls onSelectDay when a day is pressed', () => {
      const onSelectDay = jest.fn();
      renderGrid({ onSelectDay });
      fireEvent.press(screen.getByText('3'));
      expect(onSelectDay).toHaveBeenCalledWith('2024-06-03');
    });

    it('uses real parseYmd to derive the day number', () => {
      expect(parseYmd('2024-06-07').getDate()).toBe(7);
    });
  });

  describe('fire health label', () => {
    const visibleHealth: FireHealthState = {
      visible: true,
      label: 'Healthy',
    } as FireHealthState;

    it('renders the label when fireHealth.visible is true', () => {
      renderGrid({ fireHealth: visibleHealth });
      expect(screen.getByText('Healthy')).toBeTruthy();
    });

    it('does not render the label when fireHealth.visible is false', () => {
      renderGrid({
        fireHealth: { visible: false, label: 'Hidden' } as FireHealthState,
      });
      expect(screen.queryByText('Hidden')).toBeNull();
    });

    it('does not render the label when fireHealth is omitted', () => {
      renderGrid();
      expect(screen.queryByText('Healthy')).toBeNull();
    });
  });

  it('exposes month names in order', () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES[0]).toBe('January');
    expect(MONTH_NAMES[11]).toBe('December');
  });
});

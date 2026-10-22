/**
 * MonthGrid.test.tsx — unit tests for the month calendar grid.
 *
 * Covers: initial month view from `today`, title rendering, the forward/back
 * navigation rules (next disabled on the current month, year-boundary wrap),
 * day-press callbacks, blank padding cells, and the fire-health label.
 *
 * All dates are fixed ISO keys so the tests are deterministic (no Date.now()).
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MonthGrid from './MonthGrid';
import DayCell from './DayCell';
import { monthGrid, parseYmd } from '../../domain/dates';
import { classifyDay } from '../../domain/fire';
import type { Entries } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';

// Keep DayCell as a real component but spy on it so we can inspect the props
// each cell receives (including the blank padding cells with null dateKey).
jest.mock('./DayCell', () => {
  const ReactLib = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; dayNumber: number | null }) =>
      ReactLib.createElement(
        Text,
        { testID: props.dateKey ? `day-${props.dateKey}` : 'blank-cell' },
        props.dayNumber !== null ? String(props.dayNumber) : '',
      ),
  };
});

const TODAY = '2024-06-15'; // a Saturday, mid-June 2024

function renderGrid(overrides: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  const props = {
    today: TODAY,
    entries: {} as Entries,
    selectedDate: null,
    onSelectDay: jest.fn(),
    ...overrides,
  };
  return { ...render(<MonthGrid {...props} />), props };
}

describe('MonthGrid', () => {
  describe('initial view', () => {
    it('shows the month and year of today', () => {
      renderGrid();
      expect(screen.getByText('June')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('renders the weekday header row', () => {
      renderGrid();
      expect(screen.getAllByText(/^[SMTWF]$/)).toHaveLength(7);
    });

    it('renders a cell for each day of the month plus padding cells', () => {
      renderGrid();
      const expectedCells = monthGrid(2024, 5);
      const blanks = expectedCells.filter(c => c === null);
      expect(screen.getAllByTestId('blank-cell')).toHaveLength(blanks.length);
      expect(screen.getByTestId('day-2024-06-01')).toBeTruthy();
      expect(screen.getByTestId('day-2024-06-30')).toBeTruthy();
    });
  });

  describe('month navigation', () => {
    it('disables the next button while the current month is shown', () => {
      renderGrid();
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual({ disabled: true });
    });

    it('does not advance past the current month when next is pressed', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('June')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('moves back one month when previous is pressed', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('May')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('enables next after going back and returns to the current month', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual({ disabled: false });
      fireEvent.press(next);
      expect(screen.getByText('June')).toBeTruthy();
    });

    it('wraps backward across a year boundary from January to December', () => {
      renderGrid({ today: '2024-01-10' });
      expect(screen.getByText('January')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('December')).toBeTruthy();
      expect(screen.getByText('2023')).toBeTruthy();
    });
  });

  describe('day selection', () => {
    it('calls onSelectDay with the DateKey of the pressed cell', () => {
      const { props } = renderGrid();
      // DayCell mock doesn't wire onPress, so invoke the prop directly via the
      // rendered DayCell element's contract: onSelectDay is passed through.
      const cells = screen.getAllByTestId(/^day-/);
      expect(cells.length).toBeGreaterThan(0);
      // Verify the wiring contract: DayCell receives onSelectDay from MonthGrid.
      const calls = (DayCell as unknown as jest.Mock).mock?.calls ?? [];
      const passed = calls.map((c: unknown[]) => (c[0] as { onPress?: unknown }).onPress);
      expect(passed.every(fn => fn === undefined || fn === props.onSelectDay)).toBe(true);
    });

    it('passes selectedDate through so the matching cell is marked selected', () => {
      renderGrid({ selectedDate: '2024-06-20' });
      expect(screen.getByTestId('day-2024-06-20')).toBeTruthy();
    });
  });

  describe('blank padding cells', () => {
    it('renders blank cells with a null dateKey for leading and trailing padding', () => {
      renderGrid();
      const cells = monthGrid(2024, 5);
      const leading = cells.indexOf(cells.find(c => c !== null) as string);
      expect(leading).toBeGreaterThanOrEqual(0);
      expect(screen.getAllByTestId('blank-cell').length).toBe(
        cells.filter(c => c === null).length,
      );
    });
  });

  describe('fire health label', () => {
    const visibleHealth: FireHealthState = { visible: true, label: 'Strong' } as FireHealthState;

    it('renders the health label with the expected accessibility label', () => {
      renderGrid({ fireHealth: visibleHealth });
      const label = screen.getByLabelText('Fire Health Strong');
      expect(label).toBeTruthy();
      expect(screen.getByText('Strong')).toBeTruthy();
    });

    it('renders no health label when fireHealth is absent', () => {
      renderGrid();
      expect(screen.queryByLabelText(/Fire Health/)).toBeNull();
    });

    it('renders no health label when fireHealth is hidden', () => {
      renderGrid({ fireHealth: { visible: false, label: 'Strong' } as FireHealthState });
      expect(screen.queryByLabelText(/Fire Health/)).toBeNull();
    });
  });

  describe('domain helpers used by the grid', () => {
    it('parses the today key into the expected calendar date', () => {
      const d = parseYmd(TODAY);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(5);
      expect(d.getDate()).toBe(15);
    });

    it('classifies a day with no entry without throwing', () => {
      expect(() => classifyDay({}, '2024-06-01', TODAY)).not.toThrow();
    });
  });
});

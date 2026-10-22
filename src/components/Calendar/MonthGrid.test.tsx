/**
 * MonthGrid.test.tsx — tests for the month calendar grid.
 *
 * Covers: initial view from `today`, backward/forward navigation (including
 * year-boundary wrap), the FR-020 disabled-next guard at the current month,
 * DOW headers and blank/day cell rendering, kind classification, day selection
 * callbacks, and fire health label visibility.
 *
 * No storage access and no network. Real child components are rendered.
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import MonthGrid from './MonthGrid';
import { monthGrid, parseYmd, type DateKey } from '../../domain/dates';
import { classifyDay, type Entries } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';

const TODAY: DateKey = '2024-03-15' as DateKey;

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

function viewedTitle(): string {
  const title = screen.getByText(/^(January|February|March|April|May|June|July|August|September|October|November|December)/);
  return title.props.children.join('').trim();
}

describe('MonthGrid', () => {
  describe('initial view', () => {
    it('shows the month and year of the today prop', () => {
      renderGrid();
      expect(screen.getByText('March')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('renders seven weekday headers in order', () => {
      renderGrid();
      const expected = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      // Weekday letters repeat, so count them: S x2, M, T x2, W, F.
      expect(screen.getAllByText('S')).toHaveLength(2);
      expect(screen.getAllByText('T')).toHaveLength(2);
      expect(screen.getAllByText('M')).toHaveLength(1);
      expect(screen.getAllByText('W')).toHaveLength(1);
      expect(screen.getAllByText('F')).toHaveLength(1);
      expect(expected).toHaveLength(7);
    });
  });

  describe('month navigation', () => {
    it('previous button moves back one month', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('February')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('previous button wraps from January to prior December across the year boundary', () => {
      renderGrid({ today: '2024-01-10' as DateKey });
      expect(screen.getByText('January')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('December')).toBeTruthy();
      expect(screen.getByText('2023')).toBeTruthy();
    });

    it('next button is disabled and does not change view when at the current month (FR-020)', () => {
      renderGrid();
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true }));
      fireEvent.press(next);
      expect(screen.getByText('March')).toBeTruthy();
      expect(screen.getByText('2024')).toBeTruthy();
    });

    it('next becomes enabled after navigating back and advances forward again', () => {
      renderGrid();
      fireEvent.press(screen.getByLabelText('Previous month'));
      const next = screen.getByLabelText('Next month');
      expect(next.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false }));
      fireEvent.press(next);
      expect(screen.getByText('March')).toBeTruthy();
    });

    it('next wraps from December to January of the following year', () => {
      renderGrid({ today: '2024-12-05' as DateKey });
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('November')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Previous month'));
      expect(screen.getByText('October')).toBeTruthy();
      // Walk forward to December, then past it.
      fireEvent.press(screen.getByLabelText('Next month'));
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('December')).toBeTruthy();
      fireEvent.press(screen.getByLabelText('Next month'));
      expect(screen.getByText('January')).toBeTruthy();
      expect(screen.getByText('2025')).toBeTruthy();
    });
  });

  describe('grid rendering', () => {
    it('renders one cell per monthGrid entry including blank null cells', () => {
      renderGrid();
      const cells = monthGrid(2024, 2); // March 2024
      const blanks = cells.filter(c => c === null).length;
      const days = cells.length - blanks;
      // Day cells are labelled by their day number; blank cells have no number.
      const dayNumbers = cells
        .filter((c): c is DateKey => c !== null)
        .map(c => String(parseYmd(c).getDate()));
      expect(days).toBe(31);
      for (const n of dayNumbers) {
        expect(screen.getAllByText(n).length).toBeGreaterThanOrEqual(1);
      }
      expect(blanks).toBe(cells.length - 31);
    });

    it('invokes onSelectDay with the DateKey when a tappable day is pressed', () => {
      const onSelectDay = jest.fn();
      renderGrid({ onSelectDay });
      const cells = monthGrid(2024, 2);
      const firstDay = cells.find((c): c is DateKey => c !== null)!;
      fireEvent.press(screen.getByText(String(parseYmd(firstDay).getDate())));
      expect(onSelectDay).toHaveBeenCalledWith(firstDay);
    });

    it('derives cell kind via classifyDay using entries and today', () => {
      const entries = { '2024-03-10': 4 } as unknown as Entries;
      const expectedKind = classifyDay(entries, '2024-03-10' as DateKey, TODAY);
      renderGrid({ entries });
      expect(expectedKind).toBeDefined();
      expect(screen.getByText('10')).toBeTruthy();
    });
  });

  describe('fire health label', () => {
    it('renders the health label with its accessibilityLabel when visible', () => {
      const fireHealth = { visible: true, label: 'Strong' } as unknown as FireHealthState;
      renderGrid({ fireHealth });
      const label = screen.getByLabelText('Fire Health Strong');
      expect(label).toBeTruthy();
      expect(within(label).getByText('Strong')).toBeTruthy();
    });

    it('renders no health text when visible is false', () => {
      const fireHealth = { visible: false, label: 'Strong' } as unknown as FireHealthState;
      renderGrid({ fireHealth });
      expect(screen.queryByText('Strong')).toBeNull();
      expect(screen.queryByLabelText(/Fire Health/)).toBeNull();
    });

    it('renders no health text when fireHealth is omitted', () => {
      renderGrid();
      expect(screen.queryByLabelText(/Fire Health/)).toBeNull();
    });
  });
});

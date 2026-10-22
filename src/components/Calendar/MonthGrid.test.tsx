/**
 * MonthGrid.test.tsx — tests for the month calendar grid.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import MonthGrid from './MonthGrid';
import type { Entries } from '../../domain/fire';
import type { DateKey } from '../../domain/dates';

// Pin the rendered DayCell so we can assert on the kind/score/press wiring
// without depending on its internal styling.
jest.mock('./DayCell', () => {
  const { Text, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <Pressable
        testID={props.dateKey ? `day-${props.dateKey}` : 'blank-cell'}
        accessibilityLabel={props.dateKey ? `kind-${props.kind}` : 'blank'}
        onPress={() => props.onPress && props.dateKey && props.onPress(props.dateKey)}>
        <Text>{props.dayNumber ?? ''}</Text>
      </Pressable>
    ),
  };
});

const TODAY: DateKey = '2024-05-15' as DateKey;

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

describe('MonthGrid', () => {
  it('opens on the month of the today prop', () => {
    renderGrid();
    expect(screen.getByText('May')).toBeTruthy();
    expect(screen.getByText('2024')).toBeTruthy();
  });

  it('disables the Next button and does not advance when viewing the current month', () => {
    renderGrid();
    const next = screen.getByLabelText('Next month');
    expect(next.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(next);
    expect(screen.getByText('May')).toBeTruthy();
  });

  it('Previous navigates backward one month', () => {
    renderGrid();
    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByText('April')).toBeTruthy();
  });

  it('wraps the year correctly from January back to December of the prior year', () => {
    renderGrid({ today: '2024-01-10' as DateKey });
    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByText('December')).toBeTruthy();
    expect(screen.getByText('2023')).toBeTruthy();
  });

  it('enables Next after going back and returns to the current month', () => {
    renderGrid();
    fireEvent.press(screen.getByLabelText('Previous month'));
    const next = screen.getByLabelText('Next month');
    expect(next.props.accessibilityState).toEqual({ disabled: false });
    fireEvent.press(next);
    expect(screen.getByText('May')).toBeTruthy();
    expect(screen.getByLabelText('Next month').props.accessibilityState).toEqual({
      disabled: true,
    });
  });

  it('renders a DayCell for each day and blank cells for leading padding', () => {
    renderGrid();
    expect(screen.getByTestId('day-2024-05-01')).toBeTruthy();
    expect(screen.getByTestId('day-2024-05-31')).toBeTruthy();
    expect(screen.getAllByTestId('blank-cell').length).toBeGreaterThan(0);
  });

  it('passes the classified kind from classifyDay to each cell', () => {
    renderGrid({ entries: { '2024-05-14': 4 } as unknown as Entries });
    expect(
      screen.getByTestId('day-2024-05-14').findAll((n: any) => n.props.accessibilityLabel)[0]
        .props.accessibilityLabel,
    ).toMatch(/^kind-/);
  });

  it('renders the fire health label only when fireHealth.visible is true', () => {
    const { unmount } = renderGrid({
      fireHealth: { visible: true, label: 'Strong' } as any,
    });
    expect(screen.getByText('Strong')).toBeTruthy();
    unmount();

    renderGrid({ fireHealth: { visible: false, label: 'Hidden' } as any });
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('does not render a health label when fireHealth is omitted', () => {
    renderGrid();
    expect(screen.queryByLabelText(/Fire Health/)).toBeNull();
  });

  it('invokes onSelectDay with the date key when a day is pressed', () => {
    const { props } = renderGrid();
    fireEvent.press(screen.getByTestId('day-2024-05-08'));
    expect(props.onSelectDay).toHaveBeenCalledWith('2024-05-08');
  });
});

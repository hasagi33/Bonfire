/**
 * MonthGrid.test.tsx — unit tests for the month calendar grid component.
 *
 * Covers: the title and year for the current month, the seven weekday labels,
 * disabling "next" on the current month (FR-020), paging backward and forward,
 * year rollover in both directions, the fire-health label visibility, and
 * day selection callbacks. All dates are fixed so the tests are deterministic.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';
import type { DateKey } from '../src/domain/dates';

// A fixed "today" so the displayed month never depends on the wall clock.
const TODAY = '2024-06-15' as DateKey;
const EMPTY_ENTRIES: Entries = {};

type Props = React.ComponentProps<typeof MonthGrid>;

// Build a MonthGrid with sensible defaults, overriding only what a test needs.
function renderGrid(overrides: Partial<Props> = {}) {
  const props: Props = {
    today: TODAY,
    entries: EMPTY_ENTRIES,
    selectedDate: null,
    onSelectDay: jest.fn(),
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MonthGrid {...props} />);
  });
  return { tree, props };
}

// Collect every text string rendered in the tree, in order.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map(node => {
    const children = node.props.children;
    if (Array.isArray(children)) {
      return children.map(c => (typeof c === 'string' ? c : '')).join('');
    }
    return typeof children === 'string' ? children : '';
  });
}

// Find the pressable that has a given accessibility label.
// Pressable is a forwardRef wrapper, so match on the host-level props instead
// of the component type; the accessibilityLabel prop is unique per button.
function findButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

// Read the title's month name and year from the rendered header.
function readTitle(tree: ReactTestRenderer.ReactTestRenderer): { month: string; year: string } {
  const titleNode = tree.root.findAll(
    node =>
      node.type === Text &&
      node.props.style &&
      node.props.style.fontSize === 17 &&
      node.props.style.letterSpacing === 0.2,
  )[0];
  const children = titleNode.props.children as unknown[];
  const month = String(children[0]).trim();
  const yearNode = tree.root.findAll(
    node =>
      node.type === Text &&
      node.props.style &&
      node.props.style.color !== undefined &&
      node.props.style.fontWeight === '500',
  )[0];
  return { month, year: String(yearNode.props.children) };
}

describe('MonthGrid', () => {
  test('renders the current month title and year', () => {
    const { tree } = renderGrid();
    const { month, year } = readTitle(tree);
    expect(month).toBe('June');
    expect(year).toBe('2024');
  });

  test('renders seven weekday labels', () => {
    const { tree } = renderGrid();
    const dowTexts = tree.root
      .findAllByType(Text)
      .filter(n => n.props.style && n.props.style.letterSpacing === 0.6);
    expect(dowTexts).toHaveLength(7);
    expect(dowTexts.map(n => n.props.children)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });

  test('next button is disabled while viewing the current month (FR-020)', () => {
    const { tree } = renderGrid();
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('previous button shifts to the prior month and enables next', () => {
    const { tree } = renderGrid();
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    expect(readTitle(tree).month).toBe('May');
    expect(readTitle(tree).year).toBe('2024');
    expect(findButton(tree, 'Next month').props.disabled).toBe(false);
  });

  test('pressing next after paging back returns to the current month', () => {
    const { tree } = renderGrid();
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Next month').props.onPress();
    });
    expect(readTitle(tree).month).toBe('June');
    expect(findButton(tree, 'Next month').props.disabled).toBe(true);
  });

  test('paging back from January rolls over to December of the prior year', () => {
    const { tree } = renderGrid({ today: '2024-01-10' as DateKey });
    expect(readTitle(tree)).toEqual({ month: 'January', year: '2024' });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    expect(readTitle(tree)).toEqual({ month: 'December', year: '2023' });
  });

  test('paging forward from December rolls over to January of the next year', () => {
    const { tree } = renderGrid({ today: '2024-01-10' as DateKey });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Next month').props.onPress();
    });
    expect(readTitle(tree)).toEqual({ month: 'January', year: '2024' });
  });

  test('fire health label is hidden when fireHealth.visible is false', () => {
    const health = { visible: false, label: 'Bright' } as unknown as FireHealthState;
    const { tree } = renderGrid({ fireHealth: health });
    expect(allText(tree)).not.toContain('Bright');
  });

  test('fire health label renders when fireHealth.visible is true', () => {
    const health = { visible: true, label: 'Bright' } as unknown as FireHealthState;
    const { tree } = renderGrid({ fireHealth: health });
    expect(allText(tree)).toContain('Bright');
  });

  test('pressing a day cell reports its DateKey through onSelectDay', () => {
    const onSelectDay = jest.fn();
    const { tree } = renderGrid({ onSelectDay });
    // Day cells are rendered as DayCell components; find the one for the 10th.
    const cell = tree.root.find(
      node => node.props.dateKey === '2024-06-10' && typeof node.props.onPress === 'function',
    );
    ReactTestRenderer.act(() => {
      cell.props.onPress('2024-06-10');
    });
    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(onSelectDay).toHaveBeenCalledWith('2024-06-10');
  });
});

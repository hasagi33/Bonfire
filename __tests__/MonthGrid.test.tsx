/**
 * MonthGrid.test.tsx — unit tests for the month calendar grid.
 *
 * Renders MonthGrid with react-test-renderer and inspects the resulting tree
 * directly (no testing-library). Uses fixed `today` values so results are
 * deterministic and independent of the wall clock.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import DayCell from '../src/components/Calendar/DayCell';
import { classifyDay } from '../src/domain/fire';
import { monthGrid } from '../src/domain/dates';
import type { DateKey } from '../src/domain/dates';

// Mock DayCell so each cell's props can be inspected directly in the tree.
jest.mock('../src/components/Calendar/DayCell', () => {
  const mockReact = require('react');
  const { Text: MockText } = require('react-native');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; kind: string | null }) =>
      mockReact.createElement(MockText, { testID: 'day-cell', ...props }, props.dateKey ?? 'blank'),
  };
});

type Props = React.ComponentProps<typeof MonthGrid>;

const TODAY: DateKey = '2025-03-15' as DateKey;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    today: TODAY,
    entries: {},
    selectedDate: null,
    onSelectDay: jest.fn(),
    ...overrides,
  };
}

function render(props: Props) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MonthGrid {...props} />);
  });
  return tree;
}

// Collect every Text node's concatenated string content, in tree order.
function allTextStrings(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(Text)
    .map(node => flatten(node.props.children))
    .filter(s => s.length > 0);
}

function flatten(children: unknown): string {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flatten).join('');
  if (React.isValidElement(children)) {
    return flatten((children.props as { children?: unknown }).children);
  }
  return '';
}

// Find the title Text: it is the first Text whose children include the month name
// followed by a nested Text holding the year. We match on the year child element.
function titleText(tree: ReactTestRenderer.ReactTestRenderer): string {
  const texts = tree.root.findAllByType(Text);
  const title = texts.find(t => {
    const kids = t.props.children;
    return Array.isArray(kids) && kids.length === 2 && typeof kids[0] === 'string';
  });
  if (!title) throw new Error('title text not found');
  const kids = title.props.children as unknown[];
  return `${kids[0]}${flatten(kids[1])}`.trim();
}

function findNav(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    n => n.type === Pressable && n.props.accessibilityLabel === label,
  );
}

function dayCells(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(DayCell);
}

describe('MonthGrid', () => {
  it('initially shows the month of `today`', () => {
    const tree = render(baseProps());
    expect(titleText(tree)).toBe('March 2025');
  });

  it('disables the next button when the current month is in view', () => {
    const tree = render(baseProps());
    const next = findNav(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it('pressing disabled next does not change the month', () => {
    const tree = render(baseProps());
    ReactTestRenderer.act(() => {
      findNav(tree, 'Next month').props.onPress();
    });
    expect(titleText(tree)).toBe('March 2025');
  });

  it('enables next after paging back and returns to the current month', () => {
    const tree = render(baseProps());
    ReactTestRenderer.act(() => {
      findNav(tree, 'Previous month').props.onPress();
    });
    expect(titleText(tree)).toBe('February 2025');
    expect(findNav(tree, 'Next month').props.disabled).toBe(false);

    ReactTestRenderer.act(() => {
      findNav(tree, 'Next month').props.onPress();
    });
    expect(titleText(tree)).toBe('March 2025');
    expect(findNav(tree, 'Next month').props.disabled).toBe(true);
  });

  it('paging backward across the year boundary decrements the year', () => {
    const tree = render(baseProps({ today: '2025-01-10' as DateKey }));
    ReactTestRenderer.act(() => {
      findNav(tree, 'Previous month').props.onPress();
    });
    expect(titleText(tree)).toBe('December 2024');
    ReactTestRenderer.act(() => {
      findNav(tree, 'Next month').props.onPress();
    });
    expect(titleText(tree)).toBe('January 2025');
  });

  it('renders leading blank cells matching monthGrid output', () => {
    const tree = render(baseProps());
    const expected = monthGrid(2025, 2);
    const cells = dayCells(tree);
    expect(cells).toHaveLength(expected.length);
    const blanks = cells.filter(c => c.props.dateKey === null);
    const expectedBlanks = expected.filter(k => k === null);
    expect(blanks).toHaveLength(expectedBlanks.length);
    expect(blanks.length).toBeGreaterThan(0);
  });

  it('passes the kind from classifyDay to each DayCell', () => {
    const entries = { '2025-03-10': 3 } as unknown as Props['entries'];
    const tree = render(baseProps({ entries }));
    const cells = dayCells(tree).filter(c => c.props.dateKey !== null);
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      const key = cell.props.dateKey as DateKey;
      expect(cell.props.kind).toBe(classifyDay(entries, key, TODAY));
    }
  });

  it('shows the fire health label only when visible', () => {
    const hidden = render(
      baseProps({ fireHealth: { visible: false, label: 'Bright' } as unknown as Props['fireHealth'] }),
    );
    expect(allTextStrings(hidden)).not.toContain('Bright');

    const shown = render(
      baseProps({ fireHealth: { visible: true, label: 'Bright' } as unknown as Props['fireHealth'] }),
    );
    expect(allTextStrings(shown)).toContain('Bright');
  });

  it('shows no health label when fireHealth is omitted', () => {
    const tree = render(baseProps());
    const strings = allTextStrings(tree);
    expect(strings).not.toContain('Steady');
    expect(strings).not.toContain('Faint');
  });

  it('invokes onSelectDay with the correct DateKey', () => {
    const onSelectDay = jest.fn();
    const tree = render(baseProps({ onSelectDay }));
    const cell = dayCells(tree).find(c => c.props.dateKey === '2025-03-15');
    expect(cell).toBeDefined();
    ReactTestRenderer.act(() => {
      cell!.props.onPress('2025-03-15');
    });
    expect(onSelectDay).toHaveBeenCalledWith('2025-03-15');
  });

  it('marks the selected day cell as selected', () => {
    const tree = render(baseProps({ selectedDate: '2025-03-05' as DateKey }));
    const cell = dayCells(tree).find(c => c.props.dateKey === '2025-03-05');
    expect(cell?.props.selected).toBe(true);
  });
});

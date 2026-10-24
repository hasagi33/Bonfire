/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: header month/year derived from today, previous/next navigation
 * (including year boundaries), the next-month guard that stops browsing at the
 * current month (FR-020), grid cell layout, per-day kind classification, the
 * optional Fire Health label, and day-selection callbacks.
 *
 * Uses the real domain functions (parseYmd, monthGrid, classifyDay); only React
 * Native rendering is exercised through react-test-renderer.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import DayCell from '../src/components/Calendar/DayCell';
import { monthGrid, parseYmd, type DateKey } from '../src/domain/dates';
import { classifyDay, type Entries } from '../src/domain/fire';

// Fixed "today" so every test is deterministic and never reads the wall clock.
const TODAY: DateKey = '2024-03-15' as DateKey;

interface RenderOptions {
  today?: DateKey;
  entries?: Entries;
  selectedDate?: DateKey | null;
  onSelectDay?: (dateKey: DateKey) => void;
  fireHealth?: { visible: boolean; label: string } | undefined;
}

// Render the component with sensible defaults and return the test renderer.
function render(options: RenderOptions = {}) {
  const props = {
    today: options.today ?? TODAY,
    entries: options.entries ?? ({} as Entries),
    selectedDate: options.selectedDate ?? null,
    onSelectDay: options.onSelectDay ?? jest.fn(),
    fireHealth: options.fireHealth,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MonthGrid {...props} />);
  });
  return tree;
}

// Collect the text content of every Text node in the rendered tree.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(Text)
    .map(node => flatten(node.props.children))
    .filter(s => s.length > 0);
}

// Flatten React children (strings, numbers, nested elements) into a single string.
function flatten(children: unknown): string {
  if (children === null || children === undefined || typeof children === 'boolean') {
    return '';
  }
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(flatten).join('');
  }
  if (React.isValidElement(children)) {
    return flatten((children.props as { children?: unknown }).children);
  }
  return '';
}

// Find the pressable that carries a given accessibilityLabel.
function findButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.type === Pressable && node.props.accessibilityLabel === label,
  );
}

// Press a pressable by invoking its onPress handler inside act().
function press(node: ReactTestRenderer.ReactTestInstance) {
  ReactTestRenderer.act(() => {
    node.props.onPress();
  });
}

// Return the month/year header text (e.g. "March 2024").
function headerTitle(tree: ReactTestRenderer.ReactTestRenderer): string {
  const titleNode = tree.root
    .findAllByType(Text)
    .find(n => typeof n.props.style === 'object' && n.props.style?.fontWeight === '700');
  return titleNode ? flatten(titleNode.props.children) : '';
}

// All DayCell instances that represent actual dates (dateKey is non-null).
function dayCells(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root
    .findAllByType(DayCell)
    .filter(n => n.props.dateKey !== null);
}

describe('MonthGrid header', () => {
  test('shows the month and year derived from today', () => {
    const tree = render();
    expect(headerTitle(tree)).toContain('March');
    expect(allText(tree)).toContain('2024');
  });

  test('derives the header from a different today value', () => {
    const tree = render({ today: '1999-11-02' as DateKey });
    expect(headerTitle(tree)).toContain('November');
    expect(allText(tree)).toContain('1999');
  });

  test('renders the weekday row S M T W T F S', () => {
    const tree = render();
    const texts = allText(tree);
    expect(texts).toEqual(expect.arrayContaining(['S', 'M', 'T', 'W', 'F']));
  });
});

describe('MonthGrid fire health label', () => {
  test('renders the Fire Health label when visible', () => {
    const tree = render({ fireHealth: { visible: true, label: 'Bright' } });
    expect(allText(tree)).toContain('Bright');
    const labelNode = tree.root.find(
      n => n.props.accessibilityLabel === 'Fire Health Bright',
    );
    expect(labelNode).toBeDefined();
  });

  test('omits the Fire Health label when not visible', () => {
    const tree = render({ fireHealth: { visible: false, label: 'Faint' } });
    expect(allText(tree)).not.toContain('Faint');
  });

  test('omits the Fire Health label when fireHealth is undefined', () => {
    const tree = render({ fireHealth: undefined });
    const healthNodes = tree.root.findAll(
      n => typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('Fire Health'),
    );
    expect(healthNodes).toHaveLength(0);
  });
});

describe('MonthGrid navigation', () => {
  test('previous button shifts the view back one month', () => {
    const tree = render();
    press(findButton(tree, 'Previous month'));
    expect(headerTitle(tree)).toContain('February');
  });

  test('previous from January wraps to December of the prior year', () => {
    const tree = render({ today: '2024-01-10' as DateKey });
    press(findButton(tree, 'Previous month'));
    expect(headerTitle(tree)).toContain('December');
    expect(allText(tree)).toContain('2023');
  });

  test('next button is disabled while the current month is in view', () => {
    const tree = render();
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('pressing next while at the current month does not advance', () => {
    const tree = render();
    press(findButton(tree, 'Next month'));
    expect(headerTitle(tree)).toContain('March');
    expect(allText(tree)).toContain('2024');
  });

  test('next becomes enabled after moving back and advances again', () => {
    const tree = render();
    press(findButton(tree, 'Previous month'));
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(false);
    press(next);
    expect(headerTitle(tree)).toContain('March');
  });

  test('next across a year boundary returns to the current month', () => {
    const tree = render({ today: '2024-01-10' as DateKey });
    press(findButton(tree, 'Previous month'));
    expect(headerTitle(tree)).toContain('December');
    press(findButton(tree, 'Next month'));
    expect(headerTitle(tree)).toContain('January');
    expect(allText(tree)).toContain('2024');
    expect(findButton(tree, 'Next month').props.disabled).toBe(true);
  });
});

describe('MonthGrid grid layout', () => {
  test('renders one cell per monthGrid slot', () => {
    const tree = render();
    const expected = monthGrid(2024, 2); // March 2024 (month index 2)
    expect(tree.root.findAllByType(DayCell)).toHaveLength(expected.length);
  });

  test('leading blank cells match the weekday offset of the first day', () => {
    const tree = render();
    const expected = monthGrid(2024, 2);
    const blanks = expected.filter(k => k === null).length;
    const rendered = tree.root
      .findAllByType(DayCell)
      .filter(n => n.props.dateKey === null);
    expect(rendered).toHaveLength(blanks);
  });

  test('day cells carry the correct day numbers in order', () => {
    const tree = render();
    const cells = dayCells(tree);
    const numbers = cells.map(c => c.props.dayNumber);
    expect(numbers[0]).toBe(1);
    expect(numbers[numbers.length - 1]).toBe(31);
  });

  test('a day cell dateKey matches parseYmd of its day number', () => {
    const tree = render();
    const cell = dayCells(tree)[0];
    expect(parseYmd(cell.props.dateKey as DateKey).getDate()).toBe(cell.props.dayNumber);
  });

  test('marks the cell for today', () => {
    const tree = render();
    const todayCell = dayCells(tree).find(c => c.props.dateKey === TODAY);
    expect(todayCell?.props.isToday).toBe(true);
  });

  test('marks the selected cell', () => {
    const selected = '2024-03-07' as DateKey;
    const tree = render({ selectedDate: selected });
    const cell = dayCells(tree).find(c => c.props.dateKey === selected);
    expect(cell?.props.selected).toBe(true);
  });
});

describe('MonthGrid day classification', () => {
  test('each day cell kind equals classifyDay for the supplied entries', () => {
    const entries = {
      '2024-03-04': 3,
      '2024-03-05': 1,
    } as unknown as Entries;
    const tree = render({ entries });
    for (const cell of dayCells(tree)) {
      const key = cell.props.dateKey as DateKey;
      expect(cell.props.kind).toBe(classifyDay(entries, key, TODAY));
    }
  });

  test('passes the stored score through to the matching cell', () => {
    const entries = { '2024-03-04': 4 } as unknown as Entries;
    const tree = render({ entries });
    const cell = dayCells(tree).find(c => c.props.dateKey === '2024-03-04');
    expect(cell?.props.score).toBe(4);
  });

  test('an unscored past day has no score prop', () => {
    const tree = render({ entries: {} as Entries });
    const cell = dayCells(tree).find(c => c.props.dateKey === '2024-03-02');
    expect(cell?.props.score).toBeUndefined();
  });
});

describe('MonthGrid day selection', () => {
  test('invokes onSelectDay with the DateKey of the tapped day', () => {
    const onSelectDay = jest.fn();
    const tree = render({ onSelectDay });
    const cell = dayCells(tree).find(c => c.props.dateKey === '2024-03-10');
    expect(cell).toBeDefined();
    ReactTestRenderer.act(() => {
      cell?.props.onPress('2024-03-10');
    });
    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(onSelectDay).toHaveBeenCalledWith('2024-03-10');
  });

  test('does not call onSelectDay during navigation', () => {
    const onSelectDay = jest.fn();
    const tree = render({ onSelectDay });
    press(findButton(tree, 'Previous month'));
    expect(onSelectDay).not.toHaveBeenCalled();
  });
});

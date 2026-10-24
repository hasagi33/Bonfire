/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: the initial title derived from a fixed "today", month paging across
 * year boundaries, the disabled "next" button at the current month, the weekday
 * header, day-cell kinds from classifyDay, day selection callbacks, and the
 * conditional Fire Health label. Uses react-test-renderer only; no network and
 * no wall-clock dependence (today is always passed in as a fixed DateKey).
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import DayCell from '../src/components/Calendar/DayCell';
import { classifyDay, type Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';
import type { DateKey } from '../src/domain/dates';

const TODAY: DateKey = '2024-03-15' as DateKey;

type Props = React.ComponentProps<typeof MonthGrid>;

// Renders MonthGrid with sensible defaults; individual tests override fields.
function render(overrides: Partial<Props> = {}) {
  const onSelectDay = overrides.onSelectDay ?? jest.fn();
  const props: Props = {
    today: TODAY,
    entries: {},
    selectedDate: null,
    onSelectDay,
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MonthGrid {...props} />);
  });
  return { tree, onSelectDay };
}

// Collects every string child inside the rendered tree, in document order.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const n = node as { children?: unknown[] };
    if (n.children) n.children.forEach(walk);
  };
  walk(tree.toJSON());
  return out;
}

// Finds the Pressable with a given accessibility label.
function findButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.findAll(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  )[0];
}

// Returns the text rendered inside the title element (month name + year).
function titleText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return allText(tree).join('');
}

// Returns every DayCell instance's props, in render order.
function dayCells(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(DayCell).map(c => c.props);
}

function pressAct(fn: () => void) {
  ReactTestRenderer.act(() => {
    fn();
  });
}

describe('MonthGrid', () => {
  describe('initial view', () => {
    test('title shows the month name and year derived from today', () => {
      const { tree } = render();
      expect(titleText(tree)).toContain('March');
      expect(titleText(tree)).toContain('2024');
    });

    test('renders the weekday header S M T W T F S', () => {
      const { tree } = render();
      const texts = allText(tree);
      const headerIndex = texts.findIndex(t => t === 'S');
      expect(headerIndex).toBeGreaterThanOrEqual(0);
      expect(texts.slice(headerIndex, headerIndex + 7)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    });

    test('renders a DayCell for each calendar day of the viewed month', () => {
      const { tree } = render();
      const numbers = dayCells(tree)
        .map(p => p.dayNumber)
        .filter((n): n is number => typeof n === 'number');
      expect(numbers).toHaveLength(31);
      expect(numbers[0]).toBe(1);
      expect(numbers[30]).toBe(31);
    });
  });

  describe('month navigation', () => {
    test('previous button moves the view back one month', () => {
      const { tree } = render();
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      expect(titleText(tree)).toContain('February');
      expect(titleText(tree)).toContain('2024');
    });

    test('paging back across the year boundary goes from January to December of the prior year', () => {
      const { tree } = render({ today: '2024-01-10' as DateKey });
      expect(titleText(tree)).toContain('January');
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      expect(titleText(tree)).toContain('December');
      expect(titleText(tree)).toContain('2023');
    });

    test('paging forward across the year boundary goes from December to January of the next year', () => {
      const { tree } = render({ today: '2024-12-05' as DateKey });
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      // Now at October 2024; step forward through November and December.
      pressAct(() => findButton(tree, 'Next month').props.onPress());
      pressAct(() => findButton(tree, 'Next month').props.onPress());
      expect(titleText(tree)).toContain('December');
      expect(titleText(tree)).toContain('2024');
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      expect(titleText(tree)).toContain('August');
      pressAct(() => findButton(tree, 'Next month').props.onPress());
      pressAct(() => findButton(tree, 'Next month').props.onPress());
      pressAct(() => findButton(tree, 'Next month').props.onPress());
      pressAct(() => findButton(tree, 'Next month').props.onPress());
      expect(titleText(tree)).toContain('December');
    });

    test('next button is disabled while the current month is in view and does not shift', () => {
      const { tree } = render();
      const next = findButton(tree, 'Next month');
      expect(next.props.disabled).toBe(true);
      expect(next.props.accessibilityState).toEqual({ disabled: true });
      pressAct(() => next.props.onPress());
      expect(titleText(tree)).toContain('March');
      expect(titleText(tree)).toContain('2024');
    });

    test('next button enables after going back and returns to the current month', () => {
      const { tree } = render();
      pressAct(() => findButton(tree, 'Previous month').props.onPress());
      const next = findButton(tree, 'Next month');
      expect(next.props.disabled).toBe(false);
      pressAct(() => next.props.onPress());
      expect(titleText(tree)).toContain('March');
      expect(findButton(tree, 'Next month').props.disabled).toBe(true);
    });
  });

  describe('day cells', () => {
    test('each day cell receives the kind returned by classifyDay for the fixed today', () => {
      const entries: Entries = {
        '2024-03-10': 3,
        '2024-03-11': 1,
      } as Entries;
      const { tree } = render({ entries });
      const cells = dayCells(tree).filter(p => p.dateKey !== null);
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) {
        expect(cell.kind).toBe(classifyDay(entries, cell.dateKey, TODAY));
      }
    });

    test('a day cell for today is flagged isToday and the scored score is passed through', () => {
      const entries = { '2024-03-15': 4 } as Entries;
      const { tree } = render({ entries });
      const todayCell = dayCells(tree).find(p => p.dateKey === TODAY);
      expect(todayCell).toBeDefined();
      expect(todayCell?.isToday).toBe(true);
      expect(todayCell?.score).toBe(4);
    });

    test('leading blank cells carry null dateKey and null dayNumber', () => {
      // March 1 2024 is a Friday, so the grid starts with blanks.
      const { tree } = render();
      const blanks = dayCells(tree).filter(p => p.dateKey === null);
      expect(blanks.length).toBeGreaterThan(0);
      for (const b of blanks) {
        expect(b.dayNumber).toBeNull();
        expect(b.kind).toBeNull();
      }
    });

    test('the selected day is marked selected and others are not', () => {
      const { tree } = render({ selectedDate: '2024-03-12' as DateKey });
      const selected = dayCells(tree).filter(p => p.selected);
      expect(selected).toHaveLength(1);
      expect(selected[0].dateKey).toBe('2024-03-12');
    });
  });

  describe('day selection', () => {
    test('pressing a day cell invokes onSelectDay with its DateKey', () => {
      const { tree, onSelectDay } = render();
      const cell = dayCells(tree).find(p => p.dateKey === '2024-03-07');
      expect(cell).toBeDefined();
      pressAct(() => cell?.onPress?.('2024-03-07' as DateKey));
      expect(onSelectDay).toHaveBeenCalledTimes(1);
      expect(onSelectDay).toHaveBeenCalledWith('2024-03-07');
    });

    test('blank cells do not carry an onPress handler that selects a day', () => {
      const { tree, onSelectDay } = render();
      const blank = dayCells(tree).find(p => p.dateKey === null);
      expect(blank).toBeDefined();
      expect(blank?.onPress).toBeUndefined();
      expect(onSelectDay).not.toHaveBeenCalled();
    });
  });

  describe('Fire Health label', () => {
    test('is not rendered when fireHealth is absent', () => {
      const { tree } = render();
      expect(allText(tree)).not.toContain('Steady');
      expect(tree.root.findAll(n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Fire Health'))).toHaveLength(0);
    });

    test('is not rendered when fireHealth is present but not visible', () => {
      const health = { visible: false, label: 'Steady' } as unknown as FireHealthState;
      const { tree } = render({ fireHealth: health });
      expect(allText(tree)).not.toContain('Steady');
    });

    test('renders the label with an accessible name when visible', () => {
      const health = { visible: true, label: 'Bright' } as unknown as FireHealthState;
      const { tree } = render({ fireHealth: health });
      expect(allText(tree)).toContain('Bright');
      const labelled = tree.root.findAll(n => n.props.accessibilityLabel === 'Fire Health Bright');
      expect(labelled.length).toBeGreaterThan(0);
    });
  });
});

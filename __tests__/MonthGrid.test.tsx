/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: header month/year for the fixed "today", the next (›) button being
 * disabled on the current month (FR-020), previous-month navigation with year
 * wrap across the January/December boundary, re-enabling "next" after stepping
 * back, the fire health label visibility, and day-cell kind derivation via
 * classifyDay. Uses a fixed today value so every assertion is deterministic.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import DayCell from '../src/components/Calendar/DayCell';
import { classifyDay } from '../src/domain/fire';
import type { Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';

// Fixed "today" so the rendered month and disabled state never drift with the clock.
const TODAY = '2024-06-15';

interface RenderOptions {
  today?: string;
  entries?: Entries;
  selectedDate?: string | null;
  fireHealth?: FireHealthState;
}

// Render MonthGrid with sensible defaults and return the test renderer.
function render(options: RenderOptions = {}) {
  const onSelectDay = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MonthGrid
        today={options.today ?? TODAY}
        entries={options.entries ?? {}}
        selectedDate={options.selectedDate ?? null}
        onSelectDay={onSelectDay}
        fireHealth={options.fireHealth}
      />,
    );
  });
  return { tree, onSelectDay };
}

// Collect all rendered text content so header assertions stay simple.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType(Text)
    .map((t) => {
      const children = t.props.children;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    })
    .join('|');
}

// Find a Pressable by its accessibility label.
function findNav(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    (n) => n.type === Pressable && n.props.accessibilityLabel === label,
  );
}

// Press a nav button by calling its onPress inside act.
function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  ReactTestRenderer.act(() => {
    findNav(tree, label).props.onPress();
  });
}

// Read the header title text (month name plus the year span).
function headerText(tree: ReactTestRenderer.ReactTestRenderer): { month: string; year: string } {
  const title = tree.root.findAll(
    (n) => n.type === Text && n.props.style && n.props.style.fontSize === 17 && n.props.style.letterSpacing === 0.2,
  )[0];
  const children = title.props.children as unknown[];
  const year = (children[2] as { props: { children: unknown } }).props.children;
  return { month: String(children[0]).trim(), year: String(year) };
}

describe('MonthGrid', () => {
  describe('header', () => {
    test('shows the month and year of the fixed today value', () => {
      const { tree } = render();
      expect(headerText(tree)).toEqual({ month: 'June', year: '2024' });
    });

    test('starts on the month containing a different today value', () => {
      const { tree } = render({ today: '2023-03-01' });
      expect(headerText(tree)).toEqual({ month: 'March', year: '2023' });
    });
  });

  describe('next button (FR-020)', () => {
    test('is disabled while viewing the current month', () => {
      const { tree } = render();
      const next = findNav(tree, 'Next month');
      expect(next.props.disabled).toBe(true);
      expect(next.props.accessibilityState).toEqual({ disabled: true });
    });

    test('pressing it on the current month does not change the view', () => {
      const { tree } = render();
      press(tree, 'Next month');
      expect(headerText(tree)).toEqual({ month: 'June', year: '2024' });
    });

    test('is re-enabled after stepping back and returns to the current month', () => {
      const { tree } = render();
      press(tree, 'Previous month');
      expect(findNav(tree, 'Next month').props.disabled).toBe(false);

      press(tree, 'Next month');
      expect(headerText(tree)).toEqual({ month: 'June', year: '2024' });
      expect(findNav(tree, 'Next month').props.disabled).toBe(true);
    });
  });

  describe('previous button (‹)', () => {
    test('moves back one month', () => {
      const { tree } = render();
      press(tree, 'Previous month');
      expect(headerText(tree)).toEqual({ month: 'May', year: '2024' });
    });

    test('wraps the year from January back to December of the prior year', () => {
      const { tree } = render({ today: '2024-01-10' });
      press(tree, 'Previous month');
      expect(headerText(tree)).toEqual({ month: 'December', year: '2023' });
    });

    test('keeps stepping backward across multiple years without limit', () => {
      const { tree } = render({ today: '2024-02-01' });
      for (let i = 0; i < 14; i++) press(tree, 'Previous month');
      expect(headerText(tree)).toEqual({ month: 'December', year: '2022' });
    });
  });

  describe('fire health label', () => {
    test('is not rendered when fireHealth is undefined', () => {
      const { tree } = render();
      expect(allText(tree)).not.toContain('Steady');
      expect(tree.root.findAll((n) => n.props.accessibilityLabel?.startsWith('Fire Health')))
        .toHaveLength(0);
    });

    test('is not rendered when fireHealth.visible is false', () => {
      const { tree } = render({
        fireHealth: { visible: false, label: 'Steady' } as unknown as FireHealthState,
      });
      expect(allText(tree)).not.toContain('Steady');
    });

    test('renders the label when fireHealth.visible is true', () => {
      const { tree } = render({
        fireHealth: { visible: true, label: 'Radiant' } as unknown as FireHealthState,
      });
      expect(allText(tree)).toContain('Radiant');
      const labelled = tree.root.findAll(
        (n) => n.props.accessibilityLabel === 'Fire Health Radiant',
      );
      expect(labelled.length).toBeGreaterThan(0);
    });
  });

  describe('day cells', () => {
    test('receive kind values derived from classifyDay with entries and today', () => {
      const entries: Entries = { '2024-06-10': 3, '2024-06-11': 1 };
      const { tree } = render({ entries });

      const cells = tree.root.findAllByType(DayCell);
      const cellFor = (key: string) =>
        cells.find((c) => c.props.dateKey === key);

      const scored = cellFor('2024-06-10');
      expect(scored?.props.kind).toBe(classifyDay(entries, '2024-06-10', TODAY));
      expect(scored?.props.score).toBe(3);

      const oneOnly = cellFor('2024-06-11');
      expect(oneOnly?.props.kind).toBe(classifyDay(entries, '2024-06-11', TODAY));
      expect(oneOnly?.props.score).toBe(1);
    });

    test('marks the today cell with isToday', () => {
      const { tree } = render();
      const todayCell = tree.root
        .findAllByType(DayCell)
        .find((c) => c.props.dateKey === TODAY);
      expect(todayCell?.props.isToday).toBe(true);
    });

    test('leading blank cells carry null date and kind', () => {
      // June 1 2024 is a Saturday, so the first row begins with blank cells.
      const { tree } = render();
      const blanks = tree.root
        .findAllByType(DayCell)
        .filter((c) => c.props.dateKey === null);
      expect(blanks.length).toBeGreaterThan(0);
      for (const b of blanks) {
        expect(b.props.kind).toBeNull();
        expect(b.props.dayNumber).toBeNull();
      }
    });
  });
});

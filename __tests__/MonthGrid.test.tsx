/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: header title from the `today` prop, previous/next month navigation
 * (including December → January wrapping), the disabled "next" button at the
 * current month, blank leading cells + one DayCell per day, day classification
 * via the entries prop, and the fire-health label visibility.
 *
 * Uses react-test-renderer only (no testing-library). A fixed `today` value keeps
 * every assertion deterministic. Nothing here touches the network or storage.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import DayCell from '../src/components/Calendar/DayCell';
import type { Entries } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Fixed "today" so the rendered month and disabled state never drift with the clock.
const TODAY = '2024-03-15' as DateKey;

interface RenderOptions {
  today?: DateKey;
  entries?: Entries;
  selectedDate?: DateKey | null;
  fireHealth?: { visible: boolean; label: string };
}

// Render MonthGrid inside act() and return the renderer plus a helper that
// finds nodes by accessibilityLabel.
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
  const byLabel = (label: string) =>
    tree.root.findAll(n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function' || n.props.accessibilityLabel === label);
  return { tree, onSelectDay, byLabel };
}

// Collect all rendered text content as one string, for header assertions.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root
    .findAll(n => typeof n.type === 'string' && n.type === 'Text' )
    .map(n => n.children.join(''))
    .join(' ');
}

// Find the Pressable that carries a given accessibilityLabel (the Pressable
// host element exposes the label and the press handler / disabled state).
function findNav(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    n => n.props.accessibilityLabel === label && n.props.accessibilityRole === 'button',
  );
}

// Press a nav button by invoking its onPress prop inside act().
function press(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const node = findNav(tree, label);
  ReactTestRenderer.act(() => {
    node.props.onPress();
  });
}

describe('MonthGrid header', () => {
  test('shows the month and year derived from the today prop', () => {
    const { tree } = render();
    expect(allText(tree)).toContain('March');
    expect(allText(tree)).toContain('2024');
  });

  test('derives a different month when today changes', () => {
    const { tree } = render({ today: '2023-11-02' as DateKey });
    expect(allText(tree)).toContain('November');
    expect(allText(tree)).toContain('2023');
  });
});

describe('MonthGrid navigation', () => {
  test('previous button shifts the view back one month', () => {
    const { tree } = render();
    press(tree, 'Previous month');
    expect(allText(tree)).toContain('February');
    expect(allText(tree)).toContain('2024');
  });

  test('wraps January back to December of the prior year', () => {
    const { tree } = render({ today: '2024-01-10' as DateKey });
    press(tree, 'Previous month');
    expect(allText(tree)).toContain('December');
    expect(allText(tree)).toContain('2023');
  });

  test('next wraps December forward to January of the next year', () => {
    const { tree } = render({ today: '2023-12-10' as DateKey });
    press(tree, 'Previous month');
    press(tree, 'Next month');
    expect(allText(tree)).toContain('December');
    expect(allText(tree)).toContain('2023');
  });

  test('next button is disabled and reports disabled state at the current month', () => {
    const { tree } = render();
    const next = findNav(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('next button becomes enabled after navigating back, and moves forward again', () => {
    const { tree } = render();
    press(tree, 'Previous month');
    const next = findNav(tree, 'Next month');
    expect(next.props.disabled).toBe(false);
    expect(next.props.accessibilityState).toEqual({ disabled: false });

    press(tree, 'Next month');
    expect(allText(tree)).toContain('March');
    expect(findNav(tree, 'Next month').props.disabled).toBe(true);
  });
});

describe('MonthGrid day grid', () => {
  test('renders one DayCell per day plus blank leading cells for the first weekday', () => {
    // March 2024 starts on a Friday (weekday index 5) => 5 leading blanks, 31 days.
    const { tree } = render();
    const cells = tree.root.findAllByType(DayCell);
    const blanks = cells.filter(c => c.props.dateKey === null);
    const days = cells.filter(c => c.props.dateKey !== null);
    expect(blanks).toHaveLength(5);
    expect(days).toHaveLength(31);
    expect(days[0].props.dayNumber).toBe(1);
    expect(days[30].props.dayNumber).toBe(31);
  });

  test('classifies day cells using the entries prop', () => {
    const entries: Entries = { '2024-03-10': 4 } as Entries;
    const { tree } = render({ entries });
    const cell = tree.root
      .findAllByType(DayCell)
      .find(c => c.props.dateKey === '2024-03-10');
    expect(cell).toBeDefined();
    expect(cell!.props.score).toBe(4);
    expect(cell!.props.kind).toBeDefined();
    expect(cell!.props.kind).not.toBeNull();
  });

  test('marks the today cell with isToday', () => {
    const { tree } = render();
    const cell = tree.root
      .findAllByType(DayCell)
      .find(c => c.props.dateKey === TODAY);
    expect(cell!.props.isToday).toBe(true);
  });
});

describe('MonthGrid fire health label', () => {
  test('hides the health label when fireHealth.visible is false', () => {
    const { tree } = render({ fireHealth: { visible: false, label: 'Thriving' } });
    const matches = tree.root.findAll(n => n.props.accessibilityLabel === 'Fire Health Thriving');
    expect(matches).toHaveLength(0);
    expect(allText(tree)).not.toContain('Thriving');
  });

  test('shows the health label with an accessibilityLabel when visible is true', () => {
    const { tree } = render({ fireHealth: { visible: true, label: 'Thriving' } });
    const node = tree.root.find(n => n.props.accessibilityLabel === 'Fire Health Thriving');
    expect(node).toBeDefined();
    expect(allText(tree)).toContain('Thriving');
  });
});

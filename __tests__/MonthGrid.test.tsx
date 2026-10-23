/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: the title shows the current month and year, the "next" button is
 * disabled on the current month (FR-020) and enabled after paging back, paging
 * back across a year boundary decrements the year, blank padding cells render for
 * null grid entries, the fire health label renders only when visible, and selecting
 * a day reports its DateKey.
 *
 * Uses react-test-renderer with a fixed `today` key so results are deterministic.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { FireHealthState } from '../src/domain/fireHealth';
import type { DateKey } from '../src/domain/dates';

const TODAY = '2024-05-15' as DateKey;

// Collect all raw text content under a node into one string for assertions.
function textOf(node: ReactTestRenderer.ReactTestInstance): string {
  const parts: string[] = [];
  const walk = (n: ReactTestRenderer.ReactTestInstance) => {
    n.children.forEach(child => {
      if (typeof child === 'string') {
        parts.push(child);
      } else {
        walk(child);
      }
    });
  };
  walk(node);
  return parts.join('');
}

// Find a pressable nav button by its accessibility label.
function findButton(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    n => n.props.accessibilityRole === 'button' && n.props.accessibilityLabel === label,
  );
}

// Locate the title Text (the node styled with the title font size and weight).
function findTitle(
  tree: ReactTestRenderer.ReactTestRenderer,
): ReactTestRenderer.ReactTestInstance {
  return tree.root.findAll(
    n =>
      typeof n.type !== 'string' &&
      n.props.style !== undefined &&
      n.props.style.fontSize === 17 &&
      n.props.style.fontWeight === '700',
  )[0];
}

function render(props: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  const onSelectDay = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MonthGrid
        today={TODAY}
        entries={{}}
        selectedDate={null}
        onSelectDay={onSelectDay}
        {...props}
      />,
    );
  });
  return { tree, onSelectDay };
}

describe('MonthGrid', () => {
  test('title shows the current month and year', () => {
    const { tree } = render();
    const title = findTitle(tree);
    expect(textOf(title)).toContain('May');
    expect(textOf(title)).toContain('2024');
  });

  test('"Next month" is disabled while the current month is in view (FR-020)', () => {
    const { tree } = render();
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('"Next month" becomes enabled after paging back, and paging forward returns to the current month', () => {
    const { tree } = render();
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(false);
    expect(next.props.accessibilityState).toEqual({ disabled: false });

    ReactTestRenderer.act(() => {
      next.props.onPress();
    });
    expect(findButton(tree, 'Next month').props.disabled).toBe(true);
  });

  test('paging backward across a year boundary decrements the year', () => {
    const { tree } = render({ today: '2024-01-10' as DateKey });
    // Starting in January 2024, one step back should land in December 2023.
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    const title = findTitle(tree);
    expect(textOf(title)).toContain('December');
    expect(textOf(title)).toContain('2023');
  });

  test('null grid entries render as blank padding cells', () => {
    const { tree } = render();
    // Padding cells are DayCell instances with dateKey === null.
    const blanks = tree.root.findAll(
      n => (n.props as { dateKey?: unknown }).dateKey === null && n.props.dayNumber === null,
    );
    // May 2024 starts on a Wednesday, so there are leading blanks before day 1.
    expect(blanks.length).toBeGreaterThan(0);
  });

  test('fire health label renders only when visible', () => {
    const visible: FireHealthState = { visible: true, label: 'Bright' } as FireHealthState;
    const { tree: shown } = render({ fireHealth: visible });
    expect(textOf(shown.root)).toContain('Bright');
    // The label is rendered by a single Text node carrying the accessibility label.
    // Match only host (string-typed) nodes so composite wrappers don't double-count.
    expect(
      shown.root.findAll(
        n => typeof n.type === 'string' && n.props.accessibilityLabel === 'Fire Health Bright',
      ).length,
    ).toBe(1);

    const hidden = { visible: false, label: 'Bright' } as FireHealthState;
    const { tree: hiddenTree } = render({ fireHealth: hidden });
    expect(
      hiddenTree.root.findAll(n => n.props.accessibilityLabel === 'Fire Health Bright').length,
    ).toBe(0);
  });

  test('selecting a day calls onSelectDay with its DateKey', () => {
    const { tree, onSelectDay } = render();
    // Locate the day cell for 2024-05-15 (rendered with dateKey and onPress props).
    const dayCell = tree.root.find(
      n =>
        (n.props as { dateKey?: unknown }).dateKey === '2024-05-15' &&
        typeof n.props.onPress === 'function',
    );
    ReactTestRenderer.act(() => {
      dayCell.props.onPress('2024-05-15');
    });
    expect(onSelectDay).toHaveBeenCalledWith('2024-05-15');
    expect(onSelectDay).toHaveBeenCalledTimes(1);
  });
});

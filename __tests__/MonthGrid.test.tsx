/**
 * MonthGrid.test.tsx — unit tests for the month calendar grid.
 *
 * Covers: initial view of today's month, disabled "next" at the current month,
 * backward navigation across a year boundary, enabling "next" after going back,
 * day-cell rendering, day selection callbacks, and the fire-health label.
 * Uses react-test-renderer only; no network, no storage, fixed "today".
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';
import type { DateKey } from '../src/domain/dates';

// Fixed "today" so the rendered month and disabled states are deterministic.
const TODAY = '2024-03-15' as DateKey;

// Find a Pressable by its accessibilityLabel (e.g. "Next month").
function findButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.type === Pressable && node.props.accessibilityLabel === label,
  );
}

// Collect all rendered text content in the tree as a single string.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root
    .findAllByType(Text)
    .map(t => {
      const children = t.props.children;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    })
    .join(' ');
}

function render(
  props: Partial<React.ComponentProps<typeof MonthGrid>> = {},
): ReactTestRenderer.ReactTestRenderer {
  const entries: Entries = {};
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MonthGrid
        today={TODAY}
        entries={entries}
        selectedDate={null}
        onSelectDay={() => {}}
        {...props}
      />,
    );
  });
  return tree;
}

describe('MonthGrid', () => {
  test('initially shows the month and year of today', () => {
    const tree = render();
    const text = allText(tree);
    expect(text).toContain('March');
    expect(text).toContain('2024');
  });

  test('"Next month" is disabled while viewing the current month', () => {
    const tree = render();
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('pressing "Previous month" navigates back and across the year boundary', () => {
    const tree = render({ today: '2024-01-10' as DateKey });
    expect(allText(tree)).toContain('January');

    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });

    const text = allText(tree);
    expect(text).toContain('December');
    expect(text).toContain('2023');
    expect(text).not.toContain('2024');
  });

  test('"Next month" becomes enabled after going back and returns to the current month', () => {
    const tree = render();
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });

    expect(findButton(tree, 'Next month').props.disabled).toBe(false);
    expect(allText(tree)).toContain('February');

    ReactTestRenderer.act(() => {
      findButton(tree, 'Next month').props.onPress();
    });

    const text = allText(tree);
    expect(text).toContain('March');
    expect(text).toContain('2024');
    expect(findButton(tree, 'Next month').props.disabled).toBe(true);
  });

  test('renders day cells with day numbers derived from the date keys', () => {
    const tree = render();
    const text = allText(tree);
    // March 2024 has 31 days; the first and last day numbers must appear.
    expect(text).toContain('1');
    expect(text).toContain('31');
  });

  test('selecting a day calls onSelectDay with that date key', () => {
    const onSelectDay = jest.fn();
    const tree = render({ onSelectDay });

    const dayCell = tree.root.find(
      node =>
        node.props.dateKey === '2024-03-10' &&
        typeof node.props.onPress === 'function',
    );
    ReactTestRenderer.act(() => {
      dayCell.props.onPress('2024-03-10');
    });

    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(onSelectDay).toHaveBeenCalledWith('2024-03-10');
  });

  test('renders the fire health label only when fireHealth is visible', () => {
    const visible: FireHealthState = { visible: true, label: 'Bright' } as FireHealthState;
    const shown = render({ fireHealth: visible });
    expect(allText(shown)).toContain('Bright');

    const hidden = { visible: false, label: 'Bright' } as FireHealthState;
    const notShown = render({ fireHealth: hidden });
    expect(allText(notShown)).not.toContain('Bright');
  });
});

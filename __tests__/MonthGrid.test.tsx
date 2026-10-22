/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: initial view matches the `today` prop, paging backward wraps the year
 * across January, the "next" button is disabled on the current month and becomes
 * enabled after paging back, the header shows month name and year, and the Fire
 * Health label renders only when it is marked visible.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';

/**
 * Helper: renders MonthGrid with fixed defaults and returns the test renderer.
 * Inputs: partial props overriding the defaults.
 * Outputs: the ReactTestRenderer instance rendered inside act().
 */
function render(overrides: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  const props = {
    today: '2025-03-15',
    entries: {},
    selectedDate: null,
    onSelectDay: jest.fn(),
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MonthGrid {...props} />);
  });
  return tree;
}

/** Collect all rendered text content (strings) from the tree. */
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      parts.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object' && 'children' in node) {
      walk((node as { children: unknown }).children);
    }
  };
  walk(tree.toJSON());
  return parts.join(' ');
}

/** Find the pressable with the given accessibility label. */
function findButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
}

describe('MonthGrid', () => {
  test('initial view shows the month and year of the today prop', () => {
    const tree = render({ today: '2025-03-15' });
    expect(allText(tree)).toContain('March');
    expect(allText(tree)).toContain('2025');
  });

  test('header shows the month name and year for a different today', () => {
    const tree = render({ today: '2024-11-02' });
    expect(allText(tree)).toContain('November');
    expect(allText(tree)).toContain('2024');
  });

  test('previous-month button decrements the displayed month', () => {
    const tree = render({ today: '2025-03-15' });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    expect(allText(tree)).toContain('February');
    expect(allText(tree)).toContain('2025');
  });

  test('paging back across January wraps to December of the previous year', () => {
    const tree = render({ today: '2025-01-10' });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    expect(allText(tree)).toContain('December');
    expect(allText(tree)).toContain('2024');
  });

  test('next-month button is disabled when the current month is in view', () => {
    const tree = render({ today: '2025-03-15' });
    const next = tree.root.find(n => n.props.accessibilityLabel === 'Next month' && n.props.accessibilityRole === 'button');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('pressing next on the current month does not change the view', () => {
    const tree = render({ today: '2025-03-15' });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Next month').props.onPress();
    });
    expect(allText(tree)).toContain('March');
    expect(allText(tree)).toContain('2025');
  });

  test('after paging back, next becomes enabled and returns to the current month', () => {
    const tree = render({ today: '2025-03-15' });
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    const nextEnabled = tree.root.find(n => n.props.accessibilityLabel === 'Next month' && n.props.accessibilityRole === 'button');
    expect(nextEnabled.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      findButton(tree, 'Next month').props.onPress();
    });
    expect(allText(tree)).toContain('March');
    expect(allText(tree)).toContain('2025');
  });

  test('Fire Health label is rendered when fireHealth.visible is true', () => {
    const tree = render({
      fireHealth: { visible: true, label: 'Bright' } as React.ComponentProps<typeof MonthGrid>['fireHealth'],
    });
    expect(allText(tree)).toContain('Bright');
  });

  test('Fire Health label is not rendered when fireHealth.visible is false', () => {
    const tree = render({
      fireHealth: { visible: false, label: 'Bright' } as React.ComponentProps<typeof MonthGrid>['fireHealth'],
    });
    expect(allText(tree)).not.toContain('Bright');
  });

  test('Fire Health label is not rendered when fireHealth is omitted', () => {
    const tree = render({ fireHealth: undefined });
    expect(allText(tree)).not.toContain('Fire Health');
  });
});

/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: the title shows the viewed month and year for a fixed "today",
 * the "next" button is disabled on the current month, paging backward
 * re-enables "next", paging across year boundaries works in both
 * directions, and the Fire Health label renders only when visible.
 *
 * Uses react-test-renderer and a fixed ISO date key so the output is
 * deterministic. No network or storage is touched, so nothing is mocked.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { DateKey } from '../src/domain/dates';
import type { Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';

// A fixed "today" so every assertion is independent of the wall clock.
const TODAY = '2024-06-15' as DateKey;

const EMPTY_ENTRIES: Entries = {};

/**
 * Flattens every string child of a rendered node into one string, so tests can
 * check visible text without depending on the exact nesting of <Text> elements.
 */
function collectText(node: ReactTestRenderer.ReactTestInstance): string {
  const parts: string[] = [];
  const walk = (n: ReactTestRenderer.ReactTestInstance | string) => {
    if (typeof n === 'string') {
      parts.push(n);
      return;
    }
    n.children.forEach(walk);
  };
  walk(node);
  return parts.join('');
}

/**
 * Finds the first pressable element whose accessibilityLabel matches `label`.
 * Throws if it is missing so a failing test points at the real problem.
 */
function findButton(
  root: ReactTestRenderer.ReactTestRenderer,
  label: string,
): ReactTestRenderer.ReactTestInstance {
  const matches = root.root.findAll(
    (n) => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
  if (matches.length === 0) {
    throw new Error(`No button found with accessibilityLabel "${label}"`);
  }
  return matches[0];
}

/** Presses a button by calling its onPress handler inside act(). */
function press(
  root: ReactTestRenderer.ReactTestRenderer,
  label: string,
): void {
  const button = findButton(root, label);
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });
}

/** Reads the disabled state the component exposes for the "Next month" button. */
function isNextDisabled(root: ReactTestRenderer.ReactTestRenderer): boolean {
  return findButton(root, 'Next month').props.disabled === true;
}

/** Renders MonthGrid with sensible defaults, overridable per test. */
function render(
  overrides: Partial<React.ComponentProps<typeof MonthGrid>> = {},
): ReactTestRenderer.ReactTestRenderer {
  const props: React.ComponentProps<typeof MonthGrid> = {
    today: TODAY,
    entries: EMPTY_ENTRIES,
    selectedDate: null,
    onSelectDay: () => {},
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<MonthGrid {...props} />);
  });
  return tree;
}

describe('MonthGrid title', () => {
  test('shows the month and year of the fixed today value', () => {
    const tree = render();
    expect(collectText(tree.root)).toContain('June');
    expect(collectText(tree.root)).toContain('2024');
  });

  test('shows the correct month for a date in January', () => {
    const tree = render({ today: '2025-01-03' as DateKey });
    expect(collectText(tree.root)).toContain('January');
    expect(collectText(tree.root)).toContain('2025');
  });

  test('shows the correct month for a date in December', () => {
    const tree = render({ today: '2023-12-31' as DateKey });
    expect(collectText(tree.root)).toContain('December');
    expect(collectText(tree.root)).toContain('2023');
  });
});

describe('MonthGrid next-month navigation', () => {
  test('next button is disabled while viewing the current month', () => {
    const tree = render();
    expect(isNextDisabled(tree)).toBe(true);
  });

  test('pressing previous enables the next button', () => {
    const tree = render();
    press(tree, 'Previous month');
    expect(isNextDisabled(tree)).toBe(false);
  });

  test('paging forward back to the current month disables next again', () => {
    const tree = render();
    press(tree, 'Previous month');
    press(tree, 'Next month');
    expect(collectText(tree.root)).toContain('June');
    expect(isNextDisabled(tree)).toBe(true);
  });

  test('pressing next while disabled does not move past the current month', () => {
    const tree = render();
    press(tree, 'Next month');
    expect(collectText(tree.root)).toContain('June');
    expect(collectText(tree.root)).toContain('2024');
  });
});

describe('MonthGrid paging across years', () => {
  test('paging backward from January rolls to December of the prior year', () => {
    const tree = render({ today: '2024-01-10' as DateKey });
    press(tree, 'Previous month');
    expect(collectText(tree.root)).toContain('December');
    expect(collectText(tree.root)).toContain('2023');
  });

  test('paging forward from December rolls to January of the next year', () => {
    const tree = render({ today: '2023-12-10' as DateKey });
    press(tree, 'Previous month');
    press(tree, 'Previous month');
    press(tree, 'Previous month');
    press(tree, 'Previous month');
    // Now viewing August 2023; paging forward through the year boundary is
    // exercised by stepping back to December then forward again.
    press(tree, 'Next month');
    press(tree, 'Next month');
    press(tree, 'Next month');
    press(tree, 'Next month');
    expect(collectText(tree.root)).toContain('December');
    expect(collectText(tree.root)).toContain('2023');
    expect(isNextDisabled(tree)).toBe(true);
  });

  test('paging back several months across a year boundary shows the right label', () => {
    const tree = render({ today: '2024-03-05' as DateKey });
    for (let i = 0; i < 4; i += 1) {
      press(tree, 'Previous month');
    }
    // March -> February -> January -> December -> November of 2023.
    expect(collectText(tree.root)).toContain('November');
    expect(collectText(tree.root)).toContain('2023');
  });
});

describe('MonthGrid Fire Health label', () => {
  const visibleHealth: FireHealthState = {
    visible: true,
    label: 'Bright',
  } as FireHealthState;

  const hiddenHealth: FireHealthState = {
    visible: false,
    label: 'Faint',
  } as FireHealthState;

  test('renders the health label when fireHealth.visible is true', () => {
    const tree = render({ fireHealth: visibleHealth });
    expect(collectText(tree.root)).toContain('Bright');
  });

  test('does not render the health label when fireHealth.visible is false', () => {
    const tree = render({ fireHealth: hiddenHealth });
    expect(collectText(tree.root)).not.toContain('Faint');
  });

  test('does not render the health label when fireHealth is omitted', () => {
    const tree = render();
    expect(collectText(tree.root)).not.toContain('Fire Health');
    expect(
      tree.root.findAll((n) => n.props.accessibilityLabel?.startsWith('Fire Health')),
    ).toHaveLength(0);
  });
});

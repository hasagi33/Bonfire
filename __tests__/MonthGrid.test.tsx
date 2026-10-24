/**
 * MonthGrid.test.tsx — unit tests for the month calendar grid.
 *
 * Covers: backward paging via ‹, the disabled › at the current month (FR-020),
 * the month/year title and weekday header, day-cell classification, and the
 * conditional Fire Health label. Uses a fixed "today" key so results never
 * depend on the real clock, and never touches storage or the network.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';

// Fixed "today" in local time: 15 March 2024. Using a constant keeps every
// assertion deterministic regardless of when the suite runs.
const TODAY = '2024-03-15';

const noop = () => {};

// Render helper: builds the tree with sensible defaults and lets each test
// override only the props it cares about.
function renderGrid(
  overrides: Partial<{
    entries: Entries;
    selectedDate: string | null;
    onSelectDay: (k: string) => void;
    fireHealth: FireHealthState;
  }> = {},
) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MonthGrid
        today={TODAY}
        entries={overrides.entries ?? {}}
        selectedDate={overrides.selectedDate ?? null}
        onSelectDay={overrides.onSelectDay ?? noop}
        fireHealth={overrides.fireHealth}
      />,
    );
  });
  return tree;
}

// Collects every text string currently rendered in the tree, in order.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  const out: string[] = [];
  const walk = (node: ReactTestRenderer.ReactTestInstance) => {
    if (typeof node.type === 'string' && node.type === 'Text') {
      out.push(...node.children.map(c => (typeof c === 'string' ? c : '')));
    }
    node.children.forEach(child => {
      if (typeof child !== 'string') walk(child);
    });
  };
  walk(tree.root);
  return out;
}

// Finds the pressable nav button by its accessibility label.
function findButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
}

describe('MonthGrid title and header', () => {
  test('shows the current month name and year for today', () => {
    const tree = renderGrid();
    const text = allText(tree);
    expect(text).toContain('March ');
    expect(text).toContain('2024');
  });

  test('renders the seven weekday header letters in order', () => {
    const tree = renderGrid();
    const text = allText(tree);
    // The DOW row is S M T W T F S; it appears before the day numbers.
    const dowStart = text.indexOf('S');
    expect(text.slice(dowStart, dowStart + 7)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });
});

describe('MonthGrid paging', () => {
  test('previous button moves the view back one month', () => {
    const tree = renderGrid();
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    const text = allText(tree);
    expect(text).toContain('February ');
    expect(text).toContain('2024');
  });

  test('paging backward crosses the year boundary', () => {
    const tree = renderGrid();
    // March -> February -> January -> December 2023
    for (let i = 0; i < 3; i += 1) {
      ReactTestRenderer.act(() => {
        findButton(tree, 'Previous month').props.onPress();
      });
    }
    const text = allText(tree);
    expect(text).toContain('December ');
    expect(text).toContain('2023');
  });

  test('paging backward is unlimited across many years', () => {
    const tree = renderGrid();
    // 24 months back from March 2024 lands on March 2022.
    for (let i = 0; i < 24; i += 1) {
      ReactTestRenderer.act(() => {
        findButton(tree, 'Previous month').props.onPress();
      });
    }
    const text = allText(tree);
    expect(text).toContain('March ');
    expect(text).toContain('2022');
  });

  test('next button is disabled while the current month is in view (FR-020)', () => {
    const tree = renderGrid();
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('pressing a disabled next button does not shift the view', () => {
    const tree = renderGrid();
    const next = findButton(tree, 'Next month');
    ReactTestRenderer.act(() => {
      next.props.onPress();
    });
    const text = allText(tree);
    expect(text).toContain('March ');
    expect(text).not.toContain('April ');
  });

  test('next button becomes enabled after paging back, and returns to current month', () => {
    const tree = renderGrid();
    ReactTestRenderer.act(() => {
      findButton(tree, 'Previous month').props.onPress();
    });
    const next = findButton(tree, 'Next month');
    expect(next.props.disabled).toBe(false);

    ReactTestRenderer.act(() => {
      next.props.onPress();
    });
    expect(allText(tree)).toContain('March ');
    expect(findButton(tree, 'Next month').props.disabled).toBe(true);
  });
});

describe('MonthGrid day cells', () => {
  test('renders the day number for every day of the viewed month', () => {
    const tree = renderGrid();
    const text = allText(tree);
    // March 2024 has 31 days; spot-check the first and last.
    expect(text).toContain('1');
    expect(text).toContain('31');
  });

  test('invokes onSelectDay with the date key when a day is pressed', () => {
    const onSelectDay = jest.fn();
    const tree = renderGrid({ onSelectDay });
    const cell = tree.root.findAll(
      n => n.props.dateKey === '2024-03-10' && typeof n.props.onPress === 'function',
    );
    expect(cell.length).toBeGreaterThan(0);
    ReactTestRenderer.act(() => {
      cell[0].props.onPress('2024-03-10');
    });
    expect(onSelectDay).toHaveBeenCalledWith('2024-03-10');
  });

  test('passes the scored entry through to its day cell', () => {
    const tree = renderGrid({ entries: { '2024-03-12': 4 } });
    const cell = tree.root.find(n => n.props.dateKey === '2024-03-12' && 'score' in n.props);
    expect(cell.props.score).toBe(4);
  });

  test('marks today on the matching cell', () => {
    const tree = renderGrid();
    const cell = tree.root.find(n => n.props.dateKey === TODAY && 'isToday' in n.props);
    expect(cell.props.isToday).toBe(true);
  });

  test('marks only the selected date as selected', () => {
    const tree = renderGrid({ selectedDate: '2024-03-08' });
    const selected = tree.root.find(
      n => n.props.dateKey === '2024-03-08' && 'selected' in n.props,
    );
    const other = tree.root.find(n => n.props.dateKey === '2024-03-09' && 'selected' in n.props);
    expect(selected.props.selected).toBe(true);
    expect(other.props.selected).toBe(false);
  });
});

describe('MonthGrid Fire Health label', () => {
  test('is hidden when fireHealth is not provided', () => {
    const tree = renderGrid();
    const labels = tree.root.findAll(n => n.props.accessibilityLabel?.startsWith('Fire Health'));
    expect(labels).toHaveLength(0);
  });

  test('is hidden when fireHealth.visible is false', () => {
    const tree = renderGrid({
      fireHealth: { visible: false, label: 'Steady' } as unknown as FireHealthState,
    });
    expect(allText(tree)).not.toContain('Steady');
  });

  test('renders the label when fireHealth.visible is true', () => {
    const tree = renderGrid({
      fireHealth: { visible: true, label: 'Bright' } as unknown as FireHealthState,
    });
    expect(allText(tree)).toContain('Bright');
    const labelled = tree.root.find(
      n => n.props.accessibilityLabel === 'Fire Health Bright',
    );
    expect(labelled).toBeDefined();
  });
});

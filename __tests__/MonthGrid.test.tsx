/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: title/year rendering, weekday row, backward paging without limit,
 * next-button gating at the current month (FR-020), fire health label
 * visibility, and blank/day cell production. Uses a fixed "today" DateKey so
 * results are deterministic and never depend on the wall clock.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';
import type { DateKey } from '../src/domain/dates';

// Fixed "today" so the viewed month and next-button gating are deterministic.
const TODAY = '2025-06-15' as DateKey;
const NO_ENTRIES: Entries = {};

// Collect every text string rendered in the tree, in document order.
// Numbers are stringified so callers can search for years as plain text.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  const out: string[] = [];
  const walk = (node: ReactTestRenderer.ReactTestInstance) => {
    node.children.forEach(child => {
      if (typeof child === 'string') {
        out.push(child);
      } else {
        walk(child);
      }
    });
  };
  walk(tree.root);
  return out;
}

// Join all rendered text so substring checks (e.g. the year inside a nested
// <Text>) work regardless of how the title is split across text nodes.
function fullText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return allText(tree).join('');
}

// Find a pressable by its accessibility label.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    n => n.props.accessibilityLabel === label && typeof n.props.onPress === 'function',
  );
}

function render(props: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MonthGrid
        today={TODAY}
        entries={NO_ENTRIES}
        selectedDate={null}
        onSelectDay={() => {}}
        {...props}
      />,
    );
  });
  return tree;
}

describe('MonthGrid', () => {
  test('title shows the month and year of today', () => {
    const tree = render();
    const text = fullText(tree);
    expect(text).toContain('June');
    expect(text).toContain('2025');
    tree.unmount();
  });

  test('renders the weekday row S M T W T F S', () => {
    const tree = render();
    const text = allText(tree);
    const dow = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    // The weekday letters appear in order in the rendered text.
    const idx = text.findIndex(t => t === 'S');
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(text.slice(idx, idx + 7)).toEqual(dow);
    tree.unmount();
  });

  test('next button is disabled when viewing the current month (FR-020)', () => {
    const tree = render();
    const next = findByLabel(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
    tree.unmount();
  });

  test('previous button pages backward and enables next', () => {
    const tree = render();
    ReactTestRenderer.act(() => {
      findByLabel(tree, 'Previous month').props.onPress();
    });
    expect(fullText(tree)).toContain('May');
    const next = findByLabel(tree, 'Next month');
    expect(next.props.disabled).toBe(false);
    tree.unmount();
  });

  test('paging backward crosses the year boundary without limit', () => {
    const tree = render({ today: '2025-01-10' as DateKey });
    const prev = () =>
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Previous month').props.onPress();
      });
    prev(); // Dec 2024
    expect(fullText(tree)).toContain('December');
    expect(fullText(tree)).toContain('2024');
    for (let i = 0; i < 14; i++) prev();
    expect(fullText(tree)).toContain('2023');
    tree.unmount();
  });

  test('paging forward from an earlier month re-enables and stops at current month', () => {
    const tree = render();
    ReactTestRenderer.act(() => {
      findByLabel(tree, 'Previous month').props.onPress();
    });
    ReactTestRenderer.act(() => {
      findByLabel(tree, 'Next month').props.onPress();
    });
    expect(fullText(tree)).toContain('June');
    expect(findByLabel(tree, 'Next month').props.disabled).toBe(true);
    tree.unmount();
  });

  test('fire health label renders only when fireHealth.visible is true', () => {
    const hidden: FireHealthState = { visible: false, label: 'Steady' } as FireHealthState;
    const shown: FireHealthState = { visible: true, label: 'Bright' } as FireHealthState;

    const treeHidden = render({ fireHealth: hidden });
    expect(fullText(treeHidden)).not.toContain('Bright');
    expect(fullText(treeHidden)).not.toContain('Steady');
    treeHidden.unmount();

    const treeShown = render({ fireHealth: shown });
    expect(fullText(treeShown)).toContain('Bright');
    treeShown.unmount();
  });

  test('produces day cells for the month and blank leading cells with null props', () => {
    const tree = render();
    const cells = tree.root.findAll(
      n => n.props.dateKey !== undefined && n.props.dayNumber !== undefined,
    );
    const blanks = cells.filter(n => n.props.dateKey === null);
    const days = cells.filter(n => typeof n.props.dateKey === 'string');
    // June 2025 starts on a Sunday, so there are no leading blanks but 30 real days.
    expect(days.length).toBe(30);
    expect(days[0].props.dateKey).toBe('2025-06-01');
    expect(days[0].props.dayNumber).toBe(1);
    blanks.forEach(b => {
      expect(b.props.dayNumber).toBeNull();
      expect(b.props.kind).toBeNull();
    });
    tree.unmount();
  });
});

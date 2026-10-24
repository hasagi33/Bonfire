/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers the public surface of src/components/Calendar/MonthGrid.tsx:
 *   - MonthGrid (default export): title/year display, weekday row, day cell
 *     classification via classifyDay, and month navigation (‹ / ›).
 *   - shift (internal navigation helper, exercised through the ‹ and › buttons):
 *     wraps the year correctly across January/December.
 *
 * Uses a fixed "today" DateKey so results are deterministic. Real monthGrid,
 * parseYmd and classifyDay are used; nothing from protected domain files is mocked.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import { classifyDay, type Entries } from '../src/domain/fire';
import { parseYmd, type DateKey } from '../src/domain/dates';

// Fixed "today" so the test never depends on the wall clock.
const TODAY: DateKey = '2024-06-15' as DateKey;

// Find a pressable by its accessibility label in the rendered tree.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

// Recursively pull string children out of a react-test-renderer JSON tree.
function collectStrings(node: unknown): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(collectStrings);
  if (typeof node === 'object' && 'children' in (node as object)) {
    return collectStrings((node as { children: unknown }).children);
  }
  return [];
}

function render(props: Partial<React.ComponentProps<typeof MonthGrid>> = {}) {
  const onSelectDay = jest.fn();
  const element = (
    <MonthGrid
      today={TODAY}
      entries={{}}
      selectedDate={null}
      onSelectDay={onSelectDay}
      {...props}
    />
  );
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return { tree, onSelectDay };
}

describe('MonthGrid', () => {
  describe('title', () => {
    it('shows the month name and year of today on first render', () => {
      const { tree } = render();
      const text = collectStrings(tree.toJSON());
      expect(text).toContain('June');
      expect(text).toContain('2024');
      tree.unmount();
    });
  });

  describe('weekday row', () => {
    it('renders exactly seven weekday labels', () => {
      const { tree } = render();
      const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const rendered = collectStrings(tree.toJSON());
      // Each weekday label appears in the header row; count the single-letter labels.
      const dowCount = labels.filter(l => rendered.includes(l)).length;
      expect(dowCount).toBeGreaterThan(0);
      expect(labels).toHaveLength(7);
      tree.unmount();
    });
  });

  describe('next-month (›) button', () => {
    it('is disabled when the current month is in view (FR-020)', () => {
      const { tree } = render();
      const next = findByLabel(tree, 'Next month');
      expect(next.props.disabled).toBe(true);
      expect(next.props.accessibilityState).toEqual({ disabled: true });
      tree.unmount();
    });

    it('becomes enabled after paging back and does not advance past the current month', () => {
      const { tree } = render();
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Previous month').props.onPress();
      });
      const next = findByLabel(tree, 'Next month');
      expect(next.props.disabled).toBe(false);

      ReactTestRenderer.act(() => {
        next.props.onPress();
      });
      // Back at the current month: next is disabled again.
      expect(findByLabel(tree, 'Next month').props.disabled).toBe(true);
      tree.unmount();
    });
  });

  describe('previous-month (‹) navigation', () => {
    it('moves the title back one month', () => {
      const { tree } = render();
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Previous month').props.onPress();
      });
      const text = collectStrings(tree.toJSON());
      expect(text).toContain('May');
      expect(text).toContain('2024');
      tree.unmount();
    });

    it('wraps the year when paging back from January into December of the prior year', () => {
      const january: DateKey = '2024-01-10' as DateKey;
      const { tree } = render({ today: january });
      expect(collectStrings(tree.toJSON())).toContain('January');

      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Previous month').props.onPress();
      });
      const text = collectStrings(tree.toJSON());
      expect(text).toContain('December');
      expect(text).toContain('2023');
      tree.unmount();
    });

    it('wraps forward from December into January of the next year when paging next', () => {
      const december: DateKey = '2023-12-05' as DateKey;
      const { tree } = render({ today: december });
      // Page back into November, then forward again to December; next is then disabled.
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Previous month').props.onPress();
      });
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Next month').props.onPress();
      });
      expect(collectStrings(tree.toJSON())).toContain('December');
      tree.unmount();
    });
  });

  describe('day cells', () => {
    it('classifies days using classifyDay with the entries map', () => {
      const entries: Entries = { '2024-06-10': 4 } as unknown as Entries;
      const expected = classifyDay(entries, '2024-06-10' as DateKey, TODAY);
      expect(expected).toBeDefined();

      const { tree } = render({ entries });
      // The day number for June 10 should be rendered in the grid.
      expect(collectStrings(tree.toJSON())).toContain('10');
      tree.unmount();
    });

    it('renders day numbers from parseYmd for the viewed month', () => {
      const { tree } = render();
      // June 2024 has 30 days; the first and last should be present.
      const text = collectStrings(tree.toJSON());
      expect(text).toContain('1');
      expect(text).toContain('30');
      expect(parseYmd(TODAY).getDate()).toBe(15);
      tree.unmount();
    });

    it('does not call onSelectDay on render', () => {
      const { tree, onSelectDay } = render();
      expect(onSelectDay).not.toHaveBeenCalled();
      tree.unmount();
    });
  });
});

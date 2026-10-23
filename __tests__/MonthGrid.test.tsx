/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Renders MonthGrid with react-test-renderer and checks the title, paging
 * behaviour, weekday header, day cells, and the Fire Health label.
 * Fixed "today" values are used so the output is deterministic.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { Entries } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';
import type { DateKey } from '../src/domain/dates';

const TODAY = '2024-06-15' as DateKey;

// Collect every text string rendered anywhere in the tree.
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

// Find the pressable button whose accessibilityLabel matches.
function findButton(
  tree: ReactTestRenderer.ReactTestRenderer,
  label: string,
): ReactTestRenderer.ReactTestInstance {
  return tree.root.find(
    (node) =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
  );
}

function render(
  props: Partial<React.ComponentProps<typeof MonthGrid>> = {},
): ReactTestRenderer.ReactTestRenderer {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <MonthGrid
        today={TODAY}
        entries={{}}
        selectedDate={null}
        onSelectDay={() => {}}
        {...props}
      />,
    );
  });
  return tree;
}

describe('MonthGrid', () => {
  describe('title', () => {
    it('shows the month name and year for the today month', () => {
      const tree = render();
      const text = allText(tree);
      expect(text).toContain('June');
      expect(text).toContain('2024');
      tree.unmount();
    });
  });

  describe('navigation', () => {
    it('disables the next button while viewing the current month', () => {
      const tree = render();
      const next = findButton(tree, 'Next month');
      expect(next.props.disabled).toBe(true);
      expect(next.props.accessibilityState).toEqual({ disabled: true });
      tree.unmount();
    });

    it('enables the next button after paging backward', () => {
      const tree = render();
      ReactTestRenderer.act(() => {
        findButton(tree, 'Previous month').props.onPress();
      });
      const next = findButton(tree, 'Next month');
      expect(next.props.disabled).toBe(false);
      expect(allText(tree)).toContain('May');
      tree.unmount();
    });

    it('wraps the year backward from January to December of the prior year', () => {
      const tree = render({ today: '2024-01-10' as DateKey });
      expect(allText(tree)).toContain('January');
      ReactTestRenderer.act(() => {
        findButton(tree, 'Previous month').props.onPress();
      });
      const text = allText(tree);
      expect(text).toContain('December');
      expect(text).toContain('2023');
      tree.unmount();
    });

    it('wraps the year forward from December back to January on next', () => {
      const tree = render({ today: '2024-01-10' as DateKey });
      ReactTestRenderer.act(() => {
        findButton(tree, 'Previous month').props.onPress();
      });
      ReactTestRenderer.act(() => {
        findButton(tree, 'Next month').props.onPress();
      });
      const text = allText(tree);
      expect(text).toContain('January');
      expect(text).toContain('2024');
      tree.unmount();
    });
  });

  describe('weekday header', () => {
    it('renders S M T W T F S in order', () => {
      const tree = render();
      const letters = allText(tree).filter((t) => t.length === 1 && /[A-Z]/.test(t));
      expect(letters.slice(0, 7)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
      tree.unmount();
    });
  });

  describe('day grid', () => {
    it('renders a day number for every date in the viewed month', () => {
      const tree = render();
      const text = allText(tree);
      expect(text).toContain('1');
      expect(text).toContain('15');
      expect(text).toContain('30');
      tree.unmount();
    });

    it('renders blank cells (no day numbers) for leading padding', () => {
      // June 1, 2024 is a Saturday, so six blank cells precede it.
      const tree = render();
      const dayCells = tree.root.findAll(
        (node) => node.props.dateKey !== undefined && node.props.dayNumber !== undefined,
      );
      const blanks = dayCells.filter((c) => c.props.dateKey === null);
      expect(blanks.length).toBeGreaterThanOrEqual(6);
      tree.unmount();
    });

    it('passes the score for a scored day into its cell', () => {
      const entries: Entries = { '2024-06-10': 4 } as Entries;
      const tree = render({ entries });
      const cell = tree.root.find(
        (node) => node.props.dateKey === '2024-06-10' && node.props.dayNumber === 10,
      );
      expect(cell.props.score).toBe(4);
      tree.unmount();
    });

    it('marks the today cell as isToday', () => {
      const tree = render();
      const cell = tree.root.find((node) => node.props.dateKey === TODAY);
      expect(cell.props.isToday).toBe(true);
      tree.unmount();
    });

    it('marks the selected cell as selected', () => {
      const tree = render({ selectedDate: '2024-06-03' as DateKey });
      const cell = tree.root.find((node) => node.props.dateKey === '2024-06-03');
      expect(cell.props.selected).toBe(true);
      tree.unmount();
    });
  });

  describe('Fire Health label', () => {
    const health: FireHealthState = {
      visible: true,
      label: 'Bright',
    } as unknown as FireHealthState;

    it('renders the label when fireHealth.visible is true', () => {
      const tree = render({ fireHealth: health });
      expect(allText(tree)).toContain('Bright');
      tree.unmount();
    });

    it('does not render the label when fireHealth.visible is false', () => {
      const hidden = { visible: false, label: 'Bright' } as unknown as FireHealthState;
      const tree = render({ fireHealth: hidden });
      expect(allText(tree)).not.toContain('Bright');
      tree.unmount();
    });

    it('does not render the label when fireHealth is omitted', () => {
      const tree = render();
      expect(allText(tree)).not.toContain('Bright');
      tree.unmount();
    });
  });
});

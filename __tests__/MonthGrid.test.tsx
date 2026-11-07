/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: the initial view matching the injected "today", the "Next month"
 * button being disabled on the current month, paging backward and forward,
 * year rollover (January <-> December), the seven-label weekday header, and
 * the fire health label appearing only when `fireHealth.visible` is true.
 *
 * The component is presentational, so no storage mocks are needed. "today" is
 * a fixed ISO local date key so the output never depends on the wall clock.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from './MonthGrid';
import type { Entries } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';
import type { DateKey } from '../../domain/dates';

// A fixed "today" so every assertion is deterministic.
const TODAY = '2024-06-15' as DateKey;
const NO_ENTRIES: Entries = {};

// Render helper: mounts MonthGrid inside act() and returns the renderer.
function render(
  props: Partial<React.ComponentProps<typeof MonthGrid>> = {},
): ReactTestRenderer.ReactTestRenderer {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(
      <MonthGrid
        today={TODAY}
        entries={NO_ENTRIES}
        selectedDate={null}
        onSelectDay={() => {}}
        {...props}
      />,
    );
  });
  return renderer;
}

// Collect every host Text node's string content, in render order.
function allText(renderer: ReactTestRenderer.ReactTestRenderer): string[] {
  return renderer.root
    .findAllByType('Text' as unknown as React.ElementType)
    .map(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    });
}

// Find a pressable by its accessibility label and return its element.
function findButton(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
): ReactTestRenderer.ReactTestInstance {
  return renderer.root.find(
    node => node.props.accessibilityLabel === label && node.props.accessibilityRole === 'button',
  );
}

// Press a button inside act(), mirroring a user tap.
function press(renderer: ReactTestRenderer.ReactTestRenderer, label: string): void {
  const button = findButton(renderer, label);
  ReactTestRenderer.act(() => {
    button.props.onPress();
  });
}

// Read the current title's month name and year out of the rendered tree.
function currentTitle(renderer: ReactTestRenderer.ReactTestRenderer): string {
  const titleNode = renderer.root.findAll(
    node => node.props.style && node.props.style.fontSize === 17 && node.props.style.fontWeight === '700',
  )[0];
  const children = titleNode.props.children;
  // Title is "{MONTH} <Text>{YEAR}</Text>", so children is [monthName, <Text/>].
  const month = children[0];
  const yearNode = children[1];
  return `${month} ${yearNode.props.children}`;
}

describe('MonthGrid', () => {
  describe('initial view', () => {
    it('shows the month and year of the injected today value', () => {
      const renderer = render();
      expect(currentTitle(renderer)).toBe('June 2024');
      renderer.unmount();
    });

    it('renders a seven-label weekday header', () => {
      const renderer = render();
      const labels = allText(renderer).filter(t => t.length === 1 && 'SMTWF'.includes(t));
      // The header contributes exactly seven single-letter labels: S M T W T F S.
      expect(labels).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
      renderer.unmount();
    });
  });

  describe('next month control', () => {
    it('is disabled while the current month is in view', () => {
      const renderer = render();
      const next = findButton(renderer, 'Next month');
      expect(next.props.disabled).toBe(true);
      expect(next.props.accessibilityState).toEqual({ disabled: true });
      renderer.unmount();
    });

    it('is re-enabled after paging back, and returns to the current month when pressed', () => {
      const renderer = render();
      press(renderer, 'Previous month');
      expect(currentTitle(renderer)).toBe('May 2024');
      expect(findButton(renderer, 'Next month').props.disabled).toBe(false);

      press(renderer, 'Next month');
      expect(currentTitle(renderer)).toBe('June 2024');
      expect(findButton(renderer, 'Next month').props.disabled).toBe(true);
      renderer.unmount();
    });

    it('does not advance past the current month when pressed while disabled', () => {
      const renderer = render();
      const next = findButton(renderer, 'Next month');
      ReactTestRenderer.act(() => {
        next.props.onPress();
      });
      expect(currentTitle(renderer)).toBe('June 2024');
      renderer.unmount();
    });
  });

  describe('previous month navigation', () => {
    it('moves the view back one month per press', () => {
      const renderer = render();
      press(renderer, 'Previous month');
      expect(currentTitle(renderer)).toBe('May 2024');
      press(renderer, 'Previous month');
      expect(currentTitle(renderer)).toBe('April 2024');
      renderer.unmount();
    });

    it('rolls over from January to December of the prior year', () => {
      const januaryToday = '2024-01-10' as DateKey;
      const renderer = render({ today: januaryToday });
      expect(currentTitle(renderer)).toBe('January 2024');

      press(renderer, 'Previous month');
      expect(currentTitle(renderer)).toBe('December 2023');
      renderer.unmount();
    });

    it('rolls forward from December to January of the next year when paging ahead', () => {
      const januaryToday = '2024-01-10' as DateKey;
      const renderer = render({ today: januaryToday });
      press(renderer, 'Previous month');
      expect(currentTitle(renderer)).toBe('December 2023');

      press(renderer, 'Next month');
      expect(currentTitle(renderer)).toBe('January 2024');
      expect(findButton(renderer, 'Next month').props.disabled).toBe(true);
      renderer.unmount();
    });
  });

  describe('fire health label', () => {
    it('is shown when fireHealth.visible is true', () => {
      const fireHealth = { visible: true, label: 'Healthy' } as unknown as FireHealthState;
      const renderer = render({ fireHealth });
      expect(allText(renderer)).toContain('Healthy');
      renderer.unmount();
    });

    it('is hidden when fireHealth.visible is false', () => {
      const fireHealth = { visible: false, label: 'Healthy' } as unknown as FireHealthState;
      const renderer = render({ fireHealth });
      expect(allText(renderer)).not.toContain('Healthy');
      renderer.unmount();
    });

    it('is hidden when no fireHealth prop is provided', () => {
      const renderer = render();
      expect(
        renderer.root.findAll(node => node.props.accessibilityLabel?.startsWith('Fire Health')),
      ).toHaveLength(0);
      renderer.unmount();
    });
  });
});

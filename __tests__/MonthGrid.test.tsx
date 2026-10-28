/**
 * MonthGrid.test.tsx — unit tests for the month calendar component.
 *
 * Covers: header title/year for a fixed "today", the disabled next (›) button
 * on the current month, previous-month navigation and year rollover, the
 * seven weekday labels, day selection callbacks with correct DateKeys, and
 * the Fire Health label visibility rule.
 *
 * DayCell is mocked so these tests focus on MonthGrid's own behavior rather
 * than DayCell's rendering. No network, no wall-clock time: today is fixed.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import type { DateKey } from '../src/domain/dates';

// Replace DayCell with a lightweight stub that exposes its props as a host
// element, so tests can inspect dateKey/dayNumber and trigger onPress.
jest.mock('../src/components/Calendar/DayCell', () => {
  const { Pressable: RNPressable, Text: RNText } = jest.requireActual('react-native');
  const MockDayCell = (props: {
    dateKey: string | null;
    dayNumber: number | null;
    onPress?: (key: string) => void;
  }) => (
    <RNPressable
      testID={props.dateKey ? `day-${props.dateKey}` : 'day-blank'}
      accessibilityRole="button"
      onPress={() => {
        if (props.dateKey && props.onPress) {
          props.onPress(props.dateKey);
        }
      }}>
      <RNText>{props.dayNumber === null ? '' : String(props.dayNumber)}</RNText>
    </RNPressable>
  );
  return { __esModule: true, default: MockDayCell };
});

// Fixed "today" so the rendered month and disabled state are deterministic.
const TODAY: DateKey = '2025-06-15' as DateKey;

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

// Collect rendered text content from every Text node, flattening nested
// children so the month title (which nests a year Text) is readable as a
// single string like "June 2025".
function textOf(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return '';
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(textOf).join('');
  }
  if (React.isValidElement(node)) {
    return textOf((node.props as { children?: unknown }).children);
  }
  return '';
}

function allText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(Text)
    .map(t => textOf(t.props.children));
}

// Find the Pressable nav button by its accessibility label. Matches on the
// host-level props of the rendered Pressable (type is the composite component,
// so we compare by accessibilityLabel alone and require it is a Pressable).
function navButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    n => n.props.accessibilityLabel === label && n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function',
  );
}

describe('MonthGrid header', () => {
  test('shows the month name and year for the fixed today value', () => {
    const { tree } = render();
    const texts = allText(tree);
    expect(texts).toContain('June 2025');
  });

  test('shows the Fire Health label only when fireHealth.visible is true', () => {
    const hidden = render({
      fireHealth: { visible: false, label: 'Healthy' } as never,
    });
    expect(allText(hidden.tree)).not.toContain('Healthy');

    const shown = render({
      fireHealth: { visible: true, label: 'Healthy' } as never,
    });
    expect(allText(shown.tree)).toContain('Healthy');
  });

  test('omits the Fire Health label when fireHealth is not provided', () => {
    const { tree } = render();
    expect(
      tree.root.findAll(n => n.props.accessibilityLabel === 'Fire Health undefined'),
    ).toHaveLength(0);
  });
});

describe('MonthGrid navigation', () => {
  test('next button is disabled and reports disabled state on the current month', () => {
    const { tree } = render();
    const next = navButton(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  test('pressing previous shifts the view back one month and enables next', () => {
    const { tree } = render();
    ReactTestRenderer.act(() => {
      navButton(tree, 'Previous month').props.onPress();
    });
    expect(allText(tree)).toContain('May 2025');
    const next = navButton(tree, 'Next month');
    expect(next.props.disabled).toBe(false);
    expect(next.props.accessibilityState).toEqual({ disabled: false });
  });

  test('pressing next after going back returns to the current month and disables next again', () => {
    const { tree } = render();
    ReactTestRenderer.act(() => {
      navButton(tree, 'Previous month').props.onPress();
    });
    ReactTestRenderer.act(() => {
      navButton(tree, 'Next month').props.onPress();
    });
    expect(allText(tree)).toContain('June 2025');
    expect(navButton(tree, 'Next month').props.disabled).toBe(true);
  });

  test('going back across January rolls the year over to the previous year', () => {
    const { tree } = render({ today: '2025-01-10' as DateKey });
    ReactTestRenderer.act(() => {
      navButton(tree, 'Previous month').props.onPress();
    });
    expect(allText(tree)).toContain('December 2024');
  });

  test('going forward across December rolls the year over to the next year', () => {
    const { tree } = render({ today: '2025-01-10' as DateKey });
    // Step back to December 2024, then forward to January 2025 (current month).
    ReactTestRenderer.act(() => {
      navButton(tree, 'Previous month').props.onPress();
    });
    ReactTestRenderer.act(() => {
      navButton(tree, 'Next month').props.onPress();
    });
    expect(allText(tree)).toContain('January 2025');
  });
});

describe('MonthGrid weekday row', () => {
  test('renders seven weekday labels', () => {
    const { tree } = render();
    const texts = allText(tree);
    // The weekday row contains seven single-letter labels (S M T W T F S).
    const single = texts.filter(t => t.length === 1 && 'SMTWF'.includes(t));
    expect(single).toHaveLength(7);
  });
});

describe('MonthGrid day selection', () => {
  test('calls onSelectDay with the correct DateKey for a non-null day cell', () => {
    const { tree, onSelectDay } = render();
    ReactTestRenderer.act(() => {
      tree.root.findByProps({ testID: 'day-2025-06-10' }).props.onPress();
    });
    expect(onSelectDay).toHaveBeenCalledWith('2025-06-10');
    expect(onSelectDay).toHaveBeenCalledTimes(1);
  });

  test('does not call onSelectDay for blank leading cells', () => {
    const { tree, onSelectDay } = render();
    const blanks = tree.root.findAll(n => n.props.testID === 'day-blank');
    blanks.forEach(b => {
      ReactTestRenderer.act(() => {
        b.props.onPress?.();
      });
    });
    expect(onSelectDay).not.toHaveBeenCalled();
  });
});

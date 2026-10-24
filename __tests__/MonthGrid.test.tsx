/**
 * MonthGrid.test.tsx — unit tests for the month calendar grid.
 *
 * Covers: header month/year from the `today` prop, backward pagination across
 * year boundaries, the disabled "next" control on the current month, day cell
 * props derived from classifyDay, the Fire Health label visibility, and the
 * onSelectDay callback. Uses react-test-renderer only (no testing-library).
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import MonthGrid from '../src/components/Calendar/MonthGrid';
import DayCell from '../src/components/Calendar/DayCell';
import { classifyDay, type Entries } from '../src/domain/fire';
import { monthGrid, parseYmd } from '../src/domain/dates';

const TODAY = '2024-03-15';

/** Finds the rendered DayCell elements (as React elements, not host nodes). */
function getDayCellProps(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAllByType(DayCell).map(node => node.props);
}

/** Returns the title text (month name + year) as a single string. */
function getTitle(tree: ReactTestRenderer.ReactTestRenderer): string {
  const titleNode = tree.root.findAll(
    n => typeof n.type === 'string' && n.type === 'Text' && n.props.style?.fontWeight === '700',
  );
  // The title Text contains the month name followed by a nested year Text.
  const flatten = (children: unknown): string =>
    React.Children.toArray(children as React.ReactNode)
      .map(c => (typeof c === 'string' ? c : typeof c === 'number' ? String(c) : ''))
      .join('');
  return titleNode.map(n => flatten(n.props.children)).join('|');
}

/** Finds a pressable control by its accessibility label. */
function getNavButton(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    n => n.props.accessibilityLabel === label && n.props.accessibilityRole === 'button' && typeof n.props.onPress === 'function' || (n.props.accessibilityLabel === label && n.props.accessibilityRole === 'button'),
  );
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

describe('MonthGrid header', () => {
  it('shows the month and year derived from the today prop', () => {
    const { tree } = render();
    expect(getTitle(tree)).toContain('March');
    expect(getTitle(tree)).toContain('2024');
  });

  it('shows the month and year for a different today value', () => {
    const { tree } = render({ today: '1999-12-31' });
    expect(getTitle(tree)).toContain('December');
    expect(getTitle(tree)).toContain('1999');
  });
});

describe('MonthGrid pagination', () => {
  it('pages backward one month when ‹ is pressed', () => {
    const { tree } = render();
    ReactTestRenderer.act(() => {
      getNavButton(tree, 'Previous month').props.onPress();
    });
    expect(getTitle(tree)).toContain('February');
    expect(getTitle(tree)).toContain('2024');
  });

  it('crosses the year boundary backward from January to December', () => {
    const { tree } = render({ today: '2024-01-10' });
    ReactTestRenderer.act(() => {
      getNavButton(tree, 'Previous month').props.onPress();
    });
    expect(getTitle(tree)).toContain('December');
    expect(getTitle(tree)).toContain('2023');
  });

  it('allows paging backward without limit across several years', () => {
    const { tree } = render({ today: '2024-03-15' });
    const prev = () =>
      ReactTestRenderer.act(() => {
        getNavButton(tree, 'Previous month').props.onPress();
      });
    for (let i = 0; i < 30; i++) prev();
    // 30 months before March 2024 is September 2021.
    expect(getTitle(tree)).toContain('September');
    expect(getTitle(tree)).toContain('2021');
  });

  it('keeps the next control disabled while viewing the current month', () => {
    const { tree } = render();
    const next = getNavButton(tree, 'Next month');
    expect(next.props.disabled).toBe(true);
    expect(next.props.accessibilityState).toEqual({ disabled: true });
  });

  it('does not move forward when next is pressed on the current month', () => {
    const { tree } = render();
    ReactTestRenderer.act(() => {
      getNavButton(tree, 'Next month').props.onPress();
    });
    expect(getTitle(tree)).toContain('March');
    expect(getTitle(tree)).toContain('2024');
  });

  it('enables next once paged back and returns to the current month', () => {
    const { tree } = render();
    ReactTestRenderer.act(() => {
      getNavButton(tree, 'Previous month').props.onPress();
    });
    const next = getNavButton(tree, 'Next month');
    expect(next.props.disabled).toBe(false);

    ReactTestRenderer.act(() => {
      next.props.onPress();
    });
    expect(getTitle(tree)).toContain('March');
    expect(getNavButton(tree, 'Next month').props.disabled).toBe(true);
  });
});

describe('MonthGrid day cells', () => {
  it('renders one cell per grid slot, including blank leading/trailing slots', () => {
    const { tree } = render();
    const expected = monthGrid(2024, 2); // March 2024, zero-based month 2
    const cells = getDayCellProps(tree);
    expect(cells).toHaveLength(expected.length);
  });

  it('passes dateKey, dayNumber and kind derived from classifyDay', () => {
    const entries: Entries = { '2024-03-10': 3 as never };
    const { tree } = render({ entries });
    const cells = getDayCellProps(tree);

    const scored = cells.find(c => c.dateKey === '2024-03-10');
    expect(scored).toBeDefined();
    expect(scored?.dayNumber).toBe(10);
    expect(scored?.kind).toBe(classifyDay(entries, '2024-03-10', TODAY));
    expect(scored?.score).toBe(3);
  });

  it('renders blank slots with null key, number and kind', () => {
    const { tree } = render();
    const blanks = getDayCellProps(tree).filter(c => c.dateKey === null);
    for (const blank of blanks) {
      expect(blank.dayNumber).toBeNull();
      expect(blank.kind).toBeNull();
    }
  });

  it('marks the today cell and sets dayNumber from the parsed key', () => {
    const { tree } = render();
    const todayCell = getDayCellProps(tree).find(c => c.dateKey === TODAY);
    expect(todayCell?.isToday).toBe(true);
    expect(todayCell?.dayNumber).toBe(parseYmd(TODAY).getDate());
  });

  it('marks only the selected date as selected', () => {
    const { tree } = render({ selectedDate: '2024-03-05' });
    const selected = getDayCellProps(tree).filter(c => c.selected === true);
    expect(selected).toHaveLength(1);
    expect(selected[0].dateKey).toBe('2024-03-05');
  });

  it('invokes onSelectDay with the pressed date key', () => {
    const { tree, onSelectDay } = render();
    const cell = getDayCellProps(tree).find(c => c.dateKey === '2024-03-07');
    ReactTestRenderer.act(() => {
      cell?.onPress('2024-03-07');
    });
    expect(onSelectDay).toHaveBeenCalledTimes(1);
    expect(onSelectDay).toHaveBeenCalledWith('2024-03-07');
  });
});

describe('MonthGrid Fire Health label', () => {
  it('renders the health label when fireHealth.visible is true', () => {
    const { tree } = render({
      fireHealth: { visible: true, label: 'Bright' } as never,
    });
    const labels = tree.root.findAll(n => n.props.accessibilityLabel === 'Fire Health Bright');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('does not render the health label when fireHealth.visible is false', () => {
    const { tree } = render({
      fireHealth: { visible: false, label: 'Faint' } as never,
    });
    const labels = tree.root.findAll(n => n.props.accessibilityLabel === 'Fire Health Faint');
    expect(labels).toHaveLength(0);
  });

  it('renders no health label when fireHealth is omitted', () => {
    const { tree } = render();
    const labels = tree.root.findAll(
      n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Fire Health'),
    );
    expect(labels).toHaveLength(0);
  });
});

/**
 * DayCell.test.tsx — unit tests for the month-grid day cell.
 *
 * Covers the DayCell component (blank, future, missed, today, scored,
 * scored+today, selected) and the accessibilityLabel contract via the
 * rendered accessibilityLabel prop.
 *
 * Tests are deterministic: no network, no real clock, no storage. All
 * rendering goes through react-test-renderer and the jest-expo preset.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text, View } from 'react-native';
import DayCell from '../src/components/Calendar/DayCell';
import type { DayKind, Score } from '../src/domain/fire';
import { amber, core, heatStyle } from '../src/theme/tokens';

// Helper: flatten a style prop (nested arrays / falsy values) into one plain
// object so assertions can check individual properties.
function flatten(style: unknown): Record<string, unknown> {
  return StyleSheet.flatten(style as never) as Record<string, unknown>;
}

// Helper: render a DayCell and return the test renderer.
function render(props: Partial<React.ComponentProps<typeof DayCell>> = {}) {
  const defaults = {
    dateKey: '2024-03-10',
    dayNumber: 10,
    kind: 'missed' as DayKind,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<DayCell {...defaults} {...props} />);
  });
  return tree;
}

// Helper: the tappable wrapper. DayCell renders a Pressable, which in the
// jest-expo environment is a host View carrying the accessibility props, so
// we locate it by its accessibilityRole rather than by component type.
function getPressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    (n) => n.props.accessibilityRole === 'button' && typeof n.props.onPress !== 'undefined'
      || (n.props.accessibilityRole === 'button' && n.props.accessibilityState?.disabled !== undefined),
  );
}

// Helper: collect every text string rendered inside the cell.
function textOf(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root.findAllByType(Text).map((n) => n.children.join(''));
}

// Helper: count the pip dots rendered under a scored day (3x3, radius 2).
function countPips(tree: ReactTestRenderer.ReactTestRenderer): number {
  const pipViews = tree.root.findAll((n) => {
    if (n.type !== View) return false;
    const s = flatten(n.props.style);
    return s.width === 3 && s.height === 3 && s.borderRadius === 2;
  });
  return pipViews.length;
}

describe('DayCell — blank padding cell', () => {
  it('renders an invisible padding View with no Pressable when dateKey is null', () => {
    const tree = render({ dateKey: null, dayNumber: null, kind: null });
    expect(
      tree.root.findAll((n) => n.props.accessibilityRole === 'button'),
    ).toHaveLength(0);
    expect(tree.root.findAllByType(View).length).toBeGreaterThan(0);
  });

  it('renders no day number for a blank cell', () => {
    const tree = render({ dateKey: null, dayNumber: null, kind: null });
    expect(textOf(tree)).toEqual([]);
  });

  it('renders a padding cell when only kind is null', () => {
    const tree = render({ dateKey: '2024-03-10', dayNumber: 10, kind: null });
    expect(
      tree.root.findAll((n) => n.props.accessibilityRole === 'button'),
    ).toHaveLength(0);
  });
});

describe('DayCell — future day', () => {
  it('is disabled and not tappable', () => {
    const tree = render({ kind: 'future' });
    const pressable = getPressable(tree);
    expect(pressable.props.accessibilityState.disabled).toBe(true);
    expect(pressable.props.onPress).toBeUndefined();
  });

  it('does not call onPress when pressed', () => {
    const onPress = jest.fn();
    const tree = render({ kind: 'future', onPress });
    expect(getPressable(tree).props.onPress).toBeUndefined();
    expect(onPress).not.toHaveBeenCalled();
  });

  it('exposes a future accessibility label', () => {
    const tree = render({ kind: 'future', dateKey: '2024-03-20' });
    expect(getPressable(tree).props.accessibilityLabel).toBe('2024-03-20, future');
  });
});

describe('DayCell — missed day', () => {
  it('renders the hollow dot under the day', () => {
    const tree = render({ kind: 'missed' });
    const dots = tree.root.findAll((n) => {
      if (n.type !== View) return false;
      const s = flatten(n.props.style);
      return s.width === 5 && s.height === 5 && s.borderRadius === 3;
    });
    expect(dots).toHaveLength(1);
  });

  it('renders no heat pips', () => {
    const tree = render({ kind: 'missed' });
    expect(countPips(tree)).toBe(0);
  });

  it('is tappable and passes its dateKey to onPress', () => {
    const onPress = jest.fn();
    const tree = render({ kind: 'missed', dateKey: '2024-03-05', onPress });
    expect(getPressable(tree).props.accessibilityState.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      getPressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('2024-03-05');
  });

  it('exposes a missed accessibility label', () => {
    const tree = render({ kind: 'missed', dateKey: '2024-03-05' });
    expect(getPressable(tree).props.accessibilityLabel).toBe('2024-03-05, missed');
  });
});

describe('DayCell — today (unscored)', () => {
  it('applies the amber today ring', () => {
    const tree = render({ kind: 'today', isToday: true, dateKey: '2024-03-10' });
    const ring = tree.root.findAll((n) => {
      if (n.type !== View) return false;
      return flatten(n.props.style).borderColor === amber;
    });
    expect(ring.length).toBeGreaterThan(0);
  });

  it('renders no heat pips', () => {
    const tree = render({ kind: 'today', isToday: true });
    expect(countPips(tree)).toBe(0);
  });

  it('is tappable and passes its dateKey to onPress', () => {
    const onPress = jest.fn();
    const tree = render({ kind: 'today', isToday: true, dateKey: '2024-03-10', onPress });
    expect(getPressable(tree).props.accessibilityState.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      getPressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith('2024-03-10');
  });

  it('exposes a today accessibility label', () => {
    const tree = render({ kind: 'today', isToday: true, dateKey: '2024-03-10' });
    expect(getPressable(tree).props.accessibilityLabel).toBe(
      '2024-03-10, today, not yet logged',
    );
  });
});

describe('DayCell — scored day', () => {
  const scores: Score[] = [1, 2, 3, 4, 5];

  it.each(scores)('renders exactly %i pip(s) for a score of %i', (score) => {
    const tree = render({ kind: 'scored', score, dateKey: '2024-03-09' });
    expect(countPips(tree)).toBe(score);
  });

  it('applies the heat background from the theme token', () => {
    const score: Score = 4;
    const tree = render({ kind: 'scored', score });
    const expected = heatStyle(score).background;
    const filled = tree.root.findAll((n) => {
      if (n.type !== View) return false;
      return flatten(n.props.style).backgroundColor === expected;
    });
    expect(filled.length).toBeGreaterThan(0);
  });

  it('colors the day number from the heat token', () => {
    const score: Score = 5;
    const tree = render({ kind: 'scored', score });
    const expected = heatStyle(score).color;
    const numbers = tree.root.findAll(
      (n) => n.type === Text && flatten(n.props.style).color === expected,
    );
    expect(numbers.length).toBeGreaterThan(0);
  });

  it('is tappable and passes its dateKey to onPress', () => {
    const onPress = jest.fn();
    const tree = render({ kind: 'scored', score: 3, dateKey: '2024-03-07', onPress });
    expect(getPressable(tree).props.accessibilityState.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      getPressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith('2024-03-07');
  });

  it('exposes a scored accessibility label including the score', () => {
    const tree = render({ kind: 'scored', score: 2, dateKey: '2024-03-07' });
    expect(getPressable(tree).props.accessibilityLabel).toBe(
      '2024-03-07, scored 2 out of 5',
    );
  });

  it('renders no pips when score is undefined', () => {
    const tree = render({ kind: 'scored', score: undefined });
    expect(countPips(tree)).toBe(0);
  });
});

describe('DayCell — scored + today', () => {
  it('applies the bright core ring on top of the heat fill', () => {
    const tree = render({ kind: 'scored', score: 4, isToday: true });
    const ring = tree.root.findAll((n) => {
      if (n.type !== View) return false;
      const s = flatten(n.props.style);
      return s.borderColor === core && s.borderWidth === 2;
    });
    expect(ring.length).toBeGreaterThan(0);
  });

  it('still renders the correct number of pips', () => {
    const tree = render({ kind: 'scored', score: 5, isToday: true });
    expect(countPips(tree)).toBe(5);
  });

  it('remains tappable', () => {
    const onPress = jest.fn();
    const tree = render({
      kind: 'scored',
      score: 5,
      isToday: true,
      dateKey: '2024-03-10',
      onPress,
    });
    expect(getPressable(tree).props.accessibilityState.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      getPressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith('2024-03-10');
  });
});

describe('DayCell — selected state', () => {
  it('applies the selected core ring', () => {
    const tree = render({ kind: 'missed', selected: true });
    const ring = tree.root.findAll((n) => {
      if (n.type !== View) return false;
      const s = flatten(n.props.style);
      return s.borderColor === core && s.borderWidth === 2;
    });
    expect(ring.length).toBeGreaterThan(0);
  });

  it('reports selected in accessibilityState', () => {
    const tree = render({ kind: 'scored', score: 1, selected: true });
    expect(getPressable(tree).props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
  });

  it('reports not selected when the prop is absent', () => {
    const tree = render({ kind: 'missed' });
    expect(getPressable(tree).props.accessibilityState.selected).toBeFalsy();
  });
});

describe('DayCell — accessibility', () => {
  it('uses the button role on every tappable cell', () => {
    const tree = render({ kind: 'missed' });
    expect(getPressable(tree).props.accessibilityRole).toBe('button');
  });

  it('reports disabled for future days', () => {
    const tree = render({ kind: 'future' });
    expect(getPressable(tree).props.accessibilityState.disabled).toBe(true);
  });
});

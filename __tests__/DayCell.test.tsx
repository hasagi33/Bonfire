/**
 * DayCell.test.tsx — unit tests for the month-grid day cell.
 *
 * Covers every DayKind variant (blank, future, missed, today, scored), the
 * tappable/non-tappable rules, score pip rendering, the scored-today ring,
 * and the accessibilityLabel() helper output.
 *
 * Uses react-test-renderer (no network, no wall-clock time) so every
 * assertion is deterministic.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, StyleSheet, View } from 'react-native';
import DayCell from '../src/components/Calendar/DayCell';
import type { DayKind, Score } from '../src/domain/fire';
import { amber, core } from '../src/theme/tokens';

// Fixed local date key so the tests never depend on the real clock.
const DATE_KEY = '2024-05-10';

interface RenderOptions {
  dateKey?: string | null;
  dayNumber?: number | null;
  kind?: DayKind | null;
  score?: Score;
  isToday?: boolean;
  selected?: boolean;
  onPress?: (dateKey: string) => void;
}

// Renders a DayCell with sensible defaults and returns the test renderer.
function render(options: RenderOptions = {}): ReactTestRenderer.ReactTestRenderer {
  const props = {
    dateKey: DATE_KEY,
    dayNumber: 10,
    kind: 'missed' as DayKind | null,
    ...options,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<DayCell {...props} />);
  });
  return tree;
}

// Returns the outer Pressable instance (the element that carries a11y props).
function getPressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findByType(Pressable);
}

// Flattens a style prop (which may be nested arrays) into one object.
function flatten(style: unknown): Record<string, unknown> {
  return StyleSheet.flatten(style as never) as Record<string, unknown>;
}

// Returns the inner visible square View (the one with the `real` style).
function getRealView(tree: ReactTestRenderer.ReactTestRenderer) {
  const pressable = getPressable(tree);
  // The first View child rendered by the Pressable's render function is the square.
  return pressable.findAll((node) => node.type === View)[0];
}

describe('DayCell', () => {
  describe('blank padding cell', () => {
    it('renders only an empty View when dateKey is null', () => {
      const tree = render({ dateKey: null, kind: null, dayNumber: null });
      expect(tree.root.findAllByType(Pressable)).toHaveLength(0);
      expect(tree.toJSON()).toEqual(expect.objectContaining({ type: 'View' }));
    });

    it('renders an empty View when kind is null even with a dateKey', () => {
      const tree = render({ kind: null, dayNumber: null });
      expect(tree.root.findAllByType(Pressable)).toHaveLength(0);
    });

    it('never calls onPress for a blank cell', () => {
      const onPress = jest.fn();
      const tree = render({ dateKey: null, kind: null, onPress });
      // No Pressable exists, so there is nothing to press.
      expect(tree.root.findAllByType(Pressable)).toHaveLength(0);
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('future day', () => {
    it('is disabled and not tappable', () => {
      const tree = render({ kind: 'future' });
      const pressable = getPressable(tree);
      expect(pressable.props.disabled).toBe(true);
      expect(pressable.props.accessibilityState.disabled).toBe(true);
      expect(pressable.props.onPress).toBeUndefined();
    });

    it('does not call onPress when pressed', () => {
      const onPress = jest.fn();
      const tree = render({ kind: 'future', onPress });
      ReactTestRenderer.act(() => {
        getPressable(tree).props.onPress?.();
      });
      expect(onPress).not.toHaveBeenCalled();
    });

    it('applies the dimmed future style and shows no pips or missed dot', () => {
      const tree = render({ kind: 'future' });
      const real = flatten(getRealView(tree).props.style);
      expect(real.opacity).toBe(0.4);
      expect(tree.root.findAll((n) => n.props.style && flatten(n.props.style).borderRadius === 3)).toHaveLength(0);
    });
  });

  describe('missed day', () => {
    it('is tappable and calls onPress with the dateKey', () => {
      const onPress = jest.fn();
      const tree = render({ kind: 'missed', onPress });
      const pressable = getPressable(tree);
      expect(pressable.props.disabled).toBe(false);
      ReactTestRenderer.act(() => {
        pressable.props.onPress();
      });
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('renders a hollow missed dot', () => {
      const tree = render({ kind: 'missed' });
      const dots = tree.root.findAll(
        (n) => n.type === View && flatten(n.props.style).position === 'absolute' && flatten(n.props.style).width === 5,
      );
      expect(dots).toHaveLength(1);
    });

    it('does not render score pips', () => {
      const tree = render({ kind: 'missed' });
      const pips = tree.root.findAll((n) => flatten(n.props.style).width === 3 && flatten(n.props.style).height === 3);
      expect(pips).toHaveLength(0);
    });
  });

  describe('today (unscored)', () => {
    it('is tappable and applies the amber today ring', () => {
      const tree = render({ kind: 'today', isToday: true });
      expect(getPressable(tree).props.disabled).toBe(false);
      const real = flatten(getRealView(tree).props.style);
      expect(real.borderColor).toBe(amber);
    });

    it('labels the day as today, not yet logged', () => {
      const tree = render({ kind: 'today', isToday: true });
      expect(getPressable(tree).props.accessibilityLabel).toBe(`${DATE_KEY}, today, not yet logged`);
    });
  });

  describe('scored day', () => {
    const scores: Score[] = [1, 2, 3, 4, 5];

    it.each(scores)('renders exactly %i score pip(s)', (score) => {
      const tree = render({ kind: 'scored', score });
      const pips = tree.root.findAll(
        (n) => n.type === View && flatten(n.props.style).width === 3 && flatten(n.props.style).height === 3,
      );
      expect(pips).toHaveLength(score);
    });

    it('is tappable and calls onPress with the dateKey', () => {
      const onPress = jest.fn();
      const tree = render({ kind: 'scored', score: 4, onPress });
      ReactTestRenderer.act(() => {
        getPressable(tree).props.onPress();
      });
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('applies the scored-today ring when isToday is true', () => {
      const tree = render({ kind: 'scored', score: 3, isToday: true });
      const real = flatten(getRealView(tree).props.style);
      expect(real.borderWidth).toBe(2);
      expect(real.borderColor).toBe(core);
    });

    it('does not apply the scored-today ring when isToday is false', () => {
      const tree = render({ kind: 'scored', score: 3, isToday: false });
      const real = flatten(getRealView(tree).props.style);
      expect(real.borderColor).not.toBe(core);
    });

    it('labels the day with its score out of 5', () => {
      const tree = render({ kind: 'scored', score: 5 });
      expect(getPressable(tree).props.accessibilityLabel).toBe(`${DATE_KEY}, scored 5 out of 5`);
    });

    it('falls back to a non-scored look when score is undefined', () => {
      const tree = render({ kind: 'scored', score: undefined });
      const pips = tree.root.findAll(
        (n) => n.type === View && flatten(n.props.style).width === 3 && flatten(n.props.style).height === 3,
      );
      expect(pips).toHaveLength(0);
    });
  });

  describe('selection and accessibility', () => {
    it('reports selected state through accessibilityState', () => {
      const tree = render({ kind: 'missed', selected: true });
      expect(getPressable(tree).props.accessibilityState.selected).toBe(true);
    });

    it('exposes the button role', () => {
      const tree = render({ kind: 'missed' });
      expect(getPressable(tree).props.accessibilityRole).toBe('button');
    });

    it('does not throw when onPress is omitted and the cell is tapped', () => {
      const tree = render({ kind: 'missed' });
      expect(() => {
        ReactTestRenderer.act(() => {
          getPressable(tree).props.onPress();
        });
      }).not.toThrow();
    });
  });
});

describe('accessibilityLabel (via DayCell output)', () => {
  it('describes a future day', () => {
    const tree = render({ kind: 'future' });
    expect(getPressable(tree).props.accessibilityLabel).toBe(`${DATE_KEY}, future`);
  });

  it('describes a missed day', () => {
    const tree = render({ kind: 'missed' });
    expect(getPressable(tree).props.accessibilityLabel).toBe(`${DATE_KEY}, missed`);
  });

  it('describes a scored day with the given score', () => {
    const tree = render({ kind: 'scored', score: 1 });
    expect(getPressable(tree).props.accessibilityLabel).toBe(`${DATE_KEY}, scored 1 out of 5`);
  });
});

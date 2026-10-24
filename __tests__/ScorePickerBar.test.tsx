/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: panel pointer-events gating on dateKey, the formatted date label,
 * score button callbacks and selected state, the Clear button's disabled
 * state, and the controlled note draft passed to DayNoteEditor.
 * Reanimated is mocked so the slide animation renders synchronously, and
 * DayNoteEditor is replaced with a lightweight stub so its internals are
 * out of scope.
 */

import React from 'react';
import { Text, View } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';
import { heatStyle } from '../src/theme/tokens';
import type { DateKey } from '../src/domain/dates';

// Mock Reanimated: the animated values are plain objects and the animated
// view is a passthrough View, so the bar renders synchronously in tests.
jest.mock('react-native-reanimated', () => {
  const { View: RNView } = require('react-native');
  return {
    __esModule: true,
    default: { View: RNView },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// Replace the note editor with a stub that exposes its props for assertions.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text: RNText } = require('react-native');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; value: string }) => (
      <RNText testID="day-note-editor">{`${props.dateKey ?? ''}|${props.value}`}</RNText>
    ),
  };
});

const FIXED_KEY = '2024-03-15' as DateKey; // Friday, Mar 15

function renderBar(overrides: Partial<React.ComponentProps<typeof ScorePickerBar>> = {}) {
  const props = {
    dateKey: FIXED_KEY as DateKey | null,
    currentScore: undefined,
    noteDraft: '',
    onNoteChange: jest.fn(),
    onChoose: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return { tree, props };
}

// Finds a Pressable by its accessibilityLabel (the host View carries it).
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.type === View && node.props.accessibilityLabel === label,
  );
}

// Returns all text strings rendered inside the tree, in order.
function allTexts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(Text)
    .map(n => React.Children.toArray(n.props.children).join(''));
}

describe('ScorePickerBar', () => {
  describe('panel visibility', () => {
    it('is pointer-events none when dateKey is null (closed)', () => {
      const { tree } = renderBar({ dateKey: null });
      const bar = tree.root.findAll(
        node => node.props.pointerEvents !== undefined && node.props.style !== undefined,
      )[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('is pointer-events auto when a dateKey is set (open)', () => {
      const { tree } = renderBar({ dateKey: FIXED_KEY });
      const bar = tree.root.findAll(
        node => node.props.pointerEvents !== undefined && node.props.style !== undefined,
      )[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  describe('date label', () => {
    it('renders the weekday and short month/day for the fixed dateKey', () => {
      const { tree } = renderBar({ dateKey: FIXED_KEY });
      expect(allTexts(tree)).toContain('Fri, Mar 15');
    });

    it('renders an empty label when closed', () => {
      const { tree } = renderBar({ dateKey: null });
      expect(allTexts(tree)).not.toContain('Fri, Mar 15');
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5])('calls onChoose with the numeric score %i', n => {
      const { tree, props } = renderBar();
      ReactTestRenderer.act(() => {
        findByLabel(tree, `Score ${n}`).props.onPress();
      });
      expect(props.onChoose).toHaveBeenCalledTimes(1);
      expect(props.onChoose).toHaveBeenCalledWith(n);
    });

    it('marks only the currently chosen score as selected', () => {
      const { tree } = renderBar({ currentScore: 3 });
      for (const n of [1, 2, 4, 5]) {
        expect(findByLabel(tree, `Score ${n}`).props.accessibilityState).toEqual({
          selected: false,
        });
      }
      expect(findByLabel(tree, 'Score 3').props.accessibilityState).toEqual({
        selected: true,
      });
    });

    it('uses the heat token colors for each button background', () => {
      const { tree } = renderBar();
      for (const n of [1, 2, 3, 4, 5]) {
        const style = findByLabel(tree, `Score ${n}`).props.style;
        const resolved = typeof style === 'function' ? style({ pressed: false }) : style;
        const flat = (Array.isArray(resolved) ? resolved : [resolved]).flat(Infinity);
        const bg = flat.find(
          (s: unknown) => s && typeof s === 'object' && 'backgroundColor' in (s as object),
        ) as { backgroundColor: string } | undefined;
        expect(bg?.backgroundColor).toBe(heatStyle(n).background);
      }
    });
  });

  describe('clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree, props } = renderBar({ currentScore: undefined });
      const clear = findByLabel(tree, "Clear this day's score");
      expect(clear.props.disabled).toBe(true);
      ReactTestRenderer.act(() => {
        clear.props.onPress?.();
      });
      expect(props.onClear).not.toHaveBeenCalled();
    });

    it('is enabled and calls onClear when a score exists', () => {
      const { tree, props } = renderBar({ currentScore: 4 });
      const clear = findByLabel(tree, "Clear this day's score");
      expect(clear.props.disabled).toBe(false);
      ReactTestRenderer.act(() => {
        clear.props.onPress();
      });
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('note editor', () => {
    it('receives the controlled noteDraft value and dateKey', () => {
      const { tree } = renderBar({ dateKey: FIXED_KEY, noteDraft: 'hello' });
      expect(tree.root.findByProps({ testID: 'day-note-editor' }).props.children).toBe(
        `${FIXED_KEY}|hello`,
      );
    });
  });
});

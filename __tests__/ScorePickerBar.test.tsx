/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: the date label helper (labelFor), the Clear button enabled/disabled
 * state, score button presses, the selected accessibility state, the
 * pointer-events gating when the bar is closed/open, the Clear action, and the
 * note-change wiring through DayNoteEditor.
 *
 * react-native-reanimated is replaced with a fully inert in-test stub so no
 * native Worklets runtime is required; animation hooks run synchronously and
 * deterministically. No network, timers, or device state are touched.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import type { Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// --- Reanimated mock -------------------------------------------------------
// Replace the whole module with inert stand-ins. We deliberately do NOT
// require 'react-native-reanimated/mock' because that still pulls in the
// Worklets native initializer, which fails under jest. Shared values are
// plain objects, withTiming returns its target, and the animated style hook
// returns an empty style object.
jest.mock('react-native-reanimated', () => {
  const { createElement } = jest.requireActual('react');
  const View = (props: Record<string, unknown>) =>
    createElement('Animated.View', props);
  return {
    __esModule: true,
    default: { View },
    View,
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: unknown) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// DayNoteEditor is a sibling component with its own tests; stub it here so we
// can assert on the props ScorePickerBar passes through.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { createElement } = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      createElement('DayNoteEditor', props),
  };
});

const SAMPLE_KEY = '2024-03-04' as DateKey; // a Monday in March 2024

interface RenderOverrides {
  dateKey?: DateKey | null;
  currentScore?: Score;
  noteDraft?: string;
  onNoteChange?: (text: string) => void;
  onChoose?: (score: Score) => void;
  onClear?: () => void;
}

// Render the bar with sensible defaults and return the renderer plus spies.
function renderBar(overrides: RenderOverrides = {}) {
  const props = {
    dateKey: SAMPLE_KEY as DateKey | null,
    currentScore: undefined as Score | undefined,
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

// Collect the children of every rendered Text node.
function textContents(tree: ReactTestRenderer.ReactTestRenderer): unknown[] {
  return tree.root.findAllByType(Text).map(node => node.props.children);
}

// Find the score button Pressable by its accessibility label.
function findScoreButton(
  tree: ReactTestRenderer.ReactTestRenderer,
  n: number,
) {
  return tree.root.findByProps({ accessibilityLabel: `Score ${n}` });
}

// Find the Clear button Pressable.
function findClearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findByProps({ accessibilityLabel: "Clear this day's score" });
}

describe('ScorePickerBar', () => {
  describe('date label (labelFor)', () => {
    it('renders a weekday, month and day label for the given dateKey', () => {
      // 2024-03-04 is a Monday, so the label should read "Mon, Mar 4".
      const { tree } = renderBar({ dateKey: SAMPLE_KEY });
      expect(textContents(tree)).toContain('Mon, Mar 4');
    });

    it('renders an empty date label when dateKey is null', () => {
      const { tree } = renderBar({ dateKey: null });
      const texts = textContents(tree);
      expect(texts).toContain('');
      expect(texts).not.toContain('Mon, Mar 4');
    });
  });

  describe('Clear button', () => {
    it('is disabled when the day has no score', () => {
      const { tree } = renderBar({ currentScore: undefined });
      expect(findClearButton(tree).props.disabled).toBe(true);
    });

    it('is enabled when the day has a score', () => {
      const { tree } = renderBar({ currentScore: 3 });
      expect(findClearButton(tree).props.disabled).toBe(false);
    });

    it('calls onClear when pressed', () => {
      const { tree, props } = renderBar({ currentScore: 4 });
      ReactTestRenderer.act(() => {
        findClearButton(tree).props.onPress();
      });
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as const)(
      'calls onChoose with %i when score button %i is pressed',
      n => {
        const { tree, props } = renderBar();
        ReactTestRenderer.act(() => {
          findScoreButton(tree, n).props.onPress();
        });
        expect(props.onChoose).toHaveBeenCalledTimes(1);
        expect(props.onChoose).toHaveBeenCalledWith(n);
      },
    );

    it('renders exactly five score buttons', () => {
      const { tree } = renderBar();
      const buttons = tree.root.findAll(
        node =>
          typeof node.props.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith('Score '),
      );
      // findAll can match both the Pressable and its host node; count unique labels.
      const labels = new Set(buttons.map(b => b.props.accessibilityLabel));
      expect(labels.size).toBe(5);
    });

    it('marks only the currently chosen score as selected', () => {
      const { tree } = renderBar({ currentScore: 2 });
      expect(findScoreButton(tree, 2).props.accessibilityState).toEqual({
        selected: true,
      });
      for (const n of [1, 3, 4, 5]) {
        expect(findScoreButton(tree, n).props.accessibilityState).toEqual({
          selected: false,
        });
      }
    });

    it('marks no score as selected when the day is unscored', () => {
      const { tree } = renderBar({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findScoreButton(tree, n).props.accessibilityState).toEqual({
          selected: false,
        });
      }
    });
  });

  describe('visibility / pointer events', () => {
    it('is pointerEvents "none" when dateKey is null (closed)', () => {
      const { tree } = renderBar({ dateKey: null });
      const bar = tree.root.findAll(
        node => node.props.pointerEvents === 'none' && node.props.style !== undefined,
      )[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('is pointerEvents "auto" when dateKey is set (open)', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_KEY });
      const bar = tree.root.findAll(
        node => node.props.pointerEvents === 'auto' && node.props.style !== undefined,
      )[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  describe('note editor wiring', () => {
    it('passes dateKey, noteDraft and onNoteChange through to DayNoteEditor', () => {
      const onNoteChange = jest.fn();
      const { tree } = renderBar({
        dateKey: SAMPLE_KEY,
        noteDraft: 'felt focused',
        onNoteChange,
      });
      const editor = tree.root.findByType(
        'DayNoteEditor' as unknown as React.ElementType,
      );
      expect(editor.props.dateKey).toBe(SAMPLE_KEY);
      expect(editor.props.value).toBe('felt focused');
      expect(editor.props.onChangeText).toBe(onNoteChange);
    });
  });
});

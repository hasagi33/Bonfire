/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: open/closed pointer-events toggling, the date label formatting
 * (labelFor), the five score buttons (1..5) and their selected state, and the
 * Clear button being disabled when no score is set.
 *
 * react-native-reanimated and DayNoteEditor are mocked so the tests stay
 * deterministic and do not depend on native animation or text-input internals.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import type { DateKey } from '../../domain/dates';
import type { Score } from '../../domain/fire';

// Mock Reanimated: useAnimatedStyle runs its worklet once so the style object
// is computed, withTiming returns the target value immediately, and the
// keyboard height is a fixed zero so no native keyboard module is needed.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// Mock the note editor: we only care that it receives the right props, not its
// internals. The stub renders a plain Text so it is still inspectable.
jest.mock('../DayNoteEditor', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; value: string }) =>
      RN.React.createElement(RN.Text, { testID: 'note-editor' }, props.value),
  };
});

// Imported after the mocks so the component picks up the stubs.
// eslint-disable-next-line import/first
import ScorePickerBar from '../ScorePickerBar';

// Shared fixture: a fixed local date key so label output is deterministic.
const SAMPLE_DATE = '2024-03-05' as DateKey; // Tuesday, March 5

interface RenderOptions {
  dateKey?: DateKey | null;
  currentScore?: Score;
  noteDraft?: string;
  onNoteChange?: (text: string) => void;
  onChoose?: (score: Score) => void;
  onClear?: () => void;
}

// Renders the picker with sensible defaults, overridable per test.
function renderBar(options: RenderOptions = {}) {
  const props = {
    dateKey: null as DateKey | null,
    noteDraft: '',
    onNoteChange: jest.fn(),
    onChoose: jest.fn(),
    onClear: jest.fn(),
    ...options,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return { tree, props };
}

// Finds the Pressable whose accessibilityLabel matches the given text.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.type === Pressable && node.props.accessibilityLabel === label,
  );
}

// Returns the text content of the date header (the first Text after the note).
function dateText(tree: ReactTestRenderer.ReactTestRenderer): string {
  const texts = tree.root.findAllByType(Text);
  const label = texts.find(t => typeof t.props.children === 'string' && /,/.test(t.props.children));
  return label ? (label.props.children as string) : '';
}

describe('ScorePickerBar', () => {
  describe('open / closed state', () => {
    it('is pointer-events "none" when dateKey is null (closed)', () => {
      const { tree } = renderBar({ dateKey: null });
      const root = tree.root.findAll(
        node => node.props.pointerEvents !== undefined,
      )[0];
      expect(root.props.pointerEvents).toBe('none');
    });

    it('is pointer-events "auto" when dateKey is set (open)', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE });
      const root = tree.root.findAll(
        node => node.props.pointerEvents !== undefined,
      )[0];
      expect(root.props.pointerEvents).toBe('auto');
    });

    it('passes the dateKey and note draft through to the note editor', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE, noteDraft: 'felt good' });
      const editor = tree.root.findByProps({ testID: 'note-editor' });
      expect(editor.props.children).toBe('felt good');
    });
  });

  describe('date label (labelFor)', () => {
    it('formats the date as "Weekday, Mon D"', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE });
      expect(dateText(tree)).toBe('Tue, Mar 5');
    });

    it('renders an empty label when closed', () => {
      const { tree } = renderBar({ dateKey: null });
      expect(dateText(tree)).toBe('');
    });

    it('formats a December date with a two-digit day correctly', () => {
      const { tree } = renderBar({ dateKey: '2024-12-25' as DateKey });
      expect(dateText(tree)).toBe('Wed, Dec 25');
    });
  });

  describe('score buttons', () => {
    it('renders exactly five score buttons labelled 1 through 5', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(() => findByLabel(tree, `Score ${n}`)).not.toThrow();
      }
      const scoreButtons = tree.root.findAll(
        node =>
          node.type === Pressable &&
          typeof node.props.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith('Score '),
      );
      expect(scoreButtons).toHaveLength(5);
    });

    it.each([1, 2, 3, 4, 5])('invokes onChoose with the numeric score %i', n => {
      const onChoose = jest.fn();
      const { tree } = renderBar({ dateKey: SAMPLE_DATE, onChoose });
      ReactTestRenderer.act(() => {
        findByLabel(tree, `Score ${n}`).props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(n);
    });

    it('marks only the currently chosen score as selected', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE, currentScore: 3 });
      for (const n of [1, 2, 4, 5]) {
        expect(findByLabel(tree, `Score ${n}`).props.accessibilityState).toEqual({
          selected: false,
        });
      }
      expect(findByLabel(tree, 'Score 3').props.accessibilityState).toEqual({
        selected: true,
      });
    });

    it('marks no score as selected when currentScore is undefined', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findByLabel(tree, `Score ${n}`).props.accessibilityState).toEqual({
          selected: false,
        });
      }
    });

    it('still invokes onChoose when re-selecting the already-chosen score', () => {
      const onChoose = jest.fn();
      const { tree } = renderBar({ dateKey: SAMPLE_DATE, currentScore: 5, onChoose });
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Score 5').props.onPress();
      });
      expect(onChoose).toHaveBeenCalledWith(5);
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE });
      expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(true);
    });

    it('is enabled when a score is set', () => {
      const { tree } = renderBar({ dateKey: SAMPLE_DATE, currentScore: 2 });
      expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(false);
    });

    it('invokes onClear when a score is set', () => {
      const onClear = jest.fn();
      const { tree } = renderBar({ dateKey: SAMPLE_DATE, currentScore: 4, onClear });
      ReactTestRenderer.act(() => {
        findByLabel(tree, "Clear this day's score").props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('does not call onClear through a disabled button', () => {
      const onClear = jest.fn();
      const { tree } = renderBar({ dateKey: SAMPLE_DATE, onClear });
      const clear = findByLabel(tree, "Clear this day's score");
      // The button is disabled, so the pressable must not be enabled to fire.
      expect(clear.props.disabled).toBe(true);
      expect(onClear).not.toHaveBeenCalled();
    });
  });
});

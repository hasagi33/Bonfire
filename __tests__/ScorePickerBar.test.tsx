/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: closed/open visibility via pointerEvents, the header label format
 * produced by labelFor, the five score buttons calling onChoose with the right
 * Score, selected-state reflection via accessibilityState, the Clear button's
 * disabled state and onClear wiring, and note edits flowing through
 * onNoteChange via DayNoteEditor.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import type { Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Reanimated ships its own jest mock; we layer explicit overrides on top so the
// hooks used by ScorePickerBar return plain values without a native runtime.
jest.mock('react-native-reanimated', () => {
  const ReactLocal = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactLocal.forwardRef((props: object, ref: unknown) =>
        ReactLocal.createElement(View, { ...props, ref }),
      ),
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// DayNoteEditor is replaced with a simple stub that exposes its props so we can
// verify that note edits are forwarded through onNoteChange.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const ReactLocal = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: (props: {
      dateKey: string | null;
      value: string;
      onChangeText: (t: string) => void;
    }) =>
      ReactLocal.createElement(TextInput, {
        testID: 'day-note-editor',
        value: props.value,
        onChangeText: props.onChangeText,
      }),
  };
});

import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

const DATE_KEY = '2024-03-15' as DateKey; // a Friday in March

interface Overrides {
  dateKey?: DateKey | null;
  currentScore?: Score;
  noteDraft?: string;
  onNoteChange?: (text: string) => void;
  onChoose?: (score: Score) => void;
  onClear?: () => void;
}

function renderBar(overrides: Overrides = {}) {
  const props = {
    dateKey: DATE_KEY as DateKey | null,
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

// Collect the string contents of every Text node rendered in the tree.
function allTextContents(tree: ReactTestRenderer.ReactTestRenderer): unknown[] {
  return tree.root.findAllByType(Text).map(node => node.props.children);
}

// Find the root Animated.View by its pointerEvents prop (the bar container).
function findBarContainer(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    node => typeof node.props.pointerEvents === 'string' && node.props.style !== undefined,
  )[0];
}

// Find a score button by its accessibility label. Match on the rendered host
// props so the lookup does not depend on the Pressable component identity.
function findScoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number) {
  return tree.root.find(
    node =>
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel === `Score ${n}` &&
      typeof node.props.onPress === 'function',
  );
}

function findClearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    node =>
      typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel === "Clear this day's score" &&
      typeof node.props.onPress === 'function',
  );
}

describe('ScorePickerBar', () => {
  describe('visibility', () => {
    it('sets pointerEvents to none when dateKey is null (closed)', () => {
      const { tree } = renderBar({ dateKey: null });
      expect(findBarContainer(tree).props.pointerEvents).toBe('none');
    });

    it('sets pointerEvents to auto when dateKey is set (open)', () => {
      const { tree } = renderBar({ dateKey: DATE_KEY });
      expect(findBarContainer(tree).props.pointerEvents).toBe('auto');
    });
  });

  describe('header label', () => {
    it('formats the date as "Weekday, Mon D" via labelFor', () => {
      const { tree } = renderBar({ dateKey: DATE_KEY });
      // 2024-03-15 is a Friday in March.
      expect(allTextContents(tree)).toContain('Fri, Mar 15');
    });

    it('renders an empty header when dateKey is null', () => {
      const { tree } = renderBar({ dateKey: null });
      expect(allTextContents(tree)).toContain('');
    });

    it('uses single-digit days without zero padding', () => {
      const { tree } = renderBar({ dateKey: '2024-01-05' as DateKey });
      // 2024-01-05 is a Friday in January.
      expect(allTextContents(tree)).toContain('Fri, Jan 5');
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

    it('renders exactly five score buttons labelled 1..5', () => {
      const { tree } = renderBar();
      const labels = tree.root
        .findAll(
          node =>
            typeof node.props.accessibilityLabel === 'string' &&
            /^Score \d$/.test(node.props.accessibilityLabel) &&
            typeof node.props.onPress === 'function',
        )
        .map(node => node.props.accessibilityLabel);
      expect(labels).toEqual(['Score 1', 'Score 2', 'Score 3', 'Score 4', 'Score 5']);
    });

    it('marks only the currently selected score as selected', () => {
      const { tree } = renderBar({ currentScore: 4 });
      for (const n of [1, 2, 3, 5]) {
        expect(findScoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      }
      expect(findScoreButton(tree, 4).props.accessibilityState).toEqual({ selected: true });
    });

    it('marks no score as selected when currentScore is undefined', () => {
      const { tree } = renderBar({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findScoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      }
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = renderBar({ currentScore: undefined });
      expect(findClearButton(tree).props.disabled).toBe(true);
    });

    it('is enabled when a score is present', () => {
      const { tree } = renderBar({ currentScore: 3 });
      expect(findClearButton(tree).props.disabled).toBe(false);
    });

    it('calls onClear when pressed while enabled', () => {
      const { tree, props } = renderBar({ currentScore: 2 });
      ReactTestRenderer.act(() => {
        findClearButton(tree).props.onPress();
      });
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('note editing', () => {
    it('forwards the note draft value to DayNoteEditor', () => {
      const { tree } = renderBar({ noteDraft: 'Went for a run' });
      const input = tree.root.find(node => node.props.testID === 'day-note-editor');
      expect(input.props.value).toBe('Went for a run');
    });

    it('propagates text changes through onNoteChange', () => {
      const { tree, props } = renderBar({ noteDraft: '' });
      const input = tree.root.find(node => node.props.testID === 'day-note-editor');
      ReactTestRenderer.act(() => {
        input.props.onChangeText('Deep work block');
      });
      expect(props.onNoteChange).toHaveBeenCalledWith('Deep work block');
    });
  });
});

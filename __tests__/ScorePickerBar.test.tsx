/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: panel pointer-events gating on dateKey, header label formatting via
 * labelFor, score button presses, selected accessibility state, Clear button
 * enablement, and heat colors sourced from heatStyle tokens.
 *
 * DayNoteEditor and react-native-reanimated are mocked so the test stays
 * focused on the picker itself and never touches native modules.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import type { Score } from '../src/domain/fire';
import { heatStyle } from '../src/theme/tokens';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Mock Reanimated with plain no-op implementations so the animated view
// renders under jest-expo without a worklet runtime.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (value: number) => value,
    Easing: { bezier: () => () => 0 },
  };
});

// Replace the note editor with a stub; its own behavior is out of scope here.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text>note-editor</Text>,
  };
});

const DATE_KEY = '2024-01-05'; // a Friday in local time -> "Fri, Jan 5"
const SCORE: Score = 3;

interface RenderOptions {
  dateKey?: string | null;
  currentScore?: Score;
  onChoose?: jest.Mock;
  onClear?: jest.Mock;
  onNoteChange?: jest.Mock;
}

// Render helper: builds the component with fixtures and returns the tree
// along with the jest mocks so each test can assert on them.
function renderPicker(options: RenderOptions = {}) {
  const onChoose = options.onChoose ?? jest.fn();
  const onClear = options.onClear ?? jest.fn();
  const onNoteChange = options.onNoteChange ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ScorePickerBar
        dateKey={options.dateKey === undefined ? DATE_KEY : options.dateKey}
        currentScore={options.currentScore}
        noteDraft=""
        onNoteChange={onNoteChange}
        onChoose={onChoose}
        onClear={onClear}
      />,
    );
  });
  return { tree, onChoose, onClear, onNoteChange };
}

// Find a score button by its accessibility label, e.g. "Score 3".
function findScoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number): ReactTestInstance {
  return tree.root.findByProps({ accessibilityLabel: `Score ${n}` });
}

// Find the Clear button by its accessibility label.
function findClearButton(tree: ReactTestRenderer.ReactTestRenderer): ReactTestInstance {
  return tree.root.findByProps({ accessibilityLabel: "Clear this day's score" });
}

// The outermost animated panel is the one carrying pointerEvents.
function findPanel(tree: ReactTestRenderer.ReactTestRenderer): ReactTestInstance {
  return tree.root.findAll(
    node => node.props.pointerEvents === 'auto' || node.props.pointerEvents === 'none',
  )[0];
}

describe('ScorePickerBar', () => {
  describe('panel visibility', () => {
    it('enables pointer events when dateKey is set', () => {
      const { tree } = renderPicker({ dateKey: DATE_KEY });
      expect(findPanel(tree).props.pointerEvents).toBe('auto');
    });

    it('disables pointer events when dateKey is null', () => {
      const { tree } = renderPicker({ dateKey: null });
      expect(findPanel(tree).props.pointerEvents).toBe('none');
    });
  });

  describe('header label', () => {
    it('formats the date as "Weekday, Mon D"', () => {
      const { tree } = renderPicker({ dateKey: DATE_KEY });
      const texts = tree.root.findAll(
        node => typeof node.props.children === 'string',
      ).map(node => node.props.children);
      expect(texts).toContain('Fri, Jan 5');
    });

    it('renders an empty label when dateKey is null', () => {
      const { tree } = renderPicker({ dateKey: null });
      const texts = tree.root.findAll(
        node => typeof node.props.children === 'string',
      ).map(node => node.props.children);
      expect(texts).toContain('');
      expect(texts).not.toContain('Fri, Jan 5');
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as const)('calls onChoose with %i when pressed', n => {
      const { tree, onChoose } = renderPicker();
      ReactTestRenderer.act(() => {
        findScoreButton(tree, n).props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(n);
    });

    it('marks the button matching currentScore as selected', () => {
      const { tree } = renderPicker({ currentScore: SCORE });
      expect(findScoreButton(tree, SCORE).props.accessibilityState).toEqual({ selected: true });
    });

    it('marks non-matching buttons as not selected', () => {
      const { tree } = renderPicker({ currentScore: SCORE });
      const others = [1, 2, 4, 5] as const;
      for (const n of others) {
        expect(findScoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      }
    });

    it('marks every button as not selected when currentScore is undefined', () => {
      const { tree } = renderPicker({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findScoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      }
    });

    it('colors each button from heatStyle tokens, not hardcoded values', () => {
      const { tree } = renderPicker();
      for (const n of [1, 2, 3, 4, 5] as const) {
        const heat = heatStyle(n);
        const button = findScoreButton(tree, n);
        // Style is a function of pressed state; invoke it with pressed=false.
        const styleArray = [button.props.style({ pressed: false })].flat(Infinity) as Array<
          Record<string, unknown> | false | undefined
        >;
        const flat = Object.assign({}, ...styleArray.filter(Boolean));
        expect(flat.backgroundColor).toBe(heat.background);
      }
    });
  });

  describe('clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = renderPicker({ currentScore: undefined });
      expect(findClearButton(tree).props.disabled).toBe(true);
    });

    it('does not invoke onClear when the disabled Pressable is pressed', () => {
      const { tree, onClear } = renderPicker({ currentScore: undefined });
      // Pressable with disabled=true suppresses presses at the native layer;
      // the component wires onPress={onClear} directly, so we verify the
      // disabled prop is set and that pressing through the disabled host
      // node does not reach the mock.
      const clear = findClearButton(tree);
      expect(clear.props.disabled).toBe(true);
      const host = clear.findAll(node => typeof node.type === 'string')[0] ?? clear;
      if (host.props.onClick) {
        ReactTestRenderer.act(() => {
          host.props.onClick();
        });
      }
      expect(onClear).not.toHaveBeenCalled();
    });

    it('is enabled when currentScore is set', () => {
      const { tree } = renderPicker({ currentScore: SCORE });
      expect(findClearButton(tree).props.disabled).toBe(false);
    });

    it('calls onClear when pressed with a score present', () => {
      const { tree, onClear } = renderPicker({ currentScore: SCORE });
      ReactTestRenderer.act(() => {
        findClearButton(tree).props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });
});

/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: pointer-events gating on the open/closed state, the weekday + month
 * date label, Clear button enablement, score button presses forwarding the
 * chosen number to onChoose, the selected-state accessibility flag, and
 * onClear wiring. Reanimated is mocked so the animated panel renders in Node.
 * Score validation lives in the hook layer, so these tests only check that the
 * component passes the chosen number through. Nothing here touches storage.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text, View } from 'react-native';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';
import type { Score } from '../src/domain/fire';

// Reanimated doesn't run its native worklet runtime under Jest, so replace the
// pieces ScorePickerBar uses with plain stand-ins that render synchronously.
jest.mock('react-native-reanimated', () => {
  const { View: MockView } = require('react-native');
  return {
    __esModule: true,
    default: { View: MockView },
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (value: number) => value,
    Easing: { bezier: () => (t: number) => t },
  };
});

// The note editor has its own storage-free UI; stub it so this file only
// exercises the picker itself.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { View: MockView } = require('react-native');
  return {
    __esModule: true,
    default: () => <MockView testID="day-note-editor" />,
  };
});

type Props = React.ComponentProps<typeof ScorePickerBar>;

// Fixed inputs so every assertion is deterministic.
const FIXED_DATE = '2024-03-15'; // a Friday in March 2024
const FIXED_LABEL = 'Fri, Mar 15';

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    dateKey: FIXED_DATE,
    currentScore: undefined,
    noteDraft: '',
    onNoteChange: jest.fn(),
    onChoose: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
}

function render(props: Props) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return tree;
}

// Find a score button by its accessibility label, e.g. "Score 3".
function scoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number) {
  return tree.root.findByProps({ accessibilityLabel: `Score ${n}` });
}

// Find the Clear button by its accessibility label.
function clearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findByProps({ accessibilityLabel: "Clear this day's score" });
}

// Find the outer animated panel: the view that carries pointerEvents.
function panel(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    n => n.type === View && n.props.pointerEvents !== undefined,
  )[0];
}

describe('ScorePickerBar', () => {
  describe('pointer events', () => {
    test("is 'none' when dateKey is null (closed)", () => {
      const tree = render(baseProps({ dateKey: null }));
      expect(panel(tree).props.pointerEvents).toBe('none');
    });

    test("is 'auto' when a date is provided (open)", () => {
      const tree = render(baseProps({ dateKey: FIXED_DATE }));
      expect(panel(tree).props.pointerEvents).toBe('auto');
    });
  });

  describe('date label', () => {
    test('shows weekday and short month name with day for a fixed dateKey', () => {
      const tree = render(baseProps({ dateKey: FIXED_DATE }));
      const texts = tree.root.findAllByType(Text).map(t => t.props.children);
      expect(texts).toContain(FIXED_LABEL);
    });

    test('shows an empty label when dateKey is null', () => {
      const tree = render(baseProps({ dateKey: null }));
      const texts = tree.root.findAllByType(Text).map(t => t.props.children);
      expect(texts).not.toContain(FIXED_LABEL);
      expect(texts).toContain('');
    });
  });

  describe('Clear button', () => {
    test('is disabled when currentScore is undefined', () => {
      const tree = render(baseProps({ currentScore: undefined }));
      expect(clearButton(tree).props.disabled).toBe(true);
    });

    test('is enabled when a score is set', () => {
      const tree = render(baseProps({ currentScore: 4 as Score }));
      expect(clearButton(tree).props.disabled).toBe(false);
    });

    test('invokes onClear when pressed with a current score', () => {
      const onClear = jest.fn();
      const tree = render(baseProps({ currentScore: 2 as Score, onClear }));
      ReactTestRenderer.act(() => {
        clearButton(tree).props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('score buttons', () => {
    test('renders exactly five score buttons labelled 1 through 5', () => {
      const tree = render(baseProps());
      const labels = tree.root
        .findAll(
          n =>
            typeof n.props.accessibilityLabel === 'string' &&
            /^Score \d$/.test(n.props.accessibilityLabel) &&
            n.props.accessibilityRole === 'button' &&
            typeof n.props.onPress === 'function',
        )
        .map(b => b.props.accessibilityLabel);
      // Pressable renders a host View plus composite wrappers carrying the
      // same props, so de-duplicate while keeping the 1..5 order.
      expect(Array.from(new Set(labels))).toEqual([
        'Score 1',
        'Score 2',
        'Score 3',
        'Score 4',
        'Score 5',
      ]);
    });

    test.each([1, 2, 3, 4, 5])('pressing score %i calls onChoose with %i', n => {
      const onChoose = jest.fn();
      const tree = render(baseProps({ onChoose }));
      ReactTestRenderer.act(() => {
        scoreButton(tree, n).props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(n);
    });

    test('reports selected=true only for the active score', () => {
      const tree = render(baseProps({ currentScore: 3 as Score }));
      for (const n of [1, 2, 4, 5]) {
        expect(scoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      }
      expect(scoreButton(tree, 3).props.accessibilityState).toEqual({ selected: true });
    });

    test('reports no selection when currentScore is undefined', () => {
      const tree = render(baseProps({ currentScore: undefined }));
      for (const n of [1, 2, 3, 4, 5]) {
        expect(scoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      }
    });
  });
});

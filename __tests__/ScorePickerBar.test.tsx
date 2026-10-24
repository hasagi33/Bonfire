/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: open/closed pointer-events, date label formatting, Clear button
 * enabled/disabled wiring, score button callbacks, selected accessibility
 * state, heat token styling, and note editor prop wiring.
 *
 * react-native-reanimated is mocked so the tests run without the native
 * runtime; all animation values resolve synchronously.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, StyleSheet } from 'react-native';
import type { Score } from '../src/domain/fire';
import { heatStyle } from '../src/theme/tokens';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';
import DayNoteEditor from '../src/components/Calendar/DayNoteEditor';

// Replace Reanimated with lightweight stand-ins. Shared values are plain
// objects, withTiming returns its target, and the animated style is a no-op
// transform so no native module is required.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: RN.View },
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

// Replace the note editor with a simple stub that records its props, so the
// wiring test can assert exactly what ScorePickerBar passes down.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: jest.fn((props: object) =>
      React.createElement(RN.Text, { testID: 'note-editor' }, JSON.stringify(props)),
    ),
  };
});

const DATE_KEY = '2024-03-15'; // a Friday in March

interface Overrides {
  dateKey?: string | null;
  currentScore?: Score;
  noteDraft?: string;
  onNoteChange?: jest.Mock;
  onChoose?: jest.Mock;
  onClear?: jest.Mock;
}

// Build the component with default handlers, letting each test override only
// what it cares about.
function renderBar(overrides: Overrides = {}) {
  const props = {
    dateKey: DATE_KEY,
    currentScore: undefined as Score | undefined,
    noteDraft: '',
    onNoteChange: jest.fn(),
    onChoose: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ScorePickerBar
        dateKey={props.dateKey as string | null}
        currentScore={props.currentScore}
        noteDraft={props.noteDraft}
        onNoteChange={props.onNoteChange}
        onChoose={props.onChoose}
        onClear={props.onClear}
      />,
    );
  });
  return { tree, props };
}

// Find every score button by its accessibility label ("Score 1" .. "Score 5").
function scoreButtons(tree: ReactTestRenderer.ReactTestRenderer) {
  return [1, 2, 3, 4, 5].map(n =>
    tree.root.find(
      node => node.type === Pressable && node.props.accessibilityLabel === `Score ${n}`,
    ),
  );
}

// Find the Clear button by its accessibility label.
function clearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    node =>
      node.type === Pressable &&
      node.props.accessibilityLabel === "Clear this day's score",
  );
}

// Flatten the (possibly array-valued) style prop into one style object.
function flatStyle(style: unknown): Record<string, unknown> {
  return StyleSheet.flatten(style as never) as Record<string, unknown>;
}

describe('ScorePickerBar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('open / closed state', () => {
    it('allows pointer events when dateKey is set', () => {
      const { tree } = renderBar({ dateKey: DATE_KEY });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });

    it('blocks pointer events when dateKey is null', () => {
      const { tree } = renderBar({ dateKey: null });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('renders an empty date label when closed', () => {
      const { tree } = renderBar({ dateKey: null });
      const texts = tree.root.findAll(
        n => n.type === 'Text' && n.props.style && flatStyle(n.props.style).fontWeight === '700',
      );
      expect(texts.some(t => t.props.children === '')).toBe(true);
    });
  });

  describe('date label', () => {
    it('formats the dateKey as "Weekday, Mon D"', () => {
      const { tree } = renderBar({ dateKey: '2024-03-15' });
      const label = tree.root.findAll(
        n => n.type === 'Text' && flatStyle(n.props.style).fontSize === 14,
      );
      expect(label[0].props.children).toBe('Fri, Mar 15');
    });

    it('formats a January single-digit day without padding', () => {
      const { tree } = renderBar({ dateKey: '2025-01-05' });
      const label = tree.root.findAll(
        n => n.type === 'Text' && flatStyle(n.props.style).fontSize === 14,
      );
      expect(label[0].props.children).toBe('Sun, Jan 5');
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = renderBar({ currentScore: undefined });
      expect(clearButton(tree).props.disabled).toBe(true);
    });

    it('is enabled when a score exists', () => {
      const { tree } = renderBar({ currentScore: 3 });
      expect(clearButton(tree).props.disabled).toBe(false);
    });

    it('calls onClear when pressed', () => {
      const onClear = jest.fn();
      const { tree } = renderBar({ currentScore: 4, onClear });
      ReactTestRenderer.act(() => {
        clearButton(tree).props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as Score[])('calls onChoose(%i) when button %i is pressed', score => {
      const onChoose = jest.fn();
      const { tree } = renderBar({ onChoose });
      ReactTestRenderer.act(() => {
        scoreButtons(tree)[score - 1].props.onPress();
      });
      expect(onChoose).toHaveBeenCalledWith(score);
      expect(onChoose).toHaveBeenCalledTimes(1);
    });

    it('marks only the current score as selected', () => {
      const { tree } = renderBar({ currentScore: 2 });
      const buttons = scoreButtons(tree);
      buttons.forEach((btn, i) => {
        expect(btn.props.accessibilityState).toEqual({ selected: i + 1 === 2 });
      });
    });

    it('marks no score as selected when currentScore is undefined', () => {
      const { tree } = renderBar({ currentScore: undefined });
      scoreButtons(tree).forEach(btn => {
        expect(btn.props.accessibilityState).toEqual({ selected: false });
      });
    });

    it('applies the heat background and text color from heatStyle tokens', () => {
      const { tree } = renderBar();
      scoreButtons(tree).forEach((btn, i) => {
        const score = i + 1;
        const heat = heatStyle(score);
        const style = flatStyle(btn.props.style({ pressed: false }));
        expect(style.backgroundColor).toBe(heat.background);
        const text = tree.root.findAll(
          n => n.type === 'Text' && n.props.children === String(score),
        )[0];
        expect(flatStyle(text.props.style).color).toBe(heat.color);
      });
    });

    it('applies the token border to score 1 only when the token defines one', () => {
      const { tree } = renderBar();
      const [one] = scoreButtons(tree);
      const heat = heatStyle(1);
      const style = flatStyle(one.props.style({ pressed: false }));
      if (heat.border !== undefined) {
        expect(style.borderColor).toBe(heat.border);
      } else {
        expect(style.borderColor).not.toBe(heat.border);
      }
    });
  });

  describe('note editor wiring', () => {
    it('passes dateKey, value and onChangeText to DayNoteEditor', () => {
      const onNoteChange = jest.fn();
      renderBar({ dateKey: DATE_KEY, noteDraft: 'hello', onNoteChange });
      const mockEditor = DayNoteEditor as unknown as jest.Mock;
      const lastProps = mockEditor.mock.calls[mockEditor.mock.calls.length - 1][0];
      expect(lastProps.dateKey).toBe(DATE_KEY);
      expect(lastProps.value).toBe('hello');
      expect(lastProps.onChangeText).toBe(onNoteChange);
    });

    it('passes a null dateKey to DayNoteEditor when closed', () => {
      renderBar({ dateKey: null });
      const mockEditor = DayNoteEditor as unknown as jest.Mock;
      const lastProps = mockEditor.mock.calls[mockEditor.mock.calls.length - 1][0];
      expect(lastProps.dateKey).toBeNull();
    });
  });
});

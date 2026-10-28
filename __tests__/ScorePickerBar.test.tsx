/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: non-interactive when closed, labelFor output, score button presses,
 * Clear button enabled/disabled state, selected accessibility state, and the
 * token-driven border on the score-1 button.
 *
 * react-native-reanimated is mocked so the slide animation runs synchronously
 * and deterministically; no network or wall-clock timing is involved.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { heatStyle } from '../src/theme/tokens';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';
import type { DateKey } from '../src/domain/dates';

// Mock reanimated: hooks return plain values and withTiming passes through,
// so style computation is synchronous and free of timers.
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

// DayNoteEditor is a sibling component with its own concerns; stub it so these
// tests focus purely on the picker bar. Rendered as a host-less element to
// avoid calling a component as a plain function.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => null,
    NoteEditorStub: RN.View,
  };
});

const DATE_KEY = '2024-03-15' as DateKey; // Fri, Mar 15 2024 (local)

interface RenderOptions {
  dateKey?: DateKey | null;
  currentScore?: 1 | 2 | 3 | 4 | 5;
  onChoose?: jest.Mock;
  onClear?: jest.Mock;
  onNoteChange?: jest.Mock;
}

function render(opts: RenderOptions = {}) {
  const onChoose = opts.onChoose ?? jest.fn();
  const onClear = opts.onClear ?? jest.fn();
  const onNoteChange = opts.onNoteChange ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ScorePickerBar
        dateKey={opts.dateKey === undefined ? DATE_KEY : opts.dateKey}
        currentScore={opts.currentScore}
        noteDraft=""
        onNoteChange={onNoteChange}
        onChoose={onChoose}
        onClear={onClear}
      />,
    );
  });
  return { tree, onChoose, onClear, onNoteChange };
}

// Find the Pressable score button for a given number by its accessibility label.
function scoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number) {
  return tree.root.findAll(
    node => node.props.accessibilityLabel === `Score ${n}` && typeof node.props.onPress === 'function',
  )[0];
}

function clearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    node =>
      node.props.accessibilityLabel === "Clear this day's score" &&
      typeof node.props.onPress === 'function',
  )[0];
}

// Flatten a style prop (array or object) into a single object for assertions.
function flatStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, s) => ({ ...acc, ...flatStyle(s) }), {});
  }
  return (style ?? {}) as Record<string, unknown>;
}

describe('ScorePickerBar', () => {
  describe('interactivity', () => {
    it('is non-interactive (pointerEvents none) when dateKey is null', () => {
      const { tree } = render({ dateKey: null });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('is interactive (pointerEvents auto) when dateKey is set', () => {
      const { tree } = render({ dateKey: DATE_KEY });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  describe('date label', () => {
    it('renders the weekday, month and day for the given dateKey', () => {
      const { tree } = render({ dateKey: DATE_KEY });
      const found = tree.root.findAll(
        n => typeof n.props.children === 'string' && n.props.children === 'Fri, Mar 15',
      );
      expect(found.length).toBeGreaterThan(0);
    });

    it('renders an empty label when dateKey is null', () => {
      const { tree } = render({ dateKey: null });
      const found = tree.root.findAll(
        n => typeof n.props.children === 'string' && /, [A-Z][a-z]{2} \d+/.test(n.props.children),
      );
      expect(found).toHaveLength(0);
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as const)('pressing score %i calls onChoose with %i', n => {
      const { tree, onChoose } = render();
      ReactTestRenderer.act(() => {
        scoreButton(tree, n).props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(n);
    });

    it('renders exactly five score buttons numbered 1 through 5', () => {
      const { tree } = render();
      const labels = [1, 2, 3, 4, 5].map(n => scoreButton(tree, n).props.accessibilityLabel);
      expect(labels).toEqual(['Score 1', 'Score 2', 'Score 3', 'Score 4', 'Score 5']);
    });

    it('marks only the currently selected score as selected', () => {
      const { tree } = render({ currentScore: 3 });
      [1, 2, 3, 4, 5].forEach(n => {
        expect(scoreButton(tree, n).props.accessibilityState).toEqual({ selected: n === 3 });
      });
    });

    it('marks no score as selected when currentScore is undefined', () => {
      const { tree } = render({ currentScore: undefined });
      [1, 2, 3, 4, 5].forEach(n => {
        expect(scoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      });
    });

    it('applies the token-defined border to the score-1 button', () => {
      const { tree } = render();
      const border = heatStyle(1).border;
      expect(border).toBeDefined();
      const style = flatStyle(scoreButton(tree, 1).props.style({ pressed: false }));
      expect(style.borderColor).toBe(border);
    });

    it('colors each score button from its heat token background', () => {
      const { tree } = render();
      [1, 2, 3, 4, 5].forEach(n => {
        const style = flatStyle(scoreButton(tree, n).props.style({ pressed: false }));
        expect(style.backgroundColor).toBe(heatStyle(n as 1 | 2 | 3 | 4 | 5).background);
      });
    });
  });

  describe('clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = render({ currentScore: undefined });
      expect(clearButton(tree).props.disabled).toBe(true);
    });

    it('is enabled when a score is assigned', () => {
      const { tree } = render({ currentScore: 4 });
      expect(clearButton(tree).props.disabled).toBe(false);
    });

    it('calls onClear when pressed while enabled', () => {
      const { tree, onClear } = render({ currentScore: 2 });
      ReactTestRenderer.act(() => {
        clearButton(tree).props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });

    it('does not call onChoose when Clear is pressed', () => {
      const { tree, onChoose } = render({ currentScore: 2 });
      ReactTestRenderer.act(() => {
        clearButton(tree).props.onPress();
      });
      expect(onChoose).not.toHaveBeenCalled();
    });
  });
});

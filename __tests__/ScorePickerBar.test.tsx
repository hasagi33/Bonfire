/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker.
 *
 * Covers: open/closed pointer-events, header label formatting, score buttons
 * (colors from heat tokens, onChoose with numeric score, selected state),
 * the Clear button (disabled/enabled and onClear), and note editor wiring.
 *
 * react-native-reanimated and DayNoteEditor are mocked so the picker is
 * isolated and runs deterministically with no animation timing.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import type { DateKey } from '../src/domain/dates';
import { heatStyle } from '../src/theme/tokens';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Reanimated mock: plain values and no-op hooks so no worklet or timing runs in Jest.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

// DayNoteEditor mock: render a host View carrying the received props so the
// test can locate it by testID and assert wiring.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { View: MockView } = jest.requireActual('react-native');
  const MockReact = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; value: string; onChangeText: unknown }) =>
      MockReact.createElement(MockView, {
        testID: 'day-note-editor',
        dateKey: props.dateKey,
        value: props.value,
        onChangeText: props.onChangeText,
      }),
  };
});

const DATE = '2024-03-15' as DateKey; // Friday, Mar 15

interface RenderOptions {
  dateKey?: DateKey | null;
  currentScore?: 1 | 2 | 3 | 4 | 5;
  noteDraft?: string;
  onNoteChange?: (text: string) => void;
  onChoose?: (score: number) => void;
  onClear?: () => void;
}

// Render the picker with sensible defaults; returns the renderer and the props used.
function render(options: RenderOptions = {}) {
  const props = {
    dateKey: options.dateKey === undefined ? DATE : options.dateKey,
    currentScore: options.currentScore,
    noteDraft: options.noteDraft ?? '',
    onNoteChange: options.onNoteChange ?? jest.fn(),
    onChoose: options.onChoose ?? jest.fn(),
    onClear: options.onClear ?? jest.fn(),
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ScorePickerBar
        dateKey={props.dateKey}
        currentScore={props.currentScore as never}
        noteDraft={props.noteDraft}
        onNoteChange={props.onNoteChange}
        onChoose={props.onChoose as never}
        onClear={props.onClear}
      />,
    );
  });
  return { tree, props };
}

// Find the Pressable whose accessibilityLabel matches. Matches by label prop
// on any node so it works regardless of how the Pressable is wrapped internally.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const matches = tree.root.findAll(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
  if (matches.length === 0) {
    throw new Error(`No pressable with accessibilityLabel "${label}"`);
  }
  return matches[0];
}

// All string text rendered by Text components in the tree.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAllByType(Text)
    .map(n => (typeof n.props.children === 'string' ? n.props.children : ''))
    .filter(Boolean);
}

describe('ScorePickerBar', () => {
  describe('open / closed state', () => {
    it('uses pointerEvents "auto" when dateKey is set', () => {
      const { tree } = render({ dateKey: DATE });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });

    it('uses pointerEvents "none" when dateKey is null', () => {
      const { tree } = render({ dateKey: null });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('renders no date label when dateKey is null', () => {
      const { tree } = render({ dateKey: null });
      expect(allText(tree)).not.toContain('Fri, Mar 15');
    });
  });

  describe('header label', () => {
    it('formats the date as "Weekday, Mon D" for a fixed date', () => {
      const { tree } = render({ dateKey: DATE });
      expect(allText(tree)).toContain('Fri, Mar 15');
    });

    it('formats a different fixed date correctly', () => {
      const { tree } = render({ dateKey: '2024-01-01' as DateKey });
      expect(allText(tree)).toContain('Mon, Jan 1');
    });
  });

  describe('score buttons', () => {
    it('renders buttons 1 through 5', () => {
      const { tree } = render();
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findByLabel(tree, `Score ${n}`)).toBeTruthy();
      }
    });

    it('applies heat token background and text color to each button', () => {
      const { tree } = render();
      for (const n of [1, 2, 3, 4, 5] as const) {
        const heat = heatStyle(n);
        const btn = findByLabel(tree, `Score ${n}`);
        const style = btn.props.style({ pressed: false });
        const flat = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
        expect(flat.backgroundColor).toBe(heat.background);
        const text = btn.findByType(Text);
        expect(text.props.style).toEqual(expect.arrayContaining([{ color: heat.color }]));
      }
    });

    it('calls onChoose with the numeric score when a button is pressed', () => {
      const onChoose = jest.fn();
      const { tree } = render({ onChoose });
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Score 4').props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(4);
    });

    it('calls onChoose with 1 for the lowest score button', () => {
      const onChoose = jest.fn();
      const { tree } = render({ onChoose });
      ReactTestRenderer.act(() => {
        findByLabel(tree, 'Score 1').props.onPress();
      });
      expect(onChoose).toHaveBeenCalledWith(1);
    });

    it('marks only the currently scored button as selected', () => {
      const { tree } = render({ currentScore: 3 });
      for (const n of [1, 2, 3, 4, 5]) {
        const btn = findByLabel(tree, `Score ${n}`);
        expect(btn.props.accessibilityState).toEqual({ selected: n === 3 });
      }
    });

    it('marks no button as selected when currentScore is undefined', () => {
      const { tree } = render({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findByLabel(tree, `Score ${n}`).props.accessibilityState).toEqual({ selected: false });
      }
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = render({ currentScore: undefined });
      expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(true);
    });

    it('is enabled when a score exists', () => {
      const { tree } = render({ currentScore: 2 });
      expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(false);
    });

    it('calls onClear when enabled and pressed', () => {
      const onClear = jest.fn();
      const { tree } = render({ currentScore: 5, onClear });
      ReactTestRenderer.act(() => {
        findByLabel(tree, "Clear this day's score").props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('note editor wiring', () => {
    it('passes dateKey, noteDraft and onNoteChange to DayNoteEditor', () => {
      const onNoteChange = jest.fn();
      const { tree } = render({ dateKey: DATE, noteDraft: 'hello', onNoteChange });
      const editor = tree.root.findByProps({ testID: 'day-note-editor' });
      expect(editor.props.dateKey).toBe(DATE);
      expect(editor.props.value).toBe('hello');
      expect(editor.props.onChangeText).toBe(onNoteChange);
    });
  });
});

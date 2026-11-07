/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: the formatted date label, open/closed pointer-events state, score
 * button presses, Clear button enablement, the selected-state accessibility
 * flag, and forwarding of the note editor props.
 *
 * Uses react-test-renderer; react-native-reanimated is mocked so the component
 * renders deterministically under jest-expo without a native animation loop.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import type { Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Mock reanimated so the component renders synchronously in Jest. Shared values
// are plain objects, withTiming resolves to its target, and styles are empty.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: RN.View },
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => () => 0 },
  };
});

// The note editor is covered by its own tests; here we only capture its props.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => RN.createElement(RN.View, { testID: 'day-note-editor', ...(props as object) }),
  };
});

type Renderer = ReactTestRenderer.ReactTestRenderer;

interface RenderOpts {
  dateKey?: DateKey | null;
  currentScore?: Score;
  noteDraft?: string;
  onNoteChange?: (text: string) => void;
  onChoose?: (score: Score) => void;
  onClear?: () => void;
}

function render(opts: RenderOpts = {}) {
  const props = {
    dateKey: opts.dateKey === undefined ? ('2024-03-04' as DateKey) : opts.dateKey,
    currentScore: opts.currentScore,
    noteDraft: opts.noteDraft ?? '',
    onNoteChange: opts.onNoteChange ?? jest.fn(),
    onChoose: opts.onChoose ?? jest.fn(),
    onClear: opts.onClear ?? jest.fn(),
  };
  let tree!: Renderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return { tree, props };
}

// Find a Pressable by its accessibilityLabel.
function findByLabel(tree: Renderer, label: string) {
  return tree.root.find(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

// Collect every rendered text string, used to check the date label.
function allText(tree: Renderer): string[] {
  return tree.root.findAllByType(Text).map(t => {
    const children = t.props.children;
    return Array.isArray(children) ? children.join('') : String(children);
  });
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('ScorePickerBar date label', () => {
  test('formats the selected DateKey as "Weekday, Mon D"', () => {
    // 2024-03-04 is a Monday.
    const { tree } = render({ dateKey: '2024-03-04' as DateKey });
    expect(allText(tree)).toContain('Mon, Mar 4');
  });

  test('renders an empty label when dateKey is null', () => {
    const { tree } = render({ dateKey: null });
    const texts = allText(tree);
    expect(texts).not.toContain('Mon, Mar 4');
    expect(texts.some(t => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d+$/.test(t))).toBe(false);
  });
});

describe('ScorePickerBar open/closed state', () => {
  test('is pointer-interactive when a dateKey is set', () => {
    const { tree } = render({ dateKey: '2024-03-04' as DateKey });
    const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
    expect(bar.props.pointerEvents).toBe('auto');
  });

  test('ignores pointer events when dateKey is null', () => {
    const { tree } = render({ dateKey: null });
    const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
    expect(bar.props.pointerEvents).toBe('none');
  });
});

describe('ScorePickerBar score buttons', () => {
  test.each([1, 2, 3, 4, 5] as Score[])('pressing score %i calls onChoose with %i', score => {
    const onChoose = jest.fn();
    const { tree } = render({ onChoose });
    ReactTestRenderer.act(() => {
      findByLabel(tree, `Score ${score}`).props.onPress();
    });
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(score);
  });

  test('marks only the current score as selected', () => {
    const { tree } = render({ currentScore: 3 });
    for (const n of [1, 2, 3, 4, 5]) {
      const selected = findByLabel(tree, `Score ${n}`).props.accessibilityState.selected;
      expect(selected).toBe(n === 3);
    }
  });

  test('no score is selected when currentScore is undefined', () => {
    const { tree } = render({ currentScore: undefined });
    for (const n of [1, 2, 3, 4, 5]) {
      expect(findByLabel(tree, `Score ${n}`).props.accessibilityState.selected).toBe(false);
    }
  });
});

describe('ScorePickerBar Clear button', () => {
  test('is disabled when currentScore is undefined', () => {
    const { tree } = render({ currentScore: undefined });
    const clear = tree.root.find(
      n => n.props.accessibilityLabel === "Clear this day's score" && n.type === Pressable,
    );
    expect(clear.props.disabled).toBe(true);
  });

  test('is enabled when a score exists', () => {
    const { tree } = render({ currentScore: 4 });
    const clear = tree.root.find(
      n => n.props.accessibilityLabel === "Clear this day's score" && n.type === Pressable,
    );
    expect(clear.props.disabled).toBe(false);
  });

  test('calls onClear when enabled', () => {
    const onClear = jest.fn();
    const { tree } = render({ currentScore: 2, onClear });
    ReactTestRenderer.act(() => {
      findByLabel(tree, "Clear this day's score").props.onPress();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('ScorePickerBar note editor', () => {
  test('forwards noteDraft as value and onNoteChange as onChangeText', () => {
    const onNoteChange = jest.fn();
    const { tree } = render({ noteDraft: 'felt focused', onNoteChange });
    const editor = tree.root.find(n => n.props.testID === 'day-note-editor');
    expect(editor.props.value).toBe('felt focused');
    ReactTestRenderer.act(() => {
      editor.props.onChangeText('new text');
    });
    expect(onNoteChange).toHaveBeenCalledWith('new text');
  });
});

/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: panel visibility via pointerEvents, the date label produced by
 * labelFor, score button presses, the Clear button's disabled/enabled state,
 * the selected accessibility state on the active score, and the note editor
 * receiving its draft and forwarding edits.
 *
 * Reanimated and the DayNoteEditor child are mocked so the bar renders in the
 * plain react-test-renderer environment with no native modules or network.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Reanimated depends on native worklets, which do not exist in Jest. Replace it
// with a minimal stand-in: shared values are plain objects, animated styles are
// computed once, and withTiming simply returns the target value.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
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

// The note editor has its own input behavior; here we only need to observe the
// props ScorePickerBar hands it, so it is replaced with a simple probe component.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const ReactLocal = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; value: string }) =>
      ReactLocal.createElement(Text, { testID: 'note-editor' }, props.value),
  };
});

// 2025-03-04 is a Tuesday in March; labelFor renders it as "Tue, Mar 4".
const DATE_KEY = '2025-03-04';

type BarProps = React.ComponentProps<typeof ScorePickerBar>;

function render(overrides: Partial<BarProps> = {}) {
  const props: BarProps = {
    dateKey: null,
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

// Finds the Pressable score buttons by their accessibility label.
function findScoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number) {
  return tree.root.find(
    node => node.props.accessibilityLabel === `Score ${n}` && typeof node.props.onPress === 'function',
  );
}

function findClearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    node =>
      node.props.accessibilityLabel === "Clear this day's score" &&
      typeof node.props.onPress === 'function',
  );
}

// Collects the string children of every host Text node in the tree.
// Host Text nodes are matched by the `Text` component type's display name.
function allTextStrings(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAll(node => {
      const type = node.type as { displayName?: string; name?: string } | string;
      const name = typeof type === 'string' ? type : (type.displayName ?? type.name);
      return name === 'Text' && typeof node.props.children === 'string';
    })
    .map(node => node.props.children as string);
}

describe('ScorePickerBar visibility', () => {
  test('is non-interactive (pointerEvents none) when dateKey is null', () => {
    const { tree } = render({ dateKey: null });
    const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
    expect(bar.props.pointerEvents).toBe('none');
  });

  test('becomes interactive (pointerEvents auto) when dateKey is set', () => {
    const { tree } = render({ dateKey: DATE_KEY });
    const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
    expect(bar.props.pointerEvents).toBe('auto');
  });
});

describe('ScorePickerBar date label', () => {
  test('renders a short weekday and month label for the selected day', () => {
    const { tree } = render({ dateKey: DATE_KEY });
    expect(allTextStrings(tree)).toContain('Tue, Mar 4');
  });

  test('renders an empty label when no day is selected', () => {
    const { tree } = render({ dateKey: null });
    const texts = allTextStrings(tree);
    expect(texts).toContain('');
    expect(texts.some(t => t.includes('Mar'))).toBe(false);
  });
});

describe('ScorePickerBar score buttons', () => {
  test.each([1, 2, 3, 4, 5])('pressing score %i calls onChoose with that number', n => {
    const { tree, props } = render({ dateKey: DATE_KEY });
    ReactTestRenderer.act(() => {
      findScoreButton(tree, n).props.onPress();
    });
    expect(props.onChoose).toHaveBeenCalledTimes(1);
    expect(props.onChoose).toHaveBeenCalledWith(n);
  });

  test('renders exactly five score buttons', () => {
    const { tree } = render({ dateKey: DATE_KEY });
    const scoreButtons = tree.root.findAll(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        /^Score \d$/.test(node.props.accessibilityLabel) &&
        typeof node.props.onPress === 'function',
    );
    expect(scoreButtons).toHaveLength(5);
  });

  test('marks only the currently chosen score as selected', () => {
    const { tree } = render({ dateKey: DATE_KEY, currentScore: 3 });
    for (const n of [1, 2, 4, 5]) {
      expect(findScoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
    }
    expect(findScoreButton(tree, 3).props.accessibilityState).toEqual({ selected: true });
  });

  test('no score button is selected when the day has no score', () => {
    const { tree } = render({ dateKey: DATE_KEY, currentScore: undefined });
    for (const n of [1, 2, 3, 4, 5]) {
      expect(findScoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
    }
  });
});

describe('ScorePickerBar Clear button', () => {
  test('is disabled when the day has no score', () => {
    const { tree } = render({ dateKey: DATE_KEY, currentScore: undefined });
    expect(findClearButton(tree).props.disabled).toBe(true);
  });

  test('is enabled when the day already has a score', () => {
    const { tree } = render({ dateKey: DATE_KEY, currentScore: 4 });
    expect(findClearButton(tree).props.disabled).toBe(false);
  });

  test('calls onClear when pressed while enabled', () => {
    const { tree, props } = render({ dateKey: DATE_KEY, currentScore: 2 });
    ReactTestRenderer.act(() => {
      findClearButton(tree).props.onPress();
    });
    expect(props.onClear).toHaveBeenCalledTimes(1);
    expect(props.onChoose).not.toHaveBeenCalled();
  });
});

describe('ScorePickerBar note editor', () => {
  test('passes the note draft to the editor', () => {
    const { tree } = render({ dateKey: DATE_KEY, noteDraft: 'Went for a run' });
    const editor = tree.root.findAll(n => n.props.testID === 'note-editor')[0];
    expect(editor.props.children).toBe('Went for a run');
  });

  test('forwards onNoteChange to the editor as onChangeText', () => {
    const { tree, props } = render({ dateKey: DATE_KEY, noteDraft: '' });
    const editor = tree.root.findByProps({ dateKey: DATE_KEY, onChangeText: props.onNoteChange });
    expect(editor.props.onChangeText).toBe(props.onNoteChange);
    ReactTestRenderer.act(() => {
      editor.props.onChangeText('new note');
    });
    expect(props.onNoteChange).toHaveBeenCalledWith('new note');
  });
});

/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: non-interactive vs interactive panel, the date header label, the five
 * score buttons (labels, selection state, callbacks), the Clear button enablement,
 * and note text propagation through the DayNoteEditor.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable } from 'react-native';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';
import type { Score } from '../src/domain/fire';

// Reanimated is mocked so animations run synchronously and deterministically.
// Shared values are plain objects; the animated style hook returns an empty style.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// DayNoteEditor is replaced with a small stand-in that exposes its props so we can
// verify the note text is wired through without depending on its internals.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; value: string; onChangeText: (t: string) => void }) => (
      <Text testID="day-note-editor" onPress={() => props.onChangeText('typed note')}>
        {`${props.dateKey ?? 'none'}|${props.value}`}
      </Text>
    ),
  };
});

type Props = React.ComponentProps<typeof ScorePickerBar>;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    dateKey: '2024-03-15',
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

// Finds the score button for a given number via its accessibility label.
function findScoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number) {
  return tree.root.find(
    node => node.type === Pressable && node.props.accessibilityLabel === `Score ${n}`,
  );
}

function findClearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    node => node.type === Pressable && node.props.accessibilityLabel === "Clear this day's score",
  );
}

describe('ScorePickerBar', () => {
  describe('panel interactivity', () => {
    test('is non-interactive (pointerEvents none) when dateKey is null', () => {
      const tree = render(baseProps({ dateKey: null }));
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    test('is interactive (pointerEvents auto) when dateKey is set', () => {
      const tree = render(baseProps({ dateKey: '2024-03-15' }));
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  describe('header label', () => {
    test('formats the date as weekday, month, and day', () => {
      // 2024-03-15 is a Friday in March.
      const tree = render(baseProps({ dateKey: '2024-03-15' }));
      const texts = tree.root.findAll(n => n.type === require('react-native').Text);
      const labels = texts.map(t => t.props.children);
      expect(labels).toContain('Fri, Mar 15');
    });

    test('shows an empty header when dateKey is null', () => {
      const tree = render(baseProps({ dateKey: null }));
      const texts = tree.root.findAll(n => n.type === require('react-native').Text);
      const labels = texts.map(t => t.props.children);
      expect(labels).toContain('');
    });
  });

  describe('score buttons', () => {
    test.each([1, 2, 3, 4, 5])('renders score button %i with an accessible label', n => {
      const tree = render(baseProps());
      expect(findScoreButton(tree, n)).toBeTruthy();
    });

    test('renders exactly five score buttons', () => {
      const tree = render(baseProps());
      const buttons = tree.root.findAll(
        node => node.type === Pressable &&
          typeof node.props.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith('Score '),
      );
      expect(buttons).toHaveLength(5);
    });

    test.each([1, 2, 3, 4, 5])('pressing score %i calls onChoose with the numeric score', n => {
      const onChoose = jest.fn();
      const tree = render(baseProps({ onChoose }));
      ReactTestRenderer.act(() => {
        findScoreButton(tree, n).props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(n);
    });

    test('marks only the current score as selected', () => {
      const tree = render(baseProps({ currentScore: 3 as Score }));
      for (let n = 1; n <= 5; n++) {
        const selected = findScoreButton(tree, n).props.accessibilityState.selected;
        expect(selected).toBe(n === 3);
      }
    });

    test('marks no score as selected when currentScore is undefined', () => {
      const tree = render(baseProps({ currentScore: undefined }));
      for (let n = 1; n <= 5; n++) {
        expect(findScoreButton(tree, n).props.accessibilityState.selected).toBe(false);
      }
    });
  });

  describe('clear button', () => {
    test('is disabled when currentScore is undefined', () => {
      const tree = render(baseProps({ currentScore: undefined }));
      expect(findClearButton(tree).props.disabled).toBe(true);
    });

    test('is enabled when a score is set', () => {
      const tree = render(baseProps({ currentScore: 4 as Score }));
      expect(findClearButton(tree).props.disabled).toBe(false);
    });

    test('calls onClear when pressed while enabled', () => {
      const onClear = jest.fn();
      const tree = render(baseProps({ currentScore: 2 as Score, onClear }));
      ReactTestRenderer.act(() => {
        findClearButton(tree).props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('day note editor', () => {
    test('passes the current note draft and date to DayNoteEditor', () => {
      const tree = render(baseProps({ dateKey: '2024-03-15', noteDraft: 'hello' }));
      const editor = tree.root.findByProps({ testID: 'day-note-editor' });
      expect(editor.props.children).toBe('2024-03-15|hello');
    });

    test('propagates note text changes through onNoteChange', () => {
      const onNoteChange = jest.fn();
      const tree = render(baseProps({ onNoteChange }));
      const editor = tree.root.findByProps({ testID: 'day-note-editor' });
      ReactTestRenderer.act(() => {
        editor.props.onPress();
      });
      expect(onNoteChange).toHaveBeenCalledWith('typed note');
    });
  });
});

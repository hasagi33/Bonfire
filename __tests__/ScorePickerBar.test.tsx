/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: panel pointer-events gating on dateKey, the header date label
 * (labelFor), score buttons 1..5 forwarding exact numbers, the Clear button's
 * disabled state, the selected accessibility state, and note forwarding.
 * Reanimated and DayNoteEditor are replaced with lightweight stubs so the
 * tests stay deterministic and never touch native code or the network.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Reanimated stub: animations are irrelevant to these assertions, so the
// shared values and styles are plain objects and the timing helpers are identity.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (value: number) => value,
    Easing: { bezier: () => (t: number) => t },
  };
});

// DayNoteEditor stub: a bare TextInput-like host element that records props,
// so the test can call onChangeText directly.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text: MockText } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: (props: { dateKey: string | null; value: string }) =>
      React.createElement(MockText, { testID: 'day-note-editor' }, props.value),
  };
});

type Props = React.ComponentProps<typeof ScorePickerBar>;

const baseProps: Props = {
  dateKey: '2024-03-15',
  currentScore: undefined,
  noteDraft: '',
  onNoteChange: jest.fn(),
  onChoose: jest.fn(),
  onClear: jest.fn(),
};

function render(overrides: Partial<Props> = {}) {
  const props = { ...baseProps, ...overrides };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return { tree, props };
}

// Find the score button whose accessibilityLabel is "Score n".
function findScoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number) {
  return tree.root.find(
    node => node.type === Pressable && node.props.accessibilityLabel === `Score ${n}`,
  );
}

function findClearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    node =>
      node.type === Pressable &&
      node.props.accessibilityLabel === "Clear this day's score",
  );
}

// The bar is the outermost view carrying pointerEvents; find it by its style
// containing the panel background color.
function findPanelPointerEvents(tree: ReactTestRenderer.ReactTestRenderer) {
  const nodes = tree.root.findAll(
    node => typeof node.props.pointerEvents === 'string' && node.props.style !== undefined,
  );
  return nodes[0].props.pointerEvents;
}

describe('ScorePickerBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('panel visibility', () => {
    it('disables pointer events when dateKey is null (closed)', () => {
      const { tree } = render({ dateKey: null });
      expect(findPanelPointerEvents(tree)).toBe('none');
    });

    it('enables pointer events when a dateKey is set (open)', () => {
      const { tree } = render({ dateKey: '2024-03-15' });
      expect(findPanelPointerEvents(tree)).toBe('auto');
    });
  });

  describe('header label', () => {
    it('formats the date as weekday, short month and day', () => {
      // 2024-03-15 is a Friday in March.
      const { tree } = render({ dateKey: '2024-03-15' });
      const texts = tree.root.findAllByType(Text).map(t => t.props.children);
      expect(texts).toContain('Fri, Mar 15');
    });

    it('renders an empty label when closed', () => {
      const { tree } = render({ dateKey: null });
      const texts = tree.root.findAllByType(Text).map(t => t.props.children);
      expect(texts).toContain('');
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5])('calls onChoose with exactly %i when pressed', n => {
      const { tree, props } = render();
      ReactTestRenderer.act(() => {
        findScoreButton(tree, n).props.onPress();
      });
      expect(props.onChoose).toHaveBeenCalledTimes(1);
      expect(props.onChoose).toHaveBeenCalledWith(n);
    });

    it('renders exactly five score buttons', () => {
      const { tree } = render();
      const scoreButtons = tree.root.findAll(
        node =>
          node.type === Pressable &&
          typeof node.props.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.startsWith('Score '),
      );
      expect(scoreButtons).toHaveLength(5);
    });

    it('marks only the currently scored button as selected', () => {
      const { tree } = render({ currentScore: 4 });
      expect(findScoreButton(tree, 4).props.accessibilityState).toEqual({ selected: true });
      expect(findScoreButton(tree, 2).props.accessibilityState).toEqual({ selected: false });
    });

    it('marks no button as selected when there is no score', () => {
      const { tree } = render({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findScoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
      }
    });
  });

  describe('clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = render({ currentScore: undefined });
      expect(findClearButton(tree).props.disabled).toBe(true);
    });

    it('is enabled when a score exists and invokes onClear', () => {
      const { tree, props } = render({ currentScore: 3 });
      const clear = findClearButton(tree);
      expect(clear.props.disabled).toBe(false);
      ReactTestRenderer.act(() => {
        clear.props.onPress();
      });
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('note editor', () => {
    it('passes the note draft through to the editor', () => {
      const { tree } = render({ noteDraft: 'felt focused' });
      const editor = tree.root.findByProps({ testID: 'day-note-editor' });
      expect(editor.props.children).toBe('felt focused');
    });

    it('does not call onNoteChange on render alone', () => {
      const { props } = render({ noteDraft: 'hello' });
      expect(props.onNoteChange).not.toHaveBeenCalled();
    });
  });
});

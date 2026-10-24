/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: open/closed pointer-events, header date label, Clear button enabled
 * state and callback, score buttons 1..5 callbacks, selected accessibility
 * state, and heat tokens used for button colors. react-native-reanimated and
 * the DayNoteEditor child are mocked so the tests stay deterministic.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { heatStyle } from '../src/theme/tokens';
import type { DateKey } from '../src/domain/dates';

// Reanimated ships native worklets that do not run under Jest; replace the
// pieces ScorePickerBar uses with simple JS stand-ins.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// The note editor has its own storage-free UI; stub it out so this test only
// exercises the picker.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => {
      const React = require('react');
      return React.createElement(Text, null, 'note-editor');
    },
  };
});

// Imported after mocks so the mocked modules are used.
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

const DATE_KEY = '2024-03-15' as DateKey; // a Friday in March

interface RenderOptions {
  dateKey?: DateKey | null;
  currentScore?: 1 | 2 | 3 | 4 | 5;
  onChoose?: jest.Mock;
  onClear?: jest.Mock;
  onNoteChange?: jest.Mock;
}

function renderPicker(opts: RenderOptions = {}) {
  const props = {
    dateKey: opts.dateKey === undefined ? DATE_KEY : opts.dateKey,
    currentScore: opts.currentScore,
    noteDraft: '',
    onNoteChange: opts.onNoteChange ?? jest.fn(),
    onChoose: opts.onChoose ?? jest.fn(),
    onClear: opts.onClear ?? jest.fn(),
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return { tree, props };
}

// Find the Pressable/Text host node by its accessibilityLabel.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

function allTexts(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAll(node => node.type === 'Text' || (typeof node.type === 'string' && node.type === 'Text'))
    .map(node => {
      const children = node.props.children;
      return Array.isArray(children) ? children.join('') : String(children ?? '');
    });
}

describe('ScorePickerBar', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('open / closed state', () => {
    it('is interactive (pointerEvents auto) when dateKey is set', () => {
      const { tree } = renderPicker({ dateKey: DATE_KEY });
      const container = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(container.props.pointerEvents).toBe('auto');
    });

    it('ignores touches (pointerEvents none) when dateKey is null', () => {
      const { tree } = renderPicker({ dateKey: null });
      const container = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(container.props.pointerEvents).toBe('none');
    });

    it('renders an empty date label when closed', () => {
      const { tree } = renderPicker({ dateKey: null });
      expect(allTexts(tree)).toContain('');
    });
  });

  describe('header date label', () => {
    it('formats the dateKey as "Weekday, Mon D"', () => {
      const { tree } = renderPicker({ dateKey: DATE_KEY });
      expect(allTexts(tree)).toContain('Fri, Mar 15');
    });

    it('formats a different date correctly', () => {
      const { tree } = renderPicker({ dateKey: '2024-01-01' as DateKey });
      // 2024-01-01 is a Monday
      expect(allTexts(tree)).toContain('Mon, Jan 1');
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = renderPicker({ currentScore: undefined });
      const clear = findByLabel(tree, "Clear this day's score");
      expect(clear.props.disabled).toBe(true);
    });

    it('is enabled when a score is present', () => {
      const { tree } = renderPicker({ currentScore: 3 });
      const clear = findByLabel(tree, "Clear this day's score");
      expect(clear.props.disabled).toBe(false);
    });

    it('invokes onClear when pressed', () => {
      const onClear = jest.fn();
      const { tree } = renderPicker({ currentScore: 4, onClear });
      ReactTestRenderer.act(() => {
        findByLabel(tree, "Clear this day's score").props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as const)('score %i invokes onChoose with the numeric score', n => {
      const onChoose = jest.fn();
      const { tree } = renderPicker({ onChoose });
      ReactTestRenderer.act(() => {
        findByLabel(tree, `Score ${n}`).props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(n);
    });

    it('renders exactly five score buttons', () => {
      const { tree } = renderPicker();
      const buttons = tree.root.findAll(
        n => typeof n.props.accessibilityLabel === 'string' && n.props.accessibilityLabel.startsWith('Score '),
      ).filter(n => typeof n.props.onPress === 'function');
      expect(buttons).toHaveLength(5);
    });

    it('marks only the current score as selected', () => {
      const { tree } = renderPicker({ currentScore: 2 });
      expect(findByLabel(tree, 'Score 2').props.accessibilityState).toEqual({ selected: true });
      expect(findByLabel(tree, 'Score 1').props.accessibilityState).toEqual({ selected: false });
      expect(findByLabel(tree, 'Score 5').props.accessibilityState).toEqual({ selected: false });
    });

    it('marks no score as selected when currentScore is undefined', () => {
      const { tree } = renderPicker({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(findByLabel(tree, `Score ${n}`).props.accessibilityState).toEqual({ selected: false });
      }
    });
  });

  describe('heat colors', () => {
    it.each([1, 2, 3, 4, 5] as const)('score %i uses the heatStyle background token', n => {
      const { tree } = renderPicker();
      const button = findByLabel(tree, `Score ${n}`);
      const style = [button.props.style({ pressed: false })].flat(Infinity) as Array<
        Record<string, unknown> | false | undefined
      >;
      const bg = style.find(s => s && typeof s === 'object' && 'backgroundColor' in s) as
        | { backgroundColor: string }
        | undefined;
      expect(bg?.backgroundColor).toBe(heatStyle(n).background);
    });
  });
});

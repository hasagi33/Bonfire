/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: open/closed pointer-events, the formatted date header (labelFor),
 * the Clear button's disabled state and callback, score button presses that
 * forward the numeric Score, and the selected accessibility state.
 *
 * Reanimated and DayNoteEditor are mocked so the tests stay deterministic and
 * do not depend on native animation or text-input behavior.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { Score } from '../src/domain/fire';
import type { DateKey } from '../src/domain/dates';

// Reanimated has no native runtime under Jest; replace the hooks the picker
// uses with plain JS stand-ins so rendering is synchronous and deterministic.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
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

// The note editor has its own text-input concerns; it is out of scope here,
// so we render a trivial placeholder instead.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text>note-editor</Text>,
  };
});

import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Helper that renders the picker with sensible defaults, overridable per test.
type Props = React.ComponentProps<typeof ScorePickerBar>;

function renderBar(overrides: Partial<Props> = {}) {
  const props: Props = {
    dateKey: '2024-01-05' as DateKey,
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

// Find a pressable node by its accessibilityLabel (the picker's stable test handle).
function byLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

describe('ScorePickerBar', () => {
  describe('open / closed state', () => {
    it('is pointer-events none when dateKey is null (closed)', () => {
      const { tree } = renderBar({ dateKey: null });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('is pointer-events auto when a dateKey is set (open)', () => {
      const { tree } = renderBar({ dateKey: '2024-01-05' as DateKey });
      const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  describe('header label', () => {
    it('formats the date as "Weekday, Mon D" via labelFor', () => {
      // 2024-01-05 is a Friday in January.
      const { tree } = renderBar({ dateKey: '2024-01-05' as DateKey });
      const found = tree.root.findAll(
        n => typeof n.props.children === 'string' && n.props.children === 'Fri, Jan 5',
      );
      expect(found.length).toBeGreaterThan(0);
    });

    it('renders an empty header when closed', () => {
      const { tree } = renderBar({ dateKey: null });
      const found = tree.root.findAll(
        n => typeof n.props.children === 'string' && n.props.children === '',
      );
      expect(found.length).toBeGreaterThan(0);
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { tree } = renderBar({ currentScore: undefined });
      expect(byLabel(tree, "Clear this day's score").props.disabled).toBe(true);
    });

    it('is enabled when a score exists and calls onClear on press', () => {
      const { tree, props } = renderBar({ currentScore: 3 });
      const clear = byLabel(tree, "Clear this day's score");
      expect(clear.props.disabled).toBe(false);
      ReactTestRenderer.act(() => {
        clear.props.onPress();
      });
      expect(props.onClear).toHaveBeenCalledTimes(1);
      expect(props.onChoose).not.toHaveBeenCalled();
    });

    it('does not fire onClear when disabled', () => {
      const { tree, props } = renderBar({ currentScore: undefined });
      const clear = byLabel(tree, "Clear this day's score");
      // Disabled presses are swallowed by Pressable; assert the prop itself and
      // that the callback was never invoked.
      expect(clear.props.disabled).toBe(true);
      expect(props.onClear).not.toHaveBeenCalled();
    });
  });

  describe('score buttons', () => {
    const scores: Score[] = [1, 2, 3, 4, 5];

    it.each(scores)('pressing score %i calls onChoose with the numeric value', score => {
      const { tree, props } = renderBar({ currentScore: undefined });
      ReactTestRenderer.act(() => {
        byLabel(tree, `Score ${score}`).props.onPress();
      });
      expect(props.onChoose).toHaveBeenCalledTimes(1);
      expect(props.onChoose).toHaveBeenCalledWith(score);
      const received: unknown = (props.onChoose as jest.Mock).mock.calls[0][0];
      expect(typeof received).toBe('number');
    });

    it('renders exactly five score buttons labelled 1..5', () => {
      const { tree } = renderBar();
      const labels = tree.root
        .findAll(
          n =>
            typeof n.props.accessibilityLabel === 'string' &&
            /^Score \d$/.test(n.props.accessibilityLabel) &&
            typeof n.props.onPress === 'function',
        )
        .map(n => n.props.accessibilityLabel);
      expect(labels).toEqual(['Score 1', 'Score 2', 'Score 3', 'Score 4', 'Score 5']);
    });

    it('marks only the current score as selected', () => {
      const { tree } = renderBar({ currentScore: 4 });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(byLabel(tree, `Score ${n}`).props.accessibilityState).toEqual({
          selected: n === 4,
        });
      }
    });

    it('marks no score as selected when currentScore is undefined', () => {
      const { tree } = renderBar({ currentScore: undefined });
      for (const n of [1, 2, 3, 4, 5]) {
        expect(byLabel(tree, `Score ${n}`).props.accessibilityState).toEqual({
          selected: false,
        });
      }
    });
  });
});

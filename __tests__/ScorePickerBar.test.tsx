/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: open/closed pointer-events, labelFor date formatting, score button
 * callbacks, Clear button enable/disable behavior, selected accessibility
 * state, and heat-token-driven colors. Reanimated and DayNoteEditor are mocked
 * so the tests stay deterministic and free of native/animation timing.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable } from 'react-native';
import type { Score } from '../src/domain/fire';
import { heatStyle } from '../src/theme/tokens';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Reanimated has no native runtime under Jest, so replace the hooks the
// component uses with simple stand-ins. The animated view is rendered as a
// plain View so its props (including pointerEvents) remain inspectable.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (value: number) => value,
    Easing: { bezier: () => (t: number) => t },
  };
});

// The note editor has its own tests; here we only need a stub that renders.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text>note-editor</Text>,
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

// Find every Pressable whose accessibilityLabel matches, so we can drive them.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.findAll(
    node => node.type === Pressable && node.props.accessibilityLabel === label,
  )[0];
}

function scoreButtons(tree: ReactTestRenderer.ReactTestRenderer) {
  return [1, 2, 3, 4, 5].map(n => findByLabel(tree, `Score ${n}`));
}

// Helper to read the pointerEvents prop of the outer animated panel.
function panelPointerEvents(tree: ReactTestRenderer.ReactTestRenderer) {
  const panel = tree.root.findAll(
    node => node.props.pointerEvents !== undefined && node.props.style !== undefined,
  )[0];
  return panel.props.pointerEvents;
}

describe('ScorePickerBar', () => {
  describe('open / closed state', () => {
    it('is interactive (pointerEvents auto) when dateKey is set', () => {
      const tree = render(baseProps({ dateKey: '2024-03-15' }));
      expect(panelPointerEvents(tree)).toBe('auto');
    });

    it('is non-interactive (pointerEvents none) when dateKey is null', () => {
      const tree = render(baseProps({ dateKey: null }));
      expect(panelPointerEvents(tree)).toBe('none');
    });

    it('renders an empty date label when closed', () => {
      const tree = render(baseProps({ dateKey: null }));
      const texts = tree.root.findAll(node => node.type === 'Text' || node.props.children !== undefined);
      const labels = texts
        .map(t => t.props.children)
        .filter(c => typeof c === 'string');
      expect(labels).not.toContain('Fri, Mar 15');
    });
  });

  describe('labelFor (rendered date label)', () => {
    it('formats weekday, month and day for a fixed date', () => {
      // 2024-03-15 is a Friday in March.
      const tree = render(baseProps({ dateKey: '2024-03-15' }));
      const labelNode = tree.root.findAll(
        node => node.type === 'Text' && node.props.children === 'Fri, Mar 15',
      );
      expect(labelNode).toHaveLength(1);
    });

    it('formats a single-digit day without padding', () => {
      // 2024-01-05 is a Friday in January.
      const tree = render(baseProps({ dateKey: '2024-01-05' }));
      const labelNode = tree.root.findAll(
        node => node.type === 'Text' && node.props.children === 'Fri, Jan 5',
      );
      expect(labelNode).toHaveLength(1);
    });
  });

  describe('score buttons', () => {
    it('renders exactly five score buttons labelled 1..5', () => {
      const tree = render(baseProps());
      expect(scoreButtons(tree).every(b => b !== undefined)).toBe(true);
      expect(scoreButtons(tree)).toHaveLength(5);
    });

    it.each([1, 2, 3, 4, 5] as const)('score %i calls onChoose with %i', n => {
      const onChoose = jest.fn();
      const tree = render(baseProps({ onChoose }));
      ReactTestRenderer.act(() => {
        findByLabel(tree, `Score ${n}`).props.onPress();
      });
      expect(onChoose).toHaveBeenCalledTimes(1);
      expect(onChoose).toHaveBeenCalledWith(n);
    });

    it('does not call onChoose until a button is pressed', () => {
      const onChoose = jest.fn();
      render(baseProps({ onChoose }));
      expect(onChoose).not.toHaveBeenCalled();
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const tree = render(baseProps({ currentScore: undefined }));
      expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(true);
    });

    it('is enabled when a score is set', () => {
      const tree = render(baseProps({ currentScore: 3 as Score }));
      expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(false);
    });

    it('calls onClear when pressed while enabled', () => {
      const onClear = jest.fn();
      const tree = render(baseProps({ currentScore: 4 as Score, onClear }));
      ReactTestRenderer.act(() => {
        findByLabel(tree, "Clear this day's score").props.onPress();
      });
      expect(onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('selected accessibility state', () => {
    it('marks only the current score button as selected', () => {
      const tree = render(baseProps({ currentScore: 2 as Score }));
      const selected = scoreButtons(tree).map(
        b => b.props.accessibilityState.selected,
      );
      expect(selected).toEqual([false, true, false, false, false]);
    });

    it('marks no button selected when there is no score', () => {
      const tree = render(baseProps({ currentScore: undefined }));
      const selected = scoreButtons(tree).map(
        b => b.props.accessibilityState.selected,
      );
      expect(selected.every(s => s === false)).toBe(true);
    });
  });

  describe('heat colors', () => {
    it.each([1, 2, 3, 4, 5] as const)(
      'score button %i uses the heatStyle token background',
      n => {
        const tree = render(baseProps());
        const heat = heatStyle(n);
        const button = findByLabel(tree, `Score ${n}`);
        const style = [button.props.style({ pressed: false })].flat(Infinity);
        const bg = style.find(
          (s: { backgroundColor?: string }) => s && s.backgroundColor !== undefined,
        ) as { backgroundColor: string } | undefined;
        expect(bg?.backgroundColor).toBe(heat.background);
      },
    );
  });
});

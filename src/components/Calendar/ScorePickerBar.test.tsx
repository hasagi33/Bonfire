/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import ScorePickerBar from './ScorePickerBar';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withTiming: (value: number) => value,
    Easing: {
      bezier: () => (t: number) => t,
    },
  };
});

jest.mock('./DayNoteEditor', () => {
  const RN = require('react-native');
  return {
    __esModule: true,
    default: () => RN.View ? null : null,
  };
});

jest.mock('../../theme/tokens', () => ({
  ink: '#ffffff',
  heatStyle: (n: number) => ({
    background: `bg-${n}`,
    color: `fg-${n}`,
    border: n === 1 ? `border-${n}` : undefined,
  }),
}));

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
  } as Props;
}

function render(props: Props) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return tree;
}

function findScoreButtons(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    n => n.type === Pressable && typeof n.props.accessibilityLabel === 'string' &&
      /^Score \d$/.test(n.props.accessibilityLabel),
  );
}

function findClearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n => n.type === Pressable && n.props.accessibilityLabel === "Clear this day's score",
  );
}

describe('ScorePickerBar', () => {
  test('pointerEvents is none when dateKey is null', () => {
    const tree = render(baseProps({ dateKey: null }));
    const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
    expect(bar.props.pointerEvents).toBe('none');
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('pointerEvents is auto when dateKey is set', () => {
    const tree = render(baseProps({ dateKey: '2024-03-15' }));
    const bar = tree.root.findAll(n => n.props.pointerEvents !== undefined)[0];
    expect(bar.props.pointerEvents).toBe('auto');
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('header label shows weekday, month and day via labelFor', () => {
    // 2024-03-15 is a Friday in March.
    const tree = render(baseProps({ dateKey: '2024-03-15' }));
    const texts = tree.root.findAllByType(Text).map(t => t.props.children);
    expect(texts).toContain('Fri, Mar 15');
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('header label is empty when dateKey is null', () => {
    const tree = render(baseProps({ dateKey: null }));
    const texts = tree.root.findAllByType(Text).map(t => t.props.children);
    expect(texts).toContain('');
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('renders score buttons 1 through 5 with heat colors', () => {
    const tree = render(baseProps());
    const buttons = findScoreButtons(tree);
    expect(buttons).toHaveLength(5);
    buttons.forEach((btn, i) => {
      const n = i + 1;
      expect(btn.props.accessibilityLabel).toBe(`Score ${n}`);
      const style = [btn.props.style({ pressed: false })].flat();
      expect(style).toContainEqual({ backgroundColor: `bg-${n}` });
    });
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('applies border color only when heat defines one', () => {
    const tree = render(baseProps());
    const buttons = findScoreButtons(tree);
    const first = [buttons[0].props.style({ pressed: false })].flat();
    const second = [buttons[1].props.style({ pressed: false })].flat();
    expect(first).toContainEqual({ borderColor: 'border-1' });
    expect(second).not.toContainEqual(expect.objectContaining({ borderColor: 'border-2' }));
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('currently selected score has accessibilityState.selected true', () => {
    const tree = render(baseProps({ currentScore: 3 as Props['currentScore'] }));
    const buttons = findScoreButtons(tree);
    buttons.forEach((btn, i) => {
      expect(btn.props.accessibilityState).toEqual({ selected: i + 1 === 3 });
    });
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('no score is selected when currentScore is undefined', () => {
    const tree = render(baseProps({ currentScore: undefined }));
    const buttons = findScoreButtons(tree);
    buttons.forEach(btn => {
      expect(btn.props.accessibilityState).toEqual({ selected: false });
    });
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('pressing a score button calls onChoose with that number', () => {
    const onChoose = jest.fn();
    const tree = render(baseProps({ onChoose }));
    const buttons = findScoreButtons(tree);
    ReactTestRenderer.act(() => buttons[3].props.onPress());
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(4);
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('Clear is disabled when currentScore is undefined', () => {
    const onClear = jest.fn();
    const tree = render(baseProps({ currentScore: undefined, onClear }));
    const clear = findClearButton(tree);
    expect(clear.props.disabled).toBe(true);
    ReactTestRenderer.act(() => tree.unmount());
  });

  test('Clear is enabled when a score is set and calls onClear', () => {
    const onClear = jest.fn();
    const tree = render(baseProps({ currentScore: 2 as Props['currentScore'], onClear }));
    const clear = findClearButton(tree);
    expect(clear.props.disabled).toBe(false);
    ReactTestRenderer.act(() => clear.props.onPress());
    expect(onClear).toHaveBeenCalledTimes(1);
    ReactTestRenderer.act(() => tree.unmount());
  });
});

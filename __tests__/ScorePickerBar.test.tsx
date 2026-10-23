/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker.
 *
 * Covers: the open/closed pointer-events state, the five score buttons calling
 * onChoose with the correct Score, the Clear button being disabled when no
 * score is set and calling onClear otherwise, and the date label produced by
 * labelFor (exercised through the rendered header text).
 *
 * Reanimated is mocked so the animated style hooks run synchronously and the
 * tests do not depend on wall-clock animation timing. DayNoteEditor is mocked
 * so note wiring is verified through its props, not by touching storage.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';
import type { DateKey } from '../src/domain/dates';

// Reanimated mock: the shared value is a plain object, withTiming returns the
// target directly, and the animated style hooks return empty styles. This keeps
// the component renderable under react-test-renderer without native modules.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: RN.View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// DayNoteEditor is stubbed so the test can read the props ScorePickerBar passes
// to it (dateKey, value, onChangeText) without exercising its own storage logic.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const RN = jest.requireActual('react-native');
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: unknown) =>
      React.createElement(RN.Text, { testID: 'day-note-editor' }, JSON.stringify(props)),
  };
});

const DATE_KEY = '2024-03-05' as DateKey; // a Tuesday in March

type Props = React.ComponentProps<typeof ScorePickerBar>;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    dateKey: null,
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

// Finds the pressable whose accessibilityLabel matches, so tests stay tied to
// the accessible contract rather than element ordering.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.type === Pressable && node.props.accessibilityLabel === label,
  );
}

function pressByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  const pressable = findByLabel(tree, label);
  ReactTestRenderer.act(() => {
    pressable.props.onPress();
  });
}

describe('ScorePickerBar pointer events', () => {
  test('is pointer-events none when dateKey is null (closed)', () => {
    const tree = render(baseProps({ dateKey: null }));
    const panel = tree.root.findAll(
      node => node.props.pointerEvents !== undefined && node.props.style !== undefined,
    )[0];
    expect(panel.props.pointerEvents).toBe('none');
  });

  test('is pointer-events auto when a dateKey is set (open)', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY }));
    const panel = tree.root.findAll(
      node => node.props.pointerEvents !== undefined && node.props.style !== undefined,
    )[0];
    expect(panel.props.pointerEvents).toBe('auto');
  });
});

describe('ScorePickerBar score buttons', () => {
  test.each([1, 2, 3, 4, 5] as const)('score button %i calls onChoose with %i', n => {
    const onChoose = jest.fn();
    const tree = render(baseProps({ dateKey: DATE_KEY, onChoose }));
    pressByLabel(tree, `Score ${n}`);
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(n);
  });

  test('renders exactly five score buttons labelled 1 through 5', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY }));
    const labels = tree.root
      .findAll(node => node.type === Pressable && typeof node.props.accessibilityLabel === 'string')
      .map(node => node.props.accessibilityLabel)
      .filter((label: string) => label.startsWith('Score '));
    expect(labels).toEqual(['Score 1', 'Score 2', 'Score 3', 'Score 4', 'Score 5']);
  });

  test('marks the currently chosen score as selected', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY, currentScore: 4 }));
    expect(findByLabel(tree, 'Score 4').props.accessibilityState).toEqual({ selected: true });
    expect(findByLabel(tree, 'Score 3').props.accessibilityState).toEqual({ selected: false });
  });

  test('does not call onClear or onChoose on render alone', () => {
    const onChoose = jest.fn();
    const onClear = jest.fn();
    render(baseProps({ dateKey: DATE_KEY, onChoose, onClear }));
    expect(onChoose).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });
});

describe('ScorePickerBar Clear button', () => {
  test('is disabled when currentScore is undefined', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY, currentScore: undefined }));
    expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(true);
  });

  test('is enabled when a score is set', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY, currentScore: 2 }));
    expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(false);
  });

  test('calls onClear when pressed with a score set', () => {
    const onClear = jest.fn();
    const tree = render(baseProps({ dateKey: DATE_KEY, currentScore: 5, onClear }));
    pressByLabel(tree, "Clear this day's score");
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('ScorePickerBar date label', () => {
  test('formats the header as "Weekday, Mon D" per labelFor', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY }));
    const texts = tree.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter((c: unknown) => typeof c === 'string');
    // 2024-03-05 is a Tuesday in March.
    expect(texts).toContain('Tue, Mar 5');
  });

  test('renders an empty date label when closed', () => {
    const tree = render(baseProps({ dateKey: null }));
    const texts = tree.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter((c: unknown) => typeof c === 'string');
    expect(texts).toContain('');
  });
});

describe('ScorePickerBar note wiring', () => {
  test('passes the note draft and dateKey through to DayNoteEditor', () => {
    const tree = render(
      baseProps({ dateKey: DATE_KEY, noteDraft: 'hello', onNoteChange: jest.fn() }),
    );
    const editor = tree.root.findByProps({ testID: 'day-note-editor' });
    const payload = JSON.parse(editor.props.children as string);
    expect(payload.dateKey).toBe(DATE_KEY);
    expect(payload.value).toBe('hello');
  });
});

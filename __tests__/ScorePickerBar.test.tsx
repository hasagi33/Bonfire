/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: panel pointer-events gating on dateKey, date label formatting via
 * labelFor, score buttons 1..5 with heat colors and selected state, onChoose
 * with numeric Score, Clear enabled/disabled behaviour, and note propagation
 * through the stubbed DayNoteEditor. Reanimated and DayNoteEditor are mocked
 * so the tests are deterministic and never touch native code or the network.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Pressable, Text } from 'react-native';
import type { DateKey } from '../src/domain/dates';
import { heatStyle } from '../src/theme/tokens';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Reanimated is replaced with a plain-JS stub: shared values are simple boxes,
// animated styles resolve immediately, and the keyboard height is always zero.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return {
    __esModule: true,
    default: { View: ReactLib.forwardRef((p: object, r: unknown) => ReactLib.createElement(View, { ...p, ref: r })) },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// DayNoteEditor is stubbed to a simple TextInput-like host so we can drive
// onChangeText directly and observe the value it was given.
const mockNoteEditor = jest.fn();
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { TextInput } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: {
      dateKey: string | null;
      value: string;
      onChangeText: (t: string) => void;
    }) => {
      mockNoteEditor(props);
      return ReactLib.createElement(TextInput, {
        testID: 'day-note-editor',
        value: props.value,
        onChangeText: props.onChangeText,
      });
    },
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DATE_KEY = '2024-03-15' as DateKey; // a Friday in March
const LABEL = 'Fri, Mar 15';

type Props = React.ComponentProps<typeof ScorePickerBar>;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    dateKey: DATE_KEY,
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

// Finds the score button Pressable whose accessibilityLabel matches `Score n`.
function scoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number) {
  return tree.root.find(
    node =>
      node.type === Pressable &&
      node.props.accessibilityLabel === `Score ${n}`,
  );
}

// Finds the Clear Pressable by its accessibilityLabel.
function clearButton(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    node =>
      node.type === Pressable &&
      node.props.accessibilityLabel === "Clear this day's score",
  );
}

// Returns the outer Animated panel, identified by its pointerEvents prop.
function panelOf(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(node => node.props.pointerEvents !== undefined)[0];
}

// Flattens a style prop (object or array) into a single object for assertions.
function flattenStyle(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, s) => ({ ...acc, ...flattenStyle(s) }),
      {},
    );
  }
  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }
  return {};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockNoteEditor.mockClear();
});

describe('ScorePickerBar panel visibility', () => {
  test('pointer-events is "none" when dateKey is null (closed)', () => {
    const tree = render(baseProps({ dateKey: null }));
    expect(panelOf(tree).props.pointerEvents).toBe('none');
  });

  test('pointer-events is "auto" when dateKey is set (open)', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY }));
    expect(panelOf(tree).props.pointerEvents).toBe('auto');
  });

  test('date label is empty when dateKey is null', () => {
    const tree = render(baseProps({ dateKey: null }));
    const emptyTexts = tree.root.findAllByType(Text).filter(
      n => n.props.children === '',
    );
    expect(emptyTexts.length).toBeGreaterThan(0);
  });
});

describe('ScorePickerBar date label', () => {
  test('formats a fixed DateKey with weekday, month and day-of-month', () => {
    const tree = render(baseProps({ dateKey: DATE_KEY }));
    const hasLabel = tree.root.findAll(n => n.props.children === LABEL);
    expect(hasLabel.length).toBeGreaterThan(0);
  });

  test('formats a different date correctly (January 1st)', () => {
    const tree = render(baseProps({ dateKey: '2024-01-01' as DateKey }));
    const hasLabel = tree.root.findAll(n => n.props.children === 'Mon, Jan 1');
    expect(hasLabel.length).toBeGreaterThan(0);
  });
});

describe('ScorePickerBar score buttons', () => {
  test('renders exactly five score buttons labelled 1 through 5', () => {
    const tree = render(baseProps());
    for (const n of [1, 2, 3, 4, 5]) {
      expect(scoreButton(tree, n)).toBeDefined();
    }
  });

  test.each([1, 2, 3, 4, 5] as const)(
    'score %i button uses the heat background token',
    n => {
      const tree = render(baseProps());
      const style = flattenStyle(
        scoreButton(tree, n).props.style({ pressed: false }),
      );
      expect(style).toEqual(
        expect.objectContaining({ backgroundColor: heatStyle(n).background }),
      );
    },
  );

  test('selected state is true only for the button matching currentScore', () => {
    const tree = render(baseProps({ currentScore: 4 }));
    for (const n of [1, 2, 3, 4, 5]) {
      const selected = scoreButton(tree, n).props.accessibilityState.selected;
      expect(selected).toBe(n === 4);
    }
  });

  test('no button is selected when currentScore is undefined', () => {
    const tree = render(baseProps({ currentScore: undefined }));
    for (const n of [1, 2, 3, 4, 5]) {
      expect(scoreButton(tree, n).props.accessibilityState.selected).toBe(false);
    }
  });

  test('pressing a button calls onChoose with the numeric score', () => {
    const onChoose = jest.fn();
    const tree = render(baseProps({ onChoose }));
    ReactTestRenderer.act(() => {
      scoreButton(tree, 3).props.onPress();
    });
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(3);
    expect(typeof onChoose.mock.calls[0][0]).toBe('number');
  });

  test('pressing score 5 calls onChoose with 5', () => {
    const onChoose = jest.fn();
    const tree = render(baseProps({ onChoose }));
    ReactTestRenderer.act(() => {
      scoreButton(tree, 5).props.onPress();
    });
    expect(onChoose).toHaveBeenCalledWith(5);
  });
});

describe('ScorePickerBar Clear button', () => {
  test('is disabled when currentScore is undefined', () => {
    const tree = render(baseProps({ currentScore: undefined }));
    expect(clearButton(tree).props.disabled).toBe(true);
  });

  test('is enabled when a score is set', () => {
    const tree = render(baseProps({ currentScore: 2 }));
    expect(clearButton(tree).props.disabled).toBe(false);
  });

  test('pressing enabled Clear calls onClear', () => {
    const onClear = jest.fn();
    const tree = render(baseProps({ currentScore: 1, onClear }));
    ReactTestRenderer.act(() => {
      clearButton(tree).props.onPress();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('ScorePickerBar note editor', () => {
  test('passes dateKey and noteDraft through to DayNoteEditor', () => {
    render(baseProps({ dateKey: DATE_KEY, noteDraft: 'hello' }));
    expect(mockNoteEditor).toHaveBeenCalledWith(
      expect.objectContaining({ dateKey: DATE_KEY, value: 'hello' }),
    );
  });

  test('note changes propagate to onNoteChange', () => {
    const onNoteChange = jest.fn();
    const tree = render(baseProps({ onNoteChange }));
    const input = tree.root.findByProps({ testID: 'day-note-editor' });
    ReactTestRenderer.act(() => {
      input.props.onChangeText('new text');
    });
    expect(onNoteChange).toHaveBeenCalledWith('new text');
  });
});

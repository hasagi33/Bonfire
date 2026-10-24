/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: the header label formatting (via parseYmd), the five score buttons
 * (1..5 invoke onChoose), the Clear button (disabled when no score, otherwise
 * calls onClear), the selected accessibility state on the active score, and
 * pointerEvents being 'none' when no day is selected.
 *
 * Reanimated animation hooks are replaced with plain-value mocks so the
 * tests stay deterministic and never depend on real timers or device state.
 * DayNoteEditor is treated as an opaque child and stubbed out.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { Score } from '../src/domain/fire';
import { parseYmd } from '../src/domain/dates';
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// Stub the Reanimated hooks with plain values. `Animated.View` is rendered as
// a normal host View so the test renderer can inspect its props directly.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => undefined },
  };
});

// DayNoteEditor is an independent component; replace it with a stub so these
// tests only exercise ScorePickerBar's own rendering and wiring.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <Text>note-editor</Text>,
  };
});

type Props = React.ComponentProps<typeof ScorePickerBar>;

/** Builds a full props object, letting each test override only what it needs. */
function makeProps(overrides: Partial<Props> = {}): Props {
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

/** Renders the component and returns the renderer for querying. */
function render(props: Props): ReactTestRenderer.ReactTestRenderer {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<ScorePickerBar {...props} />);
  });
  return renderer;
}

/** Finds a Pressable-like node by its accessibility label. */
function byLabel(
  renderer: ReactTestRenderer.ReactTestRenderer,
  label: string,
): ReactTestRenderer.ReactTestInstance {
  return renderer.root.find(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

/** Returns the root Animated.View (the first host View carrying pointerEvents). */
function rootView(
  renderer: ReactTestRenderer.ReactTestRenderer,
): ReactTestRenderer.ReactTestInstance {
  return renderer.root.findAll(node => node.props.pointerEvents !== undefined)[0];
}

describe('ScorePickerBar header label', () => {
  test('formats the dateKey as "Weekday, Mon D"', () => {
    const renderer = render(makeProps({ dateKey: '2024-03-15' }));
    const texts = renderer.root.findAllByType('Text' as unknown as React.ElementType);
    const labels = texts.map(t => t.props.children);
    // 2024-03-15 is a Friday in March.
    expect(labels).toContain('Fri, Mar 15');
  });

  test('uses the weekday/month derived from parseYmd, not the raw string', () => {
    const dateKey = '2023-12-31';
    const d = parseYmd(dateKey);
    const renderer = render(makeProps({ dateKey }));
    const labels = renderer.root
      .findAll(node => typeof node.props.children === 'string')
      .map(node => node.props.children);
    const expectedWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const expectedMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const expected = `${expectedWeekdays[d.getDay()]}, ${expectedMonths[d.getMonth()]} ${d.getDate()}`;
    expect(labels).toContain(expected);
  });

  test('renders an empty header label when dateKey is null', () => {
    const renderer = render(makeProps({ dateKey: null }));
    const labels = renderer.root
      .findAll(node => typeof node.props.children === 'string')
      .map(node => node.props.children);
    expect(labels).toContain('');
    expect(labels.some(l => typeof l === 'string' && l.includes(','))).toBe(false);
  });
});

describe('ScorePickerBar score buttons', () => {
  test('renders exactly five score buttons labelled 1 through 5', () => {
    const renderer = render(makeProps());
    for (const n of [1, 2, 3, 4, 5]) {
      expect(byLabel(renderer, `Score ${n}`)).toBeDefined();
    }
    const scoreButtons = renderer.root.findAll(
      node => typeof node.props.accessibilityLabel === 'string' &&
        node.props.accessibilityLabel.startsWith('Score ') &&
        typeof node.props.onPress === 'function',
    );
    expect(scoreButtons).toHaveLength(5);
  });

  test.each([1, 2, 3, 4, 5])('pressing score %i calls onChoose with %i', n => {
    const onChoose = jest.fn();
    const renderer = render(makeProps({ onChoose }));
    ReactTestRenderer.act(() => {
      byLabel(renderer, `Score ${n}`).props.onPress();
    });
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(n);
  });

  test('does not call onClear when a score button is pressed', () => {
    const onClear = jest.fn();
    const renderer = render(makeProps({ onClear }));
    ReactTestRenderer.act(() => {
      byLabel(renderer, 'Score 3').props.onPress();
    });
    expect(onClear).not.toHaveBeenCalled();
  });

  test('marks only the currently scored button as selected', () => {
    const renderer = render(makeProps({ currentScore: 4 as Score }));
    for (const n of [1, 2, 3, 5]) {
      expect(byLabel(renderer, `Score ${n}`).props.accessibilityState).toEqual({ selected: false });
    }
    expect(byLabel(renderer, 'Score 4').props.accessibilityState).toEqual({ selected: true });
  });

  test('no score button is selected when currentScore is undefined', () => {
    const renderer = render(makeProps({ currentScore: undefined }));
    for (const n of [1, 2, 3, 4, 5]) {
      expect(byLabel(renderer, `Score ${n}`).props.accessibilityState).toEqual({ selected: false });
    }
  });
});

describe('ScorePickerBar Clear button', () => {
  test('is disabled when currentScore is undefined', () => {
    const renderer = render(makeProps({ currentScore: undefined }));
    expect(byLabel(renderer, "Clear this day's score").props.disabled).toBe(true);
  });

  test('is enabled when a score exists', () => {
    const renderer = render(makeProps({ currentScore: 2 as Score }));
    expect(byLabel(renderer, "Clear this day's score").props.disabled).toBe(false);
  });

  test('calls onClear when pressed while enabled', () => {
    const onClear = jest.fn();
    const renderer = render(makeProps({ currentScore: 5 as Score, onClear }));
    ReactTestRenderer.act(() => {
      byLabel(renderer, "Clear this day's score").props.onPress();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('does not call onChoose when Clear is pressed', () => {
    const onChoose = jest.fn();
    const renderer = render(makeProps({ currentScore: 1 as Score, onChoose }));
    ReactTestRenderer.act(() => {
      byLabel(renderer, "Clear this day's score").props.onPress();
    });
    expect(onChoose).not.toHaveBeenCalled();
  });
});

describe('ScorePickerBar pointerEvents', () => {
  test('is "none" when dateKey is null (panel closed)', () => {
    const renderer = render(makeProps({ dateKey: null }));
    expect(rootView(renderer).props.pointerEvents).toBe('none');
  });

  test('is "auto" when a dateKey is selected (panel open)', () => {
    const renderer = render(makeProps({ dateKey: '2024-03-15' }));
    expect(rootView(renderer).props.pointerEvents).toBe('auto');
  });
});

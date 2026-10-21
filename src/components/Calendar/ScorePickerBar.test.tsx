/**
 * ScorePickerBar.test.tsx — tests for the inline 1–5 score picker that slides
 * up inside the calendar sheet.
 *
 * Covers: closed/open rendering, date label, score button presses and selected
 * state, token-driven heat colors (including the token border on "1"), Clear
 * enabled/disabled behavior, note forwarding to DayNoteEditor, and the
 * withTiming-driven slide progress.
 *
 * react-native-reanimated and DayNoteEditor are mocked so the suite is
 * deterministic and does not depend on native animation or child internals.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { Score } from '../../domain/fire';
import { heatStyle, ink } from '../../theme/tokens';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockProgressValue = { value: 0 };
const mockKeyboardHeight = { value: 0 };
const mockWithTiming = jest.fn((toValue: number, _config?: unknown) => toValue);
const mockUseSharedValue = jest.fn((initial: number) => {
  mockProgressValue.value = initial;
  return mockProgressValue;
});
const mockUseAnimatedStyle = jest.fn((updater: () => unknown) => updater());
const mockUseAnimatedKeyboard = jest.fn(() => ({ height: mockKeyboardHeight }));
const mockBezier = jest.fn(() => (t: number) => t);

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (updater: () => unknown) => mockUseAnimatedStyle(updater),
    useAnimatedKeyboard: () => mockUseAnimatedKeyboard(),
    useSharedValue: (initial: number) => mockUseSharedValue(initial),
    withTiming: (toValue: number, config?: unknown) => mockWithTiming(toValue, config),
    Easing: { bezier: () => mockBezier() },
  };
});

const mockDayNoteEditor = jest.fn((_props: unknown) => null);
jest.mock('./DayNoteEditor', () => ({
  __esModule: true,
  default: (props: unknown) => mockDayNoteEditor(props),
}));

// Import after mocks are registered.
import ScorePickerBar from './ScorePickerBar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DATE_KEY = '2024-03-15'; // Friday, March 15

function baseProps(overrides: Partial<React.ComponentProps<typeof ScorePickerBar>> = {}) {
  return {
    dateKey: DATE_KEY as React.ComponentProps<typeof ScorePickerBar>['dateKey'],
    currentScore: undefined as Score | undefined,
    noteDraft: '',
    onNoteChange: jest.fn(),
    onChoose: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockProgressValue.value = 0;
  mockKeyboardHeight.value = 0;
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScorePickerBar', () => {
  describe('closed state (dateKey === null)', () => {
    it('sets pointerEvents to none on the container', () => {
      const { UNSAFE_root } = render(<ScorePickerBar {...baseProps({ dateKey: null })} />);
      const container = UNSAFE_root.findAll(
        node => node.props.pointerEvents === 'none',
      );
      expect(container.length).toBeGreaterThan(0);
    });

    it('renders an empty date label', () => {
      const { queryByText } = render(<ScorePickerBar {...baseProps({ dateKey: null })} />);
      expect(queryByText(/Fri|Mon|Tue|Wed|Thu|Sat|Sun/)).toBeNull();
    });

    it('drives progress toward 1 (closed) via withTiming', () => {
      render(<ScorePickerBar {...baseProps({ dateKey: null })} />);
      expect(mockWithTiming).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('passes a null dateKey to DayNoteEditor', () => {
      render(<ScorePickerBar {...baseProps({ dateKey: null })} />);
      expect(mockDayNoteEditor).toHaveBeenCalledWith(
        expect.objectContaining({ dateKey: null }),
      );
    });
  });

  describe('open state (dateKey non-null)', () => {
    it('sets pointerEvents to auto on the container', () => {
      const { UNSAFE_root } = render(<ScorePickerBar {...baseProps()} />);
      const container = UNSAFE_root.findAll(
        node => node.props.pointerEvents === 'auto',
      );
      expect(container.length).toBeGreaterThan(0);
    });

    it('shows the weekday, month and day label from labelFor', () => {
      const { getByText } = render(<ScorePickerBar {...baseProps()} />);
      expect(getByText('Fri, Mar 15')).toBeTruthy();
    });

    it('drives progress toward 0 (open) via withTiming', () => {
      render(<ScorePickerBar {...baseProps()} />);
      expect(mockWithTiming).toHaveBeenCalledWith(0, expect.any(Object));
    });

    it('passes the dateKey to DayNoteEditor', () => {
      render(<ScorePickerBar {...baseProps()} />);
      expect(mockDayNoteEditor).toHaveBeenCalledWith(
        expect.objectContaining({ dateKey: DATE_KEY }),
      );
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as const)('pressing score %i calls onChoose with %i', n => {
      const props = baseProps();
      const { getByLabelText } = render(<ScorePickerBar {...props} />);
      fireEvent.press(getByLabelText(`Score ${n}`));
      expect(props.onChoose).toHaveBeenCalledTimes(1);
      expect(props.onChoose).toHaveBeenCalledWith(n);
    });

    it('marks the active score button as selected', () => {
      const { getByLabelText } = render(
        <ScorePickerBar {...baseProps({ currentScore: 3 })} />,
      );
      expect(getByLabelText('Score 3').props.accessibilityState).toEqual({ selected: true });
    });

    it('does not mark non-active score buttons as selected', () => {
      const { getByLabelText } = render(
        <ScorePickerBar {...baseProps({ currentScore: 3 })} />,
      );
      expect(getByLabelText('Score 1').props.accessibilityState).toEqual({ selected: false });
      expect(getByLabelText('Score 5').props.accessibilityState).toEqual({ selected: false });
    });

    it('applies heat background color from tokens to each button', () => {
      const { getByLabelText } = render(<ScorePickerBar {...baseProps()} />);
      for (const n of [1, 2, 3, 4, 5] as const) {
        const heat = heatStyle(n);
        const btn = getByLabelText(`Score ${n}`);
        const flat = Array.isArray(btn.props.style)
          ? Object.assign({}, ...btn.props.style.map((s: unknown) =>
              typeof s === 'function' ? s({ pressed: false }) : s))
          : btn.props.style;
        expect(flat).toEqual(expect.objectContaining({ backgroundColor: heat.background }));
      }
    });

    it('applies the token border color to the score 1 button', () => {
      const heat = heatStyle(1);
      expect(heat.border).toBeDefined();
      const { getByLabelText } = render(<ScorePickerBar {...baseProps()} />);
      const btn = getByLabelText('Score 1');
      const flat = Array.isArray(btn.props.style)
        ? Object.assign({}, ...btn.props.style.map((s: unknown) =>
            typeof s === 'function' ? s({ pressed: false }) : s))
        : btn.props.style;
      expect(flat).toEqual(expect.objectContaining({ borderColor: heat.border }));
    });

    it('renders each score label with the token text color', () => {
      const { getByText } = render(<ScorePickerBar {...baseProps()} />);
      for (const n of [1, 2, 3, 4, 5] as const) {
        const heat = heatStyle(n);
        const label = getByText(String(n));
        const flat = Array.isArray(label.props.style)
          ? Object.assign({}, ...label.props.style)
          : label.props.style;
        expect(flat).toEqual(expect.objectContaining({ color: heat.color }));
      }
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined', () => {
      const { getByLabelText } = render(<ScorePickerBar {...baseProps()} />);
      expect(getByLabelText("Clear this day's score").props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: true }),
      );
    });

    it('does not call onClear when disabled', () => {
      const props = baseProps();
      const { getByLabelText } = render(<ScorePickerBar {...props} />);
      fireEvent.press(getByLabelText("Clear this day's score"));
      expect(props.onClear).not.toHaveBeenCalled();
    });

    it('is enabled when a score is present', () => {
      const { getByLabelText } = render(
        <ScorePickerBar {...baseProps({ currentScore: 4 })} />,
      );
      const clear = getByLabelText("Clear this day's score");
      expect(clear.props.accessibilityState?.disabled).toBeFalsy();
    });

    it('calls onClear when enabled and pressed', () => {
      const props = baseProps({ currentScore: 4 });
      const { getByLabelText } = render(<ScorePickerBar {...props} />);
      fireEvent.press(getByLabelText("Clear this day's score"));
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });

    it('renders the Clear label with the ink-independent disabled style', () => {
      const { getByText } = render(<ScorePickerBar {...baseProps()} />);
      const label = getByText('Clear');
      const flat = Array.isArray(label.props.style)
        ? Object.assign({}, ...label.props.style)
        : label.props.style;
      expect(flat).toEqual(expect.objectContaining({ opacity: 0.35 }));
    });
  });

  describe('note editor forwarding', () => {
    it('forwards noteDraft as value to DayNoteEditor', () => {
      render(<ScorePickerBar {...baseProps({ noteDraft: 'hello world' })} />);
      expect(mockDayNoteEditor).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'hello world' }),
      );
    });

    it('forwards onNoteChange as onChangeText to DayNoteEditor', () => {
      const onNoteChange = jest.fn();
      render(<ScorePickerBar {...baseProps({ onNoteChange })} />);
      const props = mockDayNoteEditor.mock.calls[mockDayNoteEditor.mock.calls.length - 1][0] as {
        onChangeText: (t: string) => void;
      };
      props.onChangeText('new text');
      expect(onNoteChange).toHaveBeenCalledWith('new text');
    });
  });

  describe('slide animation', () => {
    it('initialises progress shared value to 0', () => {
      render(<ScorePickerBar {...baseProps()} />);
      expect(mockUseSharedValue).toHaveBeenCalledWith(0);
    });

    it('uses withTiming with a duration on open change', () => {
      render(<ScorePickerBar {...baseProps()} />);
      expect(mockWithTiming).toHaveBeenCalledWith(
        0,
        expect.objectContaining({ duration: 300 }),
      );
    });

    it('re-targets progress when dateKey changes from null to a date', () => {
      const { rerender } = render(<ScorePickerBar {...baseProps({ dateKey: null })} />);
      mockWithTiming.mockClear();
      rerender(<ScorePickerBar {...baseProps()} />);
      expect(mockWithTiming).toHaveBeenCalledWith(0, expect.any(Object));
    });

    it('re-targets progress when dateKey changes from a date to null', () => {
      const { rerender } = render(<ScorePickerBar {...baseProps()} />);
      mockWithTiming.mockClear();
      rerender(<ScorePickerBar {...baseProps({ dateKey: null })} />);
      expect(mockWithTiming).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('subtracts keyboard height in the slide transform', () => {
      mockKeyboardHeight.value = 100;
      render(<ScorePickerBar {...baseProps()} />);
      const lastUpdater = mockUseAnimatedStyle.mock.calls[
        mockUseAnimatedStyle.mock.calls.length - 1
      ][0] as () => { transform: { translateY: number }[] };
      const result = lastUpdater();
      expect(result.transform[0].translateY).toBe(0 * 430 - 100);
    });
  });

  describe('label text', () => {
    it('renders the date label with ink-colored text from tokens', () => {
      const { getByText } = render(<ScorePickerBar {...baseProps()} />);
      const label = getByText('Fri, Mar 15');
      const flat = Array.isArray(label.props.style)
        ? Object.assign({}, ...label.props.style)
        : label.props.style;
      expect(flat).toEqual(expect.objectContaining({ color: ink }));
    });

    it('formats single-digit days without padding', () => {
      const { getByText } = render(
        <ScorePickerBar {...baseProps({ dateKey: '2024-01-05' as never })} />,
      );
      expect(getByText('Fri, Jan 5')).toBeTruthy();
    });
  });
});

/**
 * ScorePickerBar.test.tsx — tests for the inline 1–5 score picker panel.
 *
 * Mocks react-native-reanimated and the DayNoteEditor child at the module
 * boundary. No storage, no hooks, no network.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { Score } from '../../domain/fire';
import { heatStyle } from '../../theme/tokens';

// ---------- module mocks ----------

jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (value: number) => value,
    Easing: {
      bezier: () => (t: number) => t,
    },
  };
});

const mockDayNoteEditor = jest.fn((_props: unknown) => null);
jest.mock('./DayNoteEditor', () => ({
  __esModule: true,
  default: (props: unknown) => mockDayNoteEditor(props),
}));

// Import after mocks are registered.
import ScorePickerBar from './ScorePickerBar';

// ---------- helpers ----------

const baseProps = {
  dateKey: '2024-03-15' as const,
  currentScore: undefined as Score | undefined,
  noteDraft: '',
  onNoteChange: jest.fn(),
  onChoose: jest.fn(),
  onClear: jest.fn(),
};

function renderBar(overrides: Partial<typeof baseProps> = {}) {
  const props = {
    ...baseProps,
    onNoteChange: jest.fn(),
    onChoose: jest.fn(),
    onClear: jest.fn(),
    ...overrides,
  };
  const utils = render(<ScorePickerBar {...props} />);
  return { ...utils, props };
}

beforeEach(() => {
  mockDayNoteEditor.mockClear();
});

// ---------- tests ----------

describe('ScorePickerBar', () => {
  describe('pointer events', () => {
    it('is non-interactive (pointerEvents none) when dateKey is null', () => {
      const { UNSAFE_root } = renderBar({ dateKey: null });
      const bar = UNSAFE_root.findAll(
        n => n.props.pointerEvents !== undefined && n.props.style !== undefined,
      )[0];
      expect(bar.props.pointerEvents).toBe('none');
    });

    it('is interactive (pointerEvents auto) when dateKey is non-null', () => {
      const { UNSAFE_root } = renderBar({ dateKey: '2024-03-15' });
      const bar = UNSAFE_root.findAll(
        n => n.props.pointerEvents !== undefined && n.props.style !== undefined,
      )[0];
      expect(bar.props.pointerEvents).toBe('auto');
    });
  });

  describe('header label', () => {
    it('shows weekday, month and day formatted from parseYmd', () => {
      // 2024-03-15 is a Friday.
      const { getByText } = renderBar({ dateKey: '2024-03-15' });
      expect(getByText('Fri, Mar 15')).toBeTruthy();
    });

    it('renders an empty label when dateKey is null', () => {
      const { queryByText } = renderBar({ dateKey: null });
      expect(queryByText(/Mar|Apr|Jan|Feb|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/)).toBeNull();
    });
  });

  describe('Clear button', () => {
    it('is disabled when currentScore is undefined and does not invoke onClear', () => {
      const { getByLabelText, props } = renderBar({ currentScore: undefined });
      const clear = getByLabelText("Clear this day's score");
      expect(clear.props.accessibilityState?.disabled ?? clear.props.disabled).toBeTruthy();
      fireEvent.press(clear);
      expect(props.onClear).not.toHaveBeenCalled();
    });

    it('is enabled when currentScore is set and invokes onClear on press', () => {
      const { getByLabelText, props } = renderBar({ currentScore: 3 });
      const clear = getByLabelText("Clear this day's score");
      expect(clear.props.disabled).toBeFalsy();
      fireEvent.press(clear);
      expect(props.onClear).toHaveBeenCalledTimes(1);
    });
  });

  describe('score buttons', () => {
    it.each([1, 2, 3, 4, 5] as const)('calls onChoose with numeric %i when pressed', n => {
      const { getByLabelText, props } = renderBar();
      fireEvent.press(getByLabelText(`Score ${n}`));
      expect(props.onChoose).toHaveBeenCalledTimes(1);
      expect(props.onChoose).toHaveBeenCalledWith(n);
      expect(typeof props.onChoose.mock.calls[0][0]).toBe('number');
    });

    it('marks only the active score button as selected', () => {
      const { getByLabelText } = renderBar({ currentScore: 4 });
      expect(getByLabelText('Score 4').props.accessibilityState).toEqual({ selected: true });
      expect(getByLabelText('Score 1').props.accessibilityState).toEqual({ selected: false });
      expect(getByLabelText('Score 5').props.accessibilityState).toEqual({ selected: false });
    });

    it('applies the btnActive style to the selected button only', () => {
      const { getByLabelText } = renderBar({ currentScore: 2 });
      const flatten = (style: unknown) =>
        ([] as any[]).concat(style).flat(Infinity).filter(Boolean)
          .reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
      const active = flatten(getByLabelText('Score 2').props.style);
      const inactive = flatten(getByLabelText('Score 3').props.style);
      expect(active.borderWidth).toBe(3);
      expect(active.borderColor).toBe('#3b2a14');
      expect(inactive.borderWidth).toBe(1);
    });

    it.each([1, 2, 3, 4, 5] as const)(
      'takes background and text colors for score %i from heatStyle',
      n => {
        const heat = heatStyle(n);
        const { getByLabelText, getByText } = renderBar();
        const flatten = (style: unknown) =>
          ([] as any[]).concat(style).flat(Infinity).filter(Boolean)
            .reduce((acc: any, s: any) => ({ ...acc, ...s }), {});
        const btn = flatten(getByLabelText(`Score ${n}`).props.style);
        expect(btn.backgroundColor).toBe(heat.background);
        if (heat.border !== undefined) {
          expect(btn.borderColor).toBe(heat.border);
        }
        const text = flatten(getByText(String(n)).props.style);
        expect(text.color).toBe(heat.color);
      },
    );
  });

  describe('note editor', () => {
    it('forwards onNoteChange to DayNoteEditor as onChangeText', () => {
      const { props } = renderBar({ noteDraft: 'hello' });
      const editorProps = mockDayNoteEditor.mock.calls[0][0] as any;
      expect(editorProps.value).toBe('hello');
      expect(editorProps.dateKey).toBe('2024-03-15');
      editorProps.onChangeText('updated');
      expect(props.onNoteChange).toHaveBeenCalledWith('updated');
    });
  });
});

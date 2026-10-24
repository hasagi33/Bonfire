/**
 * ScorePickerBar.test.tsx — unit tests for the inline 1–5 score picker that
 * slides up inside the calendar sheet.
 *
 * Covers: open/closed panel state, header date label formatting, score button
 * presses, selected-state reflection, Clear button enabled/disabled behavior,
 * heat-token colors, and note editor prop forwarding.
 *
 * External dependencies (react-native-reanimated and DayNoteEditor) are mocked
 * so the tests stay deterministic and never touch native modules or the network.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { heatStyle } from '../src/theme/tokens';
import type { DateKey } from '../src/domain/dates';

// --- Mocks ------------------------------------------------------------------

// Reanimated is replaced with a lightweight stub: shared values are plain
// objects, animated styles resolve to an empty style, and timing/easing calls
// are no-ops. This keeps the component renderable under Jest without native code.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    withTiming: (value: number) => value,
    Easing: { bezier: () => () => 0 },
  };
});

// DayNoteEditor is replaced with a spy that records the props it receives,
// so we can assert the note draft and change handler are forwarded correctly.
const mockDayNoteEditor = jest.fn((_props: unknown) => null);
jest.mock('../src/components/Calendar/DayNoteEditor', () => ({
  __esModule: true,
  default: (props: unknown) => mockDayNoteEditor(props),
}));

// Imported after mocks so the component picks up the stubbed modules.
import ScorePickerBar from '../src/components/Calendar/ScorePickerBar';

// --- Helpers ----------------------------------------------------------------

const DATE_KEY = '2024-03-15' as DateKey; // a Friday in March

type Score = 1 | 2 | 3 | 4 | 5;

interface RenderOptions {
  dateKey?: DateKey | null;
  currentScore?: Score;
  noteDraft?: string;
  onNoteChange?: (text: string) => void;
  onChoose?: (score: Score) => void;
  onClear?: () => void;
}

// Renders the picker with sensible defaults and returns the test renderer plus
// the jest mock callbacks so each test can assert on them directly.
function render(options: RenderOptions = {}) {
  const onNoteChange = options.onNoteChange ?? jest.fn();
  const onChoose = options.onChoose ?? jest.fn();
  const onClear = options.onClear ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ScorePickerBar
        dateKey={options.dateKey === undefined ? DATE_KEY : options.dateKey}
        currentScore={options.currentScore}
        noteDraft={options.noteDraft ?? ''}
        onNoteChange={onNoteChange}
        onChoose={onChoose}
        onClear={onClear}
      />,
    );
  });
  return { tree, onNoteChange, onChoose, onClear };
}

// Finds a Pressable-rendered button by its accessibility label.
function findByLabel(tree: ReactTestRenderer.ReactTestRenderer, label: string) {
  return tree.root.find(
    node => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function',
  );
}

// Collects all text content rendered inside the tree, joined for easy matching.
// Host <Text> elements are matched by their string type name.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  return tree.root
    .findAll(node => (node.type as unknown) === 'Text')
    .map(node => (node.children as unknown[]).map(c => String(c)).join(''))
    .join(' ');
}

// Reads the pointerEvents prop from the outer animated panel.
function panelPointerEvents(tree: ReactTestRenderer.ReactTestRenderer) {
  const panel = tree.root.findAll(
    node => node.props.pointerEvents !== undefined && node.props.style !== undefined,
  )[0];
  return panel.props.pointerEvents;
}

beforeEach(() => {
  mockDayNoteEditor.mockClear();
});

// --- Tests ------------------------------------------------------------------

describe('ScorePickerBar panel visibility', () => {
  test('is interactive (pointerEvents auto) when dateKey is set', () => {
    const { tree } = render({ dateKey: DATE_KEY });
    expect(panelPointerEvents(tree)).toBe('auto');
  });

  test('is non-interactive (pointerEvents none) when dateKey is null', () => {
    const { tree } = render({ dateKey: null });
    expect(panelPointerEvents(tree)).toBe('none');
  });
});

describe('ScorePickerBar header label', () => {
  test('formats weekday, month and day from the dateKey', () => {
    const { tree } = render({ dateKey: '2024-03-15' as DateKey });
    expect(allText(tree)).toContain('Fri, Mar 15');
  });

  test('uses the correct weekday for a different date', () => {
    // 2024-01-01 was a Monday.
    const { tree } = render({ dateKey: '2024-01-01' as DateKey });
    expect(allText(tree)).toContain('Mon, Jan 1');
  });

  test('renders an empty date label when dateKey is null', () => {
    const { tree } = render({ dateKey: null });
    expect(allText(tree)).not.toMatch(/\b(Sun|Mon|Tue|Wed|Thu|Fri|Sat),/);
  });
});

describe('ScorePickerBar score buttons', () => {
  test.each([1, 2, 3, 4, 5] as const)('pressing score %i calls onChoose with that number', score => {
    const { tree, onChoose } = render();
    ReactTestRenderer.act(() => {
      findByLabel(tree, `Score ${score}`).props.onPress();
    });
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith(score);
  });

  test('renders exactly five score buttons', () => {
    const { tree } = render();
    const scoreButtons = tree.root.findAll(
      node =>
        typeof node.props.accessibilityLabel === 'string' &&
        /^Score \d$/.test(node.props.accessibilityLabel) &&
        typeof node.props.onPress === 'function',
    );
    expect(scoreButtons).toHaveLength(5);
  });

  test('marks only the currently chosen score as selected', () => {
    const { tree } = render({ currentScore: 4 });
    for (const n of [1, 2, 3, 4, 5]) {
      const btn = findByLabel(tree, `Score ${n}`);
      expect(btn.props.accessibilityState).toEqual({ selected: n === 4 });
    }
  });

  test('marks no score as selected when currentScore is undefined', () => {
    const { tree } = render({ currentScore: undefined });
    for (const n of [1, 2, 3, 4, 5]) {
      const btn = findByLabel(tree, `Score ${n}`);
      expect(btn.props.accessibilityState).toEqual({ selected: false });
    }
  });

  test('applies heat-token background colors rather than hardcoded hex', () => {
    const { tree } = render();
    for (const n of [1, 2, 3, 4, 5] as const) {
      const btn = findByLabel(tree, `Score ${n}`);
      const style = btn.props.style({ pressed: false });
      const flat = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
      expect(flat.backgroundColor).toBe(heatStyle(n).background);
    }
  });
});

describe('ScorePickerBar Clear button', () => {
  test('is disabled when currentScore is undefined', () => {
    const { tree } = render({ currentScore: undefined });
    expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(true);
  });

  test('is enabled when a score exists', () => {
    const { tree } = render({ currentScore: 2 });
    expect(findByLabel(tree, "Clear this day's score").props.disabled).toBe(false);
  });

  test('invokes onClear when pressed with a score present', () => {
    const { tree, onClear } = render({ currentScore: 3 });
    ReactTestRenderer.act(() => {
      findByLabel(tree, "Clear this day's score").props.onPress();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('ScorePickerBar note editor forwarding', () => {
  test('passes noteDraft and dateKey through to DayNoteEditor', () => {
    render({ dateKey: DATE_KEY, noteDraft: 'deep work session' });
    const lastCall = mockDayNoteEditor.mock.calls[mockDayNoteEditor.mock.calls.length - 1];
    expect(lastCall[0]).toMatchObject({
      dateKey: DATE_KEY,
      value: 'deep work session',
    });
  });

  test('forwards onNoteChange as the DayNoteEditor onChangeText handler', () => {
    const onNoteChange = jest.fn();
    render({ onNoteChange });
    const lastCall = mockDayNoteEditor.mock.calls[mockDayNoteEditor.mock.calls.length - 1];
    expect((lastCall[0] as { onChangeText: unknown }).onChangeText).toBe(onNoteChange);
  });
});

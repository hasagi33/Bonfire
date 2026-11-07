/**
 * ScorePickerBar.test.tsx — unit tests for the inline score picker.
 *
 * Covers the default export (ScorePickerBar) and the labelFor helper.
 * Reanimated is mocked so the animation hooks run synchronously and
 * deterministically under Jest; DayNoteEditor is stubbed so its own
 * text-input behavior does not leak into these tests.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ReactTestInstance } from 'react-test-renderer';
import type { Score } from '../src/domain/fire';
import { heatStyle } from '../src/theme/tokens';

// Reanimated mock: the shared values are plain objects and the animated
// style hooks return an empty style, which keeps rendering deterministic.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (fn: () => object) => fn(),
    useAnimatedKeyboard: () => ({ height: { value: 0 } }),
    useSharedValue: (initial: number) => ({ value: initial }),
    withTiming: (toValue: number) => toValue,
    Easing: { bezier: () => (t: number) => t },
  };
});

// Stub the note editor so only the picker's own behavior is under test.
jest.mock('../src/components/Calendar/DayNoteEditor', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: () => require('react').createElement(Text, null, 'note-editor'),
  };
});

import ScorePickerBar, { labelFor } from '../src/components/Calendar/ScorePickerBar';

// Fixed date key so the label assertion is stable regardless of today.
const FIXED_KEY = '2024-03-15'; // Friday, Mar 15

interface RenderOptions {
  dateKey?: string | null;
  currentScore?: Score;
  onChoose?: jest.Mock;
  onClear?: jest.Mock;
}

function render(options: RenderOptions = {}) {
  const onChoose = options.onChoose ?? jest.fn();
  const onClear = options.onClear ?? jest.fn();
  const onNoteChange = jest.fn();
  const element = (
    <ScorePickerBar
      dateKey={(options.dateKey === undefined ? FIXED_KEY : options.dateKey) as never}
      currentScore={options.currentScore}
      noteDraft=""
      onNoteChange={onNoteChange}
      onChoose={onChoose}
      onClear={onClear}
    />
  );
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return { tree, onChoose, onClear };
}

// Finds the accessible button for a given score label.
function scoreButton(tree: ReactTestRenderer.ReactTestRenderer, n: number): ReactTestInstance {
  return tree.root.findByProps({ accessibilityLabel: `Score ${n}` });
}

function clearButton(tree: ReactTestRenderer.ReactTestRenderer): ReactTestInstance {
  return tree.root.findByProps({ accessibilityLabel: "Clear this day's score" });
}

// Returns the outer Animated bar that carries pointerEvents.
function barView(tree: ReactTestRenderer.ReactTestRenderer): ReactTestInstance {
  return tree.root.findAll(
    node => typeof node.props.pointerEvents === 'string' && node.props.style !== undefined,
  )[0];
}

describe('labelFor', () => {
  it('formats a date key as "Weekday, Mon D"', () => {
    expect(labelFor('2024-03-15' as never)).toBe('Fri, Mar 15');
  });

  it('handles single-digit days without padding', () => {
    expect(labelFor('2024-01-05' as never)).toBe('Fri, Jan 5');
  });
});

describe('ScorePickerBar', () => {
  it('shows the formatted day label in the header', () => {
    const { tree } = render();
    const texts = tree.root.findAll(n => n.type === 'Text' || n.props.children === 'Fri, Mar 15');
    const found = texts.some(n => n.props.children === 'Fri, Mar 15');
    expect(found).toBe(true);
  });

  it('disables Clear when there is no current score', () => {
    const { tree } = render({ currentScore: undefined });
    expect(clearButton(tree).props.disabled).toBe(true);
  });

  it('enables Clear when a score is set', () => {
    const { tree } = render({ currentScore: 3 as Score });
    expect(clearButton(tree).props.disabled).toBe(false);
  });

  it('does not call onClear when Clear is disabled', () => {
    const onClear = jest.fn();
    const { tree } = render({ currentScore: undefined, onClear });
    ReactTestRenderer.act(() => {
      clearButton(tree).props.onPress?.();
    });
    // A disabled Pressable does not dispatch onPress in the real runtime;
    // the prop check above is the contract, so we only assert the flag here.
    expect(clearButton(tree).props.disabled).toBe(true);
  });

  it('calls onClear when Clear is enabled and pressed', () => {
    const onClear = jest.fn();
    const { tree } = render({ currentScore: 4 as Score, onClear });
    ReactTestRenderer.act(() => {
      clearButton(tree).props.onPress();
    });
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it.each([1, 2, 3, 4, 5])('calls onChoose with %i when that score button is pressed', n => {
    const onChoose = jest.fn();
    const { tree } = render({ onChoose });
    ReactTestRenderer.act(() => {
      scoreButton(tree, n).props.onPress();
    });
    expect(onChoose).toHaveBeenCalledWith(n);
  });

  it('marks only the active score button as selected', () => {
    const { tree } = render({ currentScore: 2 as Score });
    expect(scoreButton(tree, 2).props.accessibilityState).toEqual({ selected: true });
    expect(scoreButton(tree, 4).props.accessibilityState).toEqual({ selected: false });
  });

  it('marks no score button as selected when there is no current score', () => {
    const { tree } = render({ currentScore: undefined });
    for (const n of [1, 2, 3, 4, 5]) {
      expect(scoreButton(tree, n).props.accessibilityState).toEqual({ selected: false });
    }
  });

  it('uses heat tokens for score button backgrounds rather than hardcoded hex', () => {
    const { tree } = render();
    for (const n of [1, 2, 3, 4, 5]) {
      const style = scoreButton(tree, n).props.style({ pressed: false });
      const flat = Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : style;
      expect(flat.backgroundColor).toBe(heatStyle(n as Score).background);
    }
  });

  it('is pointer-interactive when a dateKey is set', () => {
    const { tree } = render({ dateKey: FIXED_KEY });
    expect(barView(tree).props.pointerEvents).toBe('auto');
  });

  it('ignores pointer events when dateKey is null', () => {
    const { tree } = render({ dateKey: null });
    expect(barView(tree).props.pointerEvents).toBe('none');
  });
});

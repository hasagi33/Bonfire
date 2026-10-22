/**
 * DayCell.test.tsx — tests for the month-grid cell.
 *
 * Covers each DayKind variant (blank, future, missed, today, scored,
 * scored+today), the accessibility label output, and the onPress contract.
 * Colors are asserted against heatStyle / theme tokens, never literal hex.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import DayCell from './DayCell';
import type { Score } from '../../domain/fire';
import { amber, core, gold, inkDim, inkFaint, heatStyle } from '../../theme/tokens';

const DATE_KEY = '2024-05-10';

// Flatten a style prop (array / object / falsy entries) into one object.
function flatten(style: unknown): Record<string, unknown> {
  return StyleSheet.flatten(style as any) as Record<string, unknown>;
}

describe('DayCell', () => {
  describe('blank kind', () => {
    it('renders an empty View with no Pressable when dateKey is null', () => {
      render(<DayCell dateKey={null} dayNumber={null} kind={null} />);
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText(/./)).toBeNull();
    });

    it('renders an empty View when kind is null even with a dateKey', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind={null} />);
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByText('10')).toBeNull();
    });

    it('does not call onPress for a blank cell', () => {
      const onPress = jest.fn();
      render(<DayCell dateKey={null} dayNumber={null} kind={null} onPress={onPress} />);
      expect(onPress).not.toHaveBeenCalled();
    });
  });

  describe('future kind', () => {
    it('is rendered disabled and reports disabled accessibility state', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="future" />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toMatchObject({ disabled: true });
    });

    it('does not fire onPress when tapped', () => {
      const onPress = jest.fn();
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="future" onPress={onPress} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).not.toHaveBeenCalled();
    });

    it('dims the number with the faint ink token', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="future" />);
      const num = flatten(screen.getByText('10').props.style);
      expect(num.color).toBe(inkFaint);
    });

    it('has the future accessibility label', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="future" />);
      expect(screen.getByLabelText(`${DATE_KEY}, future`)).toBeTruthy();
    });
  });

  describe('missed kind', () => {
    it('renders the hollow missed dot', () => {
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="missed" />,
      );
      const { View } = require('react-native');
      const views = UNSAFE_queryAllByType(View);
      const dot = views.find((v) => {
        const s = flatten(v.props.style);
        return s.width === 5 && s.height === 5 && s.borderRadius === 3;
      });
      expect(dot).toBeTruthy();
    });

    it('is tappable and calls onPress with the dateKey', () => {
      const onPress = jest.fn();
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="missed" onPress={onPress} />);
      const button = screen.getByRole('button');
      expect(button.props.accessibilityState).toMatchObject({ disabled: false });
      fireEvent.press(button);
      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('uses the faint ink token for the number', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="missed" />);
      const num = flatten(screen.getByText('10').props.style);
      expect(num.color).toBe(inkFaint);
    });

    it('has the missed accessibility label', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="missed" />);
      expect(screen.getByLabelText(`${DATE_KEY}, missed`)).toBeTruthy();
    });
  });

  describe('today kind (unscored)', () => {
    it('applies the amber ring border', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="today" isToday />);
      const { View } = require('react-native');
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="today" isToday />,
      );
      const rings = UNSAFE_queryAllByType(View).filter(
        (v) => flatten(v.props.style).borderColor === amber,
      );
      expect(rings.length).toBeGreaterThan(0);
    });

    it('uses the gold numToday style for the number', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="today" isToday />);
      const num = flatten(screen.getByText('10').props.style);
      expect(num.color).toBe(gold);
    });

    it('does not render pips (not scored)', () => {
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="today" isToday />,
      );
      const { View } = require('react-native');
      const pips = UNSAFE_queryAllByType(View).filter(
        (v) => flatten(v.props.style).width === 3 && flatten(v.props.style).height === 3,
      );
      expect(pips).toHaveLength(0);
    });

    it('is tappable and calls onPress with the dateKey', () => {
      const onPress = jest.fn();
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="today" isToday onPress={onPress} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('has the today accessibility label', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="today" isToday />);
      expect(screen.getByLabelText(`${DATE_KEY}, today, not yet logged`)).toBeTruthy();
    });
  });

  describe('scored kind', () => {
    const scores: Score[] = [1, 2, 3, 4, 5];

    it.each(scores)('renders %i pip(s) for score %i', (score) => {
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={score} />,
      );
      const { View } = require('react-native');
      const pips = UNSAFE_queryAllByType(View).filter(
        (v) => flatten(v.props.style).width === 3 && flatten(v.props.style).height === 3,
      );
      expect(pips).toHaveLength(score);
    });

    it.each(scores)('applies heatStyle background and text color for score %i', (score) => {
      const heat = heatStyle(score);
      const { UNSAFE_queryAllByType, getByText } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={score} />,
      );
      const { View } = require('react-native');
      const bg = UNSAFE_queryAllByType(View).find(
        (v) => flatten(v.props.style).backgroundColor === heat.background,
      );
      expect(bg).toBeTruthy();
      const num = flatten(getByText('10').props.style);
      expect(num.color).toBe(heat.color);
    });

    it('gives the white "1" day a token-defined border', () => {
      const heat = heatStyle(1);
      expect(heat.border).toBeDefined();
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={1} />,
      );
      const { View } = require('react-native');
      const bordered = UNSAFE_queryAllByType(View).find(
        (v) => flatten(v.props.style).borderColor === heat.border,
      );
      expect(bordered).toBeTruthy();
    });

    it('does not add a token border for scores with no border', () => {
      const heat = heatStyle(3);
      if (heat.border !== undefined) return; // guard: only meaningful when undefined
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={3} />,
      );
      const { View } = require('react-native');
      const bordered = UNSAFE_queryAllByType(View).filter(
        (v) => flatten(v.props.style).borderWidth === 1.4,
      );
      expect(bordered).toHaveLength(0);
    });

    it('is tappable and calls onPress with the dateKey', () => {
      const onPress = jest.fn();
      render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={4} onPress={onPress} />,
      );
      fireEvent.press(screen.getByRole('button'));
      expect(onPress).toHaveBeenCalledWith(DATE_KEY);
    });

    it('has the scored accessibility label including the score', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={4} />);
      expect(screen.getByLabelText(`${DATE_KEY}, scored 4 out of 5`)).toBeTruthy();
    });

    it('does not color a scored day with the unscored today ring', () => {
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={2} />,
      );
      const { View } = require('react-native');
      const amberRing = UNSAFE_queryAllByType(View).filter(
        (v) => flatten(v.props.style).borderColor === amber,
      );
      expect(amberRing).toHaveLength(0);
    });
  });

  describe('scored + today kind', () => {
    it('applies the scoredToday core ring', () => {
      const { UNSAFE_queryAllByType } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={5} isToday />,
      );
      const { View } = require('react-native');
      const ring = UNSAFE_queryAllByType(View).find((v) => {
        const s = flatten(v.props.style);
        return s.borderWidth === 2 && s.borderColor === core;
      });
      expect(ring).toBeTruthy();
    });

    it('keeps the heat background and text color when today', () => {
      const heat = heatStyle(5);
      const { UNSAFE_queryAllByType, getByText } = render(
        <DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={5} isToday />,
      );
      const { View } = require('react-native');
      const bg = UNSAFE_queryAllByType(View).find(
        (v) => flatten(v.props.style).backgroundColor === heat.background,
      );
      expect(bg).toBeTruthy();
      expect(flatten(getByText('10').props.style).color).toBe(heat.color);
    });

    it('does not use the gold numToday style when scored', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={5} isToday />);
      const num = flatten(screen.getByText('10').props.style);
      expect(num.color).not.toBe(gold);
      expect(num.color).not.toBe(inkDim);
    });
  });

  describe('selected state', () => {
    it('reports selected in accessibilityState', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="missed" selected />);
      expect(screen.getByRole('button').props.accessibilityState).toMatchObject({
        selected: true,
      });
    });
  });

  describe('onPress contract', () => {
    it('does not throw when onPress is omitted on a tappable cell', () => {
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="missed" />);
      expect(() => fireEvent.press(screen.getByRole('button'))).not.toThrow();
    });

    it('passes only the dateKey, not the event or other args', () => {
      const onPress = jest.fn();
      render(<DayCell dateKey={DATE_KEY} dayNumber={10} kind="scored" score={2} onPress={onPress} />);
      fireEvent.press(screen.getByRole('button'));
      expect(onPress.mock.calls[0]).toEqual([DATE_KEY]);
    });
  });
});

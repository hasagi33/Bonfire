/**
 * tokens.heat.test.ts — the calendar score heat ramp (003 US3).
 *
 * The ramp is the single source of truth for BOTH the score picker buttons and
 * the scored day cells (Principle IV), so we pin its exact values here:
 * 1 = white → 2 = light yellow → 3 = yellow → 4 = orange → 5 = red, with
 * legible text (≥4.5:1 contrast, FR-008) on every step and an outline on the
 * white "1" so it stays visible on dark surfaces.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import { HEAT, heat1, heat2, heat3, heat4, heat5, heatStyle } from '../src/theme/tokens';
import DayCell from '../src/components/Calendar/DayCell';
import type { Score } from '../src/domain/fire';

// WCAG relative luminance of an "#rrggbb" color (sRGB linearization).
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

// WCAG contrast ratio between two "#rrggbb" colors.
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

describe('heat ramp tokens', () => {
  test('exact ramp values: white → light yellow → yellow → orange → red (FR-007)', () => {
    expect(heat1).toBe('#ffffff');
    expect(heat2).toBe('#fff3c4');
    expect(heat3).toBe('#ffd23b');
    expect(heat4).toBe('#ff9a2e');
    expect(heat5).toBe('#c4310f');
  });

  test('HEAT keeps index 0 unused and lists the five ramp colors', () => {
    expect(HEAT).toEqual(['', heat1, heat3, heat2, heat4, heat5]);
  });

  test('all five backgrounds are pairwise distinct (SC-003)', () => {
    const set = new Set([heat1, heat2, heat3, heat4, heat5]);
    expect(set.size).toBe(5);
  });
});

describe('heatStyle', () => {
  test('text has ≥4.5:1 contrast against its background for every score (FR-008)', () => {
    for (let n = 1; n <= 5; n++) {
      const { background, color } = heatStyle(n);
      expect(contrast(background, color)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('only the white "1" gets a border (visibility edge case)', () => {
    expect(heatStyle(1).border).toBeDefined();
    for (let n = 2; n <= 5; n++) expect(heatStyle(n).border).toBeUndefined();
  });

  test('glow stays present for scores 4–5 only', () => {
    expect(heatStyle(1).glow).toBeUndefined();
    expect(heatStyle(2).glow).toBeUndefined();
    expect(heatStyle(3).glow).toBeUndefined();
    expect(heatStyle(4).glow).toBeDefined();
    expect(heatStyle(5).glow).toBeDefined();
  });
});

describe('DayCell applies the ramp border', () => {
  test('a scored "1" day renders heatStyle(1).border as its outline', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        React.createElement(DayCell, {
          dateKey: '2026-06-10',
          dayNumber: 10,
          kind: 'scored',
          score: 1 as Score,
        }),
      );
    });
    // The visible square is the view painted with the heat background; its
    // flattened style must carry the white-button hairline outline.
    const cellView = tree.root.find(n => {
      if ((n.type as unknown as string) !== 'View') return false;
      const s = StyleSheet.flatten(n.props.style) as { backgroundColor?: string };
      return s?.backgroundColor === heat1;
    });
    const style = StyleSheet.flatten(cellView.props.style) as {
      borderColor?: string;
      borderWidth?: number;
    };
    expect(style.borderColor).toBe(heatStyle(1).border);
    expect(style.borderWidth).toBeGreaterThan(0);
    act(() => tree.unmount());
  });
});

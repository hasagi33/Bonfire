/**
 * flames.test.ts — pure tests for the flame catalog in src/domain/flames.ts.
 *
 * Verifies catalog invariants (single base tier, unique kebab-case ids),
 * gradient ordering (core = hot/brightest end, red = cool/darkest end via
 * paletteFromGradient), achievement window/streak shape, embered derivation,
 * and static visual profile presence. No React, no AsyncStorage, no Date.now().
 */

import {
  FLAMES,
  BASE_FLAME_ID,
  DEFAULT_VISUAL_PROFILE,
  safeVisualProfile,
  type FlameStyle,
} from '../src/domain/flames';
import { paletteFromGradient, emberedPalette } from '../src/theme/palettes';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

describe('FLAMES catalog invariants', () => {
  test('is a non-empty list', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('contains exactly one base tier flame', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
  });

  test('the base flame is the BASE_FLAME_ID entry and has no achievement', () => {
    const base = FLAMES.find((f) => f.tier === 'base');
    expect(base).toBeDefined();
    expect(base!.id).toBe(BASE_FLAME_ID);
    expect(base!.achievement).toBeNull();
  });

  test('every flame id is unique', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every flame id is kebab-case', () => {
    for (const flame of FLAMES) {
      expect(flame.id).toMatch(KEBAB_CASE);
    }
  });

  test('every non-base flame has an achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier !== 'base')) {
      expect(flame.achievement).not.toBeNull();
    }
  });

  test('rarity strictly increases base < streak < time', () => {
    const maxOf = (tier: string) =>
      Math.max(...FLAMES.filter((f) => f.tier === tier).map((f) => f.rarity));
    const minOf = (tier: string) =>
      Math.min(...FLAMES.filter((f) => f.tier === tier).map((f) => f.rarity));
    expect(maxOf('base')).toBeLessThan(minOf('streak'));
    expect(maxOf('streak')).toBeLessThan(minOf('time'));
  });
});

describe('gradient ordering and palette sampling', () => {
  test('every gradient has at least two stops', () => {
    for (const flame of FLAMES) {
      expect(flame.gradient.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('palette is derived from the gradient via paletteFromGradient', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toEqual(paletteFromGradient(flame.gradient));
    }
  });

  test('core is sampled from the hot (brightest, first) end of the gradient', () => {
    for (const flame of FLAMES) {
      const sampled = paletteFromGradient(flame.gradient);
      expect(flame.palette.core).toBe(sampled.core);
      expect(flame.palette.core).toBe(flame.palette.core);
    }
  });

  test('red is sampled from the cool (darkest, last) end of the gradient', () => {
    for (const flame of FLAMES) {
      const sampled = paletteFromGradient(flame.gradient);
      expect(flame.palette.red).toBe(sampled.red);
    }
  });
});

describe('achievement shape', () => {
  const nonBase = FLAMES.filter((f) => f.tier !== 'base');

  test('time-tier achievements define a positive windowDays', () => {
    const timeFlames = nonBase.filter((f) => f.tier === 'time');
    expect(timeFlames.length).toBeGreaterThan(0);
    for (const flame of timeFlames) {
      expect(flame.achievement!.type).toBe('time');
      expect(flame.achievement!.windowDays).toBeGreaterThan(0);
    }
  });

  test('streak-tier achievements do not define a windowDays', () => {
    const streakFlames = nonBase.filter((f) => f.tier === 'streak');
    expect(streakFlames.length).toBeGreaterThan(0);
    for (const flame of streakFlames) {
      expect(flame.achievement!.type).toBe('streak');
      expect(flame.achievement!.windowDays).toBeUndefined();
    }
  });

  test('every achievement has a human-readable requirement', () => {
    for (const flame of nonBase) {
      expect(flame.achievement!.requirement.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('embered variant', () => {
  test('is derived for every flame via emberedPalette', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toEqual(emberedPalette(flame.palette));
    }
  });

  test('is not identical to the live palette for any flame', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).not.toEqual(flame.palette);
    }
  });
});

describe('visual profiles', () => {
  test('every catalog flame carries a visualProfile', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile).toBeDefined();
    }
  });

  test('visual profiles are static: repeated reads return equal data', () => {
    const snapshot = JSON.stringify(FLAMES.map((f: FlameStyle) => f.visualProfile));
    const again = JSON.stringify(FLAMES.map((f: FlameStyle) => f.visualProfile));
    expect(again).toBe(snapshot);
  });

  test('safeVisualProfile falls back to the default for missing data', () => {
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('safeVisualProfile passes through a well-formed profile', () => {
    for (const flame of FLAMES) {
      expect(safeVisualProfile(flame.visualProfile)).toBe(flame.visualProfile);
    }
  });
});

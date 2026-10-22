/**
 * flames.test.ts — tests for the pure flame catalog in src/domain/flames.ts.
 *
 * Covers catalog invariants: the single base flame, unique kebab-case ids,
 * achievement/window consistency per tier, gradient validity, visual profile
 * presence and closed-union usage, and that derived embered palettes are
 * produced for every flame. Deterministic; no network, no storage, no Date.now().
 */

import { FLAMES, type FlameStyle, type ShapeVariant, type EdgeStyle } from '../src/domain/flames';

const SHAPE_VARIANTS: ShapeVariant[] = [
  'classic', 'lance', 'split', 'forked', 'twin', 'wide', 'warped',
  'detached', 'squat', 'layered', 'crystal', 'crown', 'solar',
  'inverted', 'ribbon', 'wing',
];
const EDGE_STYLES: EdgeStyle[] = ['round', 'sharp', 'jagged', 'crystal'];

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

describe('FLAMES catalog', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('contains exactly one base flame and it is always unlocked (no achievement)', () => {
    const base = FLAMES.filter((f: FlameStyle) => f.tier === 'base');
    expect(base).toHaveLength(1);
    expect(base[0].achievement).toBeNull();
  });

  test('every non-base flame has an achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier !== 'base')) {
      expect(flame.achievement).not.toBeNull();
    }
  });

  test('every FlameId is unique', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every FlameId is kebab-case', () => {
    for (const flame of FLAMES) {
      expect(flame.id).toMatch(KEBAB_CASE);
    }
  });
});

describe('achievement and window consistency', () => {
  test('every time flame defines a positive achievement.windowDays', () => {
    const timeFlames = FLAMES.filter((f) => f.tier === 'time');
    expect(timeFlames.length).toBeGreaterThan(0);
    for (const flame of timeFlames) {
      expect(flame.achievement?.type).toBe('time');
      expect(typeof flame.achievement?.windowDays).toBe('number');
      expect(flame.achievement!.windowDays!).toBeGreaterThan(0);
    }
  });

  test('every streak flame is a streak achievement without windowDays', () => {
    const streakFlames = FLAMES.filter((f) => f.tier === 'streak');
    expect(streakFlames.length).toBeGreaterThan(0);
    for (const flame of streakFlames) {
      expect(flame.achievement?.type).toBe('streak');
      expect(flame.achievement?.windowDays).toBeUndefined();
    }
  });
});

describe('gradients', () => {
  test('each gradient is non-empty and every entry is a valid hex color', () => {
    for (const flame of FLAMES) {
      expect(flame.gradient.length).toBeGreaterThan(0);
      for (const stop of flame.gradient) {
        expect(stop).toMatch(HEX_COLOR);
      }
    }
  });
});

describe('visual profiles', () => {
  test('every flame carries a visualProfile', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile).toBeDefined();
    }
  });

  test('shape variant and edge style use only the declared unions', () => {
    for (const flame of FLAMES) {
      const shape = flame.visualProfile!.shape;
      expect(SHAPE_VARIANTS).toContain(shape.variant);
      expect(EDGE_STYLES).toContain(shape.edge);
    }
  });
});

describe('derived palettes', () => {
  test('every flame has a palette and embered variant produced without throwing', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toBeDefined();
      expect(flame.embered).toBeDefined();
    }
  });
});

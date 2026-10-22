/**
 * flames.test.ts — pure unit tests for the flame catalog (src/domain/flames.ts).
 *
 * Covers the five public surface pieces of the catalog:
 *  - FLAMES (the catalog array itself)
 *  - BASE_FLAME_ID / the single always-unlocked 'base' tier flame
 *  - Achievement shape rules (streak vs time windowDays)
 *  - Gradient authoring order and the derived palette mapping
 *  - visualProfile presence and valid ShapeVariant / EdgeStyle values
 *
 * Deterministic by design: no network, no AsyncStorage, no React, no Date.now().
 * Derived palettes come from paletteFromGradient / emberedPalette in
 * '../theme/palettes'; we only read them, never modify the production files.
 */

import { FLAMES, BASE_FLAME_ID, type FlameStyle, type ShapeVariant, type EdgeStyle } from './flames';
import { paletteFromGradient, emberedPalette } from '../theme/palettes';

// Kebab-case: lowercase words joined by single hyphens, digits allowed.
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// The closed sets the renderers understand. Kept in sync with the type unions
// in flames.ts; if a new variant is added there, add it here too.
const SHAPE_VARIANTS: readonly ShapeVariant[] = [
  'classic', 'lance', 'split', 'forked', 'twin', 'wide', 'warped',
  'detached', 'squat', 'layered', 'crystal', 'crown', 'solar',
  'inverted', 'ribbon', 'wing',
];
const EDGE_STYLES: readonly EdgeStyle[] = ['round', 'sharp', 'jagged', 'crystal'];

// Convert "#rrggbb" to its perceived brightness (0..255). Used to verify that
// gradients are authored brightest-to-darkest.
function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function findFlame(id: string): FlameStyle {
  const flame = FLAMES.find((f) => f.id === id);
  if (!flame) throw new Error(`expected flame '${id}' in catalog`);
  return flame;
}

describe('FLAMES catalog', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('contains exactly one base-tier flame', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
  });

  test('the base flame is BASE_FLAME_ID and has no achievement (always unlocked)', () => {
    const base = findFlame(BASE_FLAME_ID);
    expect(base.tier).toBe('base');
    expect(base.achievement).toBeNull();
  });

  test('every non-base flame has an achievement', () => {
    for (const flame of FLAMES) {
      if (flame.tier === 'base') continue;
      expect(flame.achievement).not.toBeNull();
    }
  });

  test('every flame id is unique and kebab-case', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(KEBAB_CASE);
    }
  });

  test('rarity strictly increases base < streak < time', () => {
    const base = FLAMES.filter((f) => f.tier === 'base').map((f) => f.rarity);
    const streaks = FLAMES.filter((f) => f.tier === 'streak').map((f) => f.rarity);
    const times = FLAMES.filter((f) => f.tier === 'time').map((f) => f.rarity);
    expect(Math.max(...base)).toBeLessThan(Math.min(...streaks));
    expect(Math.max(...streaks)).toBeLessThan(Math.min(...times));
  });
});

describe('achievement windows', () => {
  test('every time-tier flame has a positive windowDays', () => {
    const times = FLAMES.filter((f) => f.tier === 'time');
    expect(times.length).toBeGreaterThan(0);
    for (const flame of times) {
      expect(flame.achievement?.type).toBe('time');
      expect(typeof flame.achievement?.windowDays).toBe('number');
      expect(flame.achievement!.windowDays!).toBeGreaterThan(0);
    }
  });

  test('every streak-tier flame has type "streak" and no windowDays', () => {
    const streaks = FLAMES.filter((f) => f.tier === 'streak');
    expect(streaks.length).toBeGreaterThan(0);
    for (const flame of streaks) {
      expect(flame.achievement?.type).toBe('streak');
      expect(flame.achievement?.windowDays).toBeUndefined();
    }
  });

  test('every achievement has a non-empty requirement string', () => {
    for (const flame of FLAMES) {
      if (!flame.achievement) continue;
      expect(flame.achievement.requirement.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('gradients and derived palettes', () => {
  test('every gradient has at least two stops', () => {
    for (const flame of FLAMES) {
      expect(flame.gradient.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('gradients are authored brightest-to-darkest', () => {
    for (const flame of FLAMES) {
      const lums = flame.gradient.map(luminance);
      for (let i = 1; i < lums.length; i++) {
        expect(lums[i]).toBeLessThanOrEqual(lums[i - 1]);
      }
    }
  });

  test('stored palette matches paletteFromGradient(gradient)', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toEqual(paletteFromGradient(flame.gradient));
    }
  });

  test('palette maps the hot (first) gradient stop to core and cool (last) stop to red', () => {
    for (const flame of FLAMES) {
      const first = flame.gradient[0];
      const last = flame.gradient[flame.gradient.length - 1];
      expect(flame.palette.core.toLowerCase()).toBe(first.toLowerCase());
      expect(flame.palette.red.toLowerCase()).toBe(last.toLowerCase());
    }
  });

  test('embered variant is derived from the palette via emberedPalette', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toEqual(emberedPalette(flame.palette));
    }
  });
});

describe('visualProfile', () => {
  test('every flame carries a visualProfile', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile).toBeDefined();
    }
  });

  test('shape variant and edge style are from the valid closed sets', () => {
    for (const flame of FLAMES) {
      const shape = flame.visualProfile!.shape;
      expect(SHAPE_VARIANTS).toContain(shape.variant);
      expect(EDGE_STYLES).toContain(shape.edge);
    }
  });

  test('shape has at least one tongue and motion speed is positive', () => {
    for (const flame of FLAMES) {
      const profile = flame.visualProfile!;
      expect(profile.shape.tongues.length).toBeGreaterThan(0);
      expect(profile.motion.speed).toBeGreaterThan(0);
    }
  });

  test('design metadata is traceable to BonfireDesign', () => {
    for (const flame of FLAMES) {
      const profile = flame.visualProfile!;
      expect(profile.source).toBe('BonfireDesign');
      expect(profile.designNumber).toMatch(/^\d{2}$/);
      expect(['common', 'rare']).toContain(profile.designTier);
    }
  });
});

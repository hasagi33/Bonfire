/**
 * flames.test.ts — tests for the flame catalog (src/domain/flames.ts).
 *
 * Covers the five public exports: FLAMES catalog invariants, FlameId/FlameTier
 * shape, Achievement classification, paletteFromGradient sampling, and
 * emberedPalette derivation. Pure data checks only: no network, no storage,
 * no clock reads.
 */

import { FLAMES, BASE_FLAME_ID, type FlameStyle, type FlameTier } from './flames';
import { paletteFromGradient, emberedPalette } from '../theme/palettes';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;

const isHex = (value: unknown): boolean =>
  typeof value === 'string' && HEX.test(value);

describe('FLAMES catalog — structure', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('contains exactly one base-tier flame', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
  });

  test('the base flame is the BASE_FLAME_ID entry', () => {
    const base = FLAMES.find((f) => f.tier === 'base');
    expect(base?.id).toBe(BASE_FLAME_ID);
  });

  test('the base flame has no achievement (always unlocked)', () => {
    const base = FLAMES.find((f) => f.tier === 'base') as FlameStyle;
    expect(base.achievement).toBeNull();
  });

  test('every tier value is one of the allowed FlameTier literals', () => {
    const allowed: FlameTier[] = ['base', 'streak', 'time'];
    for (const flame of FLAMES) {
      expect(allowed).toContain(flame.tier);
    }
  });
});

describe('FLAMES catalog — ids', () => {
  test('every id is unique', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every id is kebab-case', () => {
    for (const flame of FLAMES) {
      expect(flame.id).toMatch(KEBAB_CASE);
    }
  });

  test('every flame has a non-empty name', () => {
    for (const flame of FLAMES) {
      expect(typeof flame.name).toBe('string');
      expect(flame.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('FLAMES catalog — achievements', () => {
  const nonBase = () => FLAMES.filter((f) => f.tier !== 'base');

  test('every non-base flame has an achievement', () => {
    for (const flame of nonBase()) {
      expect(flame.achievement).not.toBeNull();
    }
  });

  test('achievement type is consistent with flame tier', () => {
    for (const flame of nonBase()) {
      expect(flame.achievement?.type).toBe(flame.tier);
    }
  });

  test('every achievement has a human-readable requirement', () => {
    for (const flame of nonBase()) {
      expect(flame.achievement?.requirement.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  test('time-tier achievements define a positive windowDays', () => {
    const timed = FLAMES.filter((f) => f.tier === 'time');
    for (const flame of timed) {
      const windowDays = flame.achievement?.windowDays;
      expect(typeof windowDays).toBe('number');
      expect(windowDays as number).toBeGreaterThan(0);
    }
  });

  test('streak-tier achievements do not carry a windowDays', () => {
    const streaks = FLAMES.filter((f) => f.tier === 'streak');
    for (const flame of streaks) {
      expect(flame.achievement?.windowDays).toBeUndefined();
    }
  });
});

describe('FLAMES catalog — rarity ordering', () => {
  test('rarity strictly increases base < streak < time', () => {
    const base = FLAMES.filter((f) => f.tier === 'base').map((f) => f.rarity);
    const streak = FLAMES.filter((f) => f.tier === 'streak').map((f) => f.rarity);
    const time = FLAMES.filter((f) => f.tier === 'time').map((f) => f.rarity);

    const maxBase = Math.max(...base);
    const minStreak = Math.min(...streak);
    const maxStreak = Math.max(...streak);
    const minTime = Math.min(...time);

    expect(maxBase).toBeLessThan(minStreak);
    expect(maxStreak).toBeLessThan(minTime);
  });
});

describe('FLAMES catalog — gradients', () => {
  test('every gradient is non-empty', () => {
    for (const flame of FLAMES) {
      expect(Array.isArray(flame.gradient)).toBe(true);
      expect(flame.gradient.length).toBeGreaterThan(0);
    }
  });

  test('every gradient stop is a valid hex color', () => {
    for (const flame of FLAMES) {
      for (const stop of flame.gradient) {
        expect(isHex(stop)).toBe(true);
      }
    }
  });

  test('palette is sampled from the gradient via paletteFromGradient', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toEqual(paletteFromGradient(flame.gradient));
    }
  });

  test('sampled palette exposes core and red entries', () => {
    for (const flame of FLAMES) {
      expect(isHex(flame.palette.core)).toBe(true);
      expect(isHex(flame.palette.red)).toBe(true);
    }
  });

  test('paletteFromGradient maps the brightest stop to core and darkest to red', () => {
    const gradient = ['#ffffff', '#808080', '#000000'];
    const palette = paletteFromGradient(gradient);
    expect(palette.core.toLowerCase()).toBe('#ffffff');
    expect(palette.red.toLowerCase()).toBe('#000000');
  });
});

describe('emberedPalette derivation', () => {
  test('every flame carries an embered variant', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toBeDefined();
    }
  });

  test('embered variant equals emberedPalette(palette) per flame', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toEqual(emberedPalette(flame.palette));
    }
  });

  test('embered variant is a distinct dimmed palette from the live palette', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).not.toEqual(flame.palette);
    }
  });

  test('embered variant keeps all palette stops as valid hex', () => {
    for (const flame of FLAMES) {
      for (const value of Object.values(flame.embered)) {
        expect(isHex(value)).toBe(true);
      }
    }
  });

  test('emberedPalette is deterministic for the same input', () => {
    const palette = paletteFromGradient(['#ffcc00', '#ff6600', '#660000']);
    expect(emberedPalette(palette)).toEqual(emberedPalette(palette));
  });
});

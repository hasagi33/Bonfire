/**
 * flames.test.ts — unit tests for the flame catalog and its pure color helpers.
 *
 * Covers the public surface of src/domain/flames.ts:
 *  - FLAMES catalog invariants (single base tier, unique kebab-case ids,
 *    brightest-to-darkest gradients, achievement/windowDays rules)
 *  - paletteFromGradient / emberedPalette black-box consistency
 *
 * Pure and deterministic: no React, no storage, no clocks, no network.
 */

import { FLAMES } from './flames';
import { paletteFromGradient, emberedPalette } from '../theme/palettes';

// kebab-case: lowercase alphanumeric segments separated by single hyphens.
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Parse "#rrggbb" into its 0..255 channels. Returns null for other formats.
function parseHex(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) {
    return null;
  }
  const value = parseInt(match[1], 16);
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff];
}

// Perceived brightness (simple luma) so we can compare stops by lightness.
function luma(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) {
    throw new Error(`expected #rrggbb hex, got ${hex}`);
  }
  const [r, g, b] = rgb;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

describe('FLAMES catalog', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('contains exactly one base-tier flame and it is always unlocked', () => {
    const bases = FLAMES.filter((flame) => flame.tier === 'base');
    expect(bases).toHaveLength(1);

    // The base flame has no unlock achievement, so it can never be locked.
    expect(bases[0].achievement).toBeNull();
  });

  test('every non-base flame is tied to an achievement', () => {
    const locked = FLAMES.filter((flame) => flame.tier !== 'base');
    expect(locked.length).toBeGreaterThan(0);
    for (const flame of locked) {
      expect(flame.achievement).not.toBeNull();
    }
  });

  test('every flame has a unique kebab-case id', () => {
    const ids = FLAMES.map((flame) => flame.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(KEBAB_CASE);
    }
  });

  test('every gradient has at least two stops, all valid hex colors', () => {
    for (const flame of FLAMES) {
      expect(flame.gradient.length).toBeGreaterThanOrEqual(2);
      for (const stop of flame.gradient) {
        expect(parseHex(stop)).not.toBeNull();
      }
    }
  });

  test('gradients are authored brightest-to-darkest', () => {
    for (const flame of FLAMES) {
      const lumas = flame.gradient.map(luma);
      const first = lumas[0];
      const last = lumas[lumas.length - 1];
      // The hot core (first stop) must be brighter than the cool base (last).
      expect(first).toBeGreaterThan(last);
      // Stops should never get brighter as we move down the list overall.
      for (let i = 1; i < lumas.length; i++) {
        expect(lumas[i]).toBeLessThanOrEqual(lumas[0]);
      }
    }
  });

  test('time-tier achievements define windowDays; streak-tier ones do not', () => {
    for (const flame of FLAMES) {
      if (!flame.achievement) {
        continue;
      }
      if (flame.achievement.type === 'time') {
        expect(typeof flame.achievement.windowDays).toBe('number');
        expect(flame.achievement.windowDays).toBeGreaterThan(0);
      }
      if (flame.achievement.type === 'streak') {
        expect(flame.achievement.windowDays).toBeUndefined();
      }
    }
  });

  test('rarity strictly increases from base to streak to time tiers', () => {
    const base = FLAMES.filter((f) => f.tier === 'base');
    const streaks = FLAMES.filter((f) => f.tier === 'streak');
    const times = FLAMES.filter((f) => f.tier === 'time');

    const maxBase = Math.max(...base.map((f) => f.rarity));
    const maxStreak = streaks.length ? Math.max(...streaks.map((f) => f.rarity)) : -Infinity;
    const minStreak = streaks.length ? Math.min(...streaks.map((f) => f.rarity)) : Infinity;
    const minTime = times.length ? Math.min(...times.map((f) => f.rarity)) : Infinity;

    expect(maxBase).toBeLessThan(minStreak);
    expect(maxStreak).toBeLessThan(minTime);
  });

  test('each flame palette is derived from its own gradient', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toEqual(paletteFromGradient(flame.gradient));
      expect(flame.embered).toEqual(emberedPalette(flame.palette));
    }
  });
});

describe('paletteFromGradient', () => {
  const gradient = ['#ffffff', '#ff8800', '#880000'];

  test('returns a palette object for a valid gradient', () => {
    const palette = paletteFromGradient(gradient);
    expect(palette).toBeDefined();
    expect(typeof palette).toBe('object');
  });

  test('is deterministic for identical input', () => {
    expect(paletteFromGradient(gradient)).toEqual(paletteFromGradient(gradient));
  });

  test('does not mutate the input gradient', () => {
    const copy = [...gradient];
    paletteFromGradient(gradient);
    expect(gradient).toEqual(copy);
  });

  test('a single-color gradient still yields a usable palette', () => {
    const palette = paletteFromGradient(['#ffaa00', '#ffaa00']);
    expect(palette).toBeDefined();
    expect(paletteFromGradient(['#ffaa00', '#ffaa00'])).toEqual(palette);
  });
});

describe('emberedPalette', () => {
  const palette = paletteFromGradient(['#ffe0a0', '#ff8800', '#802000']);

  test('is deterministic for the same palette', () => {
    expect(emberedPalette(palette)).toEqual(emberedPalette(palette));
  });

  test('does not mutate the source palette', () => {
    const snapshot = JSON.parse(JSON.stringify(palette));
    emberedPalette(palette);
    expect(palette).toEqual(snapshot);
  });

  test('produces a palette with the same shape as the source', () => {
    const embered = emberedPalette(palette);
    expect(Object.keys(embered).sort()).toEqual(Object.keys(palette).sort());
  });

  test('is distinct from the vivid source palette (dimmed locked variant)', () => {
    expect(emberedPalette(palette)).not.toEqual(palette);
  });
});

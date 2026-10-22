/**
 * flames.test.ts — integrity and palette tests for the flame catalog.
 *
 * Covers the public surface of src/domain/flames.ts:
 *  - FLAMES catalog integrity (single base tier, unique kebab-case ids,
 *    achievement shape rules per tier, rarity ordering).
 *  - Palette derivation from each gradient (core = hot end, red = cool end,
 *    embered variant derived via emberedPalette).
 *  - visualProfile presence and types.
 *  - Pure helpers: safeVisualProfile fallback behavior.
 *
 * Deterministic: no network, no storage, no wall-clock reads.
 */

import {
  BASE_FLAME_ID,
  BONFIRE_DESIGN_SOURCE,
  DEFAULT_VISUAL_PROFILE,
  FLAMES,
  safeVisualProfile,
  type FlameStyle,
  type VisualProfile,
} from '../domain/flames';
import { emberedPalette, paletteFromGradient } from '../theme/palettes';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// Helper: a value is a finite, non-negative number.
const isNonNegativeNumber = (value: unknown): boolean =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

describe('FLAMES catalog integrity', () => {
  test('catalog is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('exactly one base-tier flame exists', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
  });

  test('the base flame is the BASE_FLAME_ID and has no achievement', () => {
    const base = FLAMES.find((f) => f.tier === 'base');
    expect(base).toBeDefined();
    expect(base?.id).toBe(BASE_FLAME_ID);
    expect(base?.achievement).toBeNull();
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

  test('every flame has a non-empty name', () => {
    for (const flame of FLAMES) {
      expect(typeof flame.name).toBe('string');
      expect(flame.name.trim().length).toBeGreaterThan(0);
    }
  });

  test('every non-base flame carries an achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier !== 'base')) {
      expect(flame.achievement).not.toBeNull();
    }
  });

  test('streak achievements have no windowDays', () => {
    const streaks = FLAMES.filter((f) => f.tier === 'streak');
    expect(streaks.length).toBeGreaterThan(0);
    for (const flame of streaks) {
      expect(flame.achievement?.type).toBe('streak');
      expect(flame.achievement?.windowDays).toBeUndefined();
    }
  });

  test('every time-tier achievement has a positive windowDays', () => {
    const times = FLAMES.filter((f) => f.tier === 'time');
    expect(times.length).toBeGreaterThan(0);
    for (const flame of times) {
      expect(flame.achievement?.type).toBe('time');
      const window = flame.achievement?.windowDays;
      expect(typeof window).toBe('number');
      expect(Number.isInteger(window)).toBe(true);
      expect(window as number).toBeGreaterThan(0);
    }
  });

  test('every achievement has a human-readable requirement', () => {
    for (const flame of FLAMES.filter((f) => f.achievement)) {
      expect(typeof flame.achievement?.requirement).toBe('string');
      expect(flame.achievement?.requirement.trim().length).toBeGreaterThan(0);
    }
  });

  test('rarity strictly increases base < streak < time', () => {
    const maxOf = (tier: FlameStyle['tier']) =>
      Math.max(...FLAMES.filter((f) => f.tier === tier).map((f) => f.rarity));
    const minOf = (tier: FlameStyle['tier']) =>
      Math.min(...FLAMES.filter((f) => f.tier === tier).map((f) => f.rarity));

    expect(maxOf('base')).toBeLessThan(minOf('streak'));
    expect(maxOf('streak')).toBeLessThan(minOf('time'));
  });

  test('rarity values are finite numbers', () => {
    for (const flame of FLAMES) {
      expect(isNonNegativeNumber(flame.rarity)).toBe(true);
    }
  });
});

describe('gradient → palette derivation', () => {
  test('every gradient has at least two stops and valid hex colors', () => {
    for (const flame of FLAMES) {
      expect(flame.gradient.length).toBeGreaterThanOrEqual(2);
      for (const stop of flame.gradient) {
        expect(stop).toMatch(HEX_COLOR);
      }
    }
  });

  test('palette matches paletteFromGradient(gradient) exactly', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toEqual(paletteFromGradient(flame.gradient));
    }
  });

  test('palette.core comes from the hot (first/brightest) end of the gradient', () => {
    for (const flame of FLAMES) {
      const hotEnd = flame.gradient[0];
      expect(flame.palette.core.toLowerCase()).toBe(hotEnd.toLowerCase());
    }
  });

  test('palette.red comes from the cool (last/darkest) end of the gradient', () => {
    for (const flame of FLAMES) {
      const coolEnd = flame.gradient[flame.gradient.length - 1];
      expect(flame.palette.red.toLowerCase()).toBe(coolEnd.toLowerCase());
    }
  });

  test('palette exposes the 5 render stops as valid hex colors', () => {
    for (const flame of FLAMES) {
      for (const value of Object.values(flame.palette)) {
        expect(typeof value).toBe('string');
        expect(value).toMatch(HEX_COLOR);
      }
    }
  });

  test('embered variant is derived from the palette via emberedPalette', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toEqual(emberedPalette(flame.palette));
    }
  });

  test('embered variant keeps the same stop keys as the palette', () => {
    for (const flame of FLAMES) {
      expect(Object.keys(flame.embered).sort()).toEqual(
        Object.keys(flame.palette).sort(),
      );
    }
  });

  test('derivation is deterministic: same gradient yields same palette', () => {
    for (const flame of FLAMES) {
      expect(paletteFromGradient(flame.gradient)).toEqual(
        paletteFromGradient(flame.gradient),
      );
    }
  });
});

describe('visualProfile fields', () => {
  test('every catalog flame supplies a visualProfile', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile).toBeDefined();
    }
  });

  test('every visualProfile is sourced from BonfireDesign', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile?.source).toBe(BONFIRE_DESIGN_SOURCE);
    }
  });

  test('every visualProfile has a two-digit designNumber', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile?.designNumber).toMatch(/^\d{2}$/);
    }
  });

  test('designTier is either common or rare', () => {
    for (const flame of FLAMES) {
      expect(['common', 'rare']).toContain(flame.visualProfile?.designTier);
    }
  });

  test('shape has a string variant, a string edge, and at least one tongue', () => {
    for (const flame of FLAMES) {
      const shape = flame.visualProfile?.shape;
      expect(typeof shape?.variant).toBe('string');
      expect(typeof shape?.edge).toBe('string');
      expect(Array.isArray(shape?.tongues)).toBe(true);
      expect(shape?.tongues.length).toBeGreaterThan(0);
    }
  });

  test('motion has a valid family and a positive speed', () => {
    for (const flame of FLAMES) {
      const motion = flame.visualProfile?.motion;
      expect(['smooth', 'harsh']).toContain(motion?.family);
      expect(typeof motion?.speed).toBe('number');
      expect(motion?.speed as number).toBeGreaterThan(0);
    }
  });

  test('particles is a non-empty array of well-typed populations', () => {
    for (const flame of FLAMES) {
      const particles = flame.visualProfile?.particles;
      expect(Array.isArray(particles)).toBe(true);
      expect(particles?.length).toBeGreaterThan(0);
      for (const particle of particles ?? []) {
        expect(typeof particle.kind).toBe('string');
        expect(isNonNegativeNumber(particle.n)).toBe(true);
        expect(typeof particle.color).toBe('string');
      }
    }
  });

  test('aura has a string kind', () => {
    for (const flame of FLAMES) {
      expect(typeof flame.visualProfile?.aura.kind).toBe('string');
    }
  });

  test('accents is an array', () => {
    for (const flame of FLAMES) {
      expect(Array.isArray(flame.visualProfile?.accents)).toBe(true);
    }
  });

  test('paletteIntent and designRef are present', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile?.paletteIntent).toBeDefined();
      const ref = flame.visualProfile?.designRef;
      expect(ref).toBeDefined();
      expect(typeof ref?.silhouette).toBe('string');
      expect(typeof ref?.core).toBe('string');
      expect(typeof ref?.aura).toBe('string');
      expect(typeof ref?.particles).toBe('string');
      expect(typeof ref?.motion).toBe('string');
      expect(typeof ref?.implementationIntent).toBe('string');
    }
  });
});

describe('safeVisualProfile', () => {
  test('returns the default profile for null or undefined input', () => {
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('returns the default profile for a non-object input', () => {
    expect(safeVisualProfile('oops' as unknown as VisualProfile)).toBe(
      DEFAULT_VISUAL_PROFILE,
    );
  });

  test('passes through a structurally valid catalog profile unchanged', () => {
    for (const flame of FLAMES) {
      const profile = flame.visualProfile;
      if (profile) {
        expect(safeVisualProfile(profile)).toBe(profile);
      }
    }
  });

  test('falls back when the tongue list is empty', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      shape: { ...DEFAULT_VISUAL_PROFILE.shape, tongues: [] },
    } as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('falls back when motion speed is not positive', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      motion: { family: 'smooth', speed: 0 },
    } as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('falls back when designRef is missing', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      designRef: undefined,
    } as unknown as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('never throws on a totally malformed object', () => {
    expect(() => safeVisualProfile({} as VisualProfile)).not.toThrow();
    expect(safeVisualProfile({} as VisualProfile)).toBe(DEFAULT_VISUAL_PROFILE);
  });
});

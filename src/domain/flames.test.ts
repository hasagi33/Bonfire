/**
 * flames.test.ts — tests for the flame catalog (src/domain/flames.ts).
 *
 * Pure assertions only: no AsyncStorage mocks, no Date.now(), no React,
 * no network. The catalog and palette helpers are exercised as data.
 */

import {
  BASE_FLAME_ID,
  DEFAULT_VISUAL_PROFILE,
  FLAMES,
  safeVisualProfile,
  type Achievement,
  type EdgeStyle,
  type FlameId,
  type FlameStyle,
  type FlameTier,
  type ShapeVariant,
} from './flames';
import { emberedPalette, paletteFromGradient } from '../theme/palettes';

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SHAPE_VARIANTS: ReadonlySet<ShapeVariant> = new Set<ShapeVariant>([
  'classic', 'lance', 'split', 'forked', 'twin', 'wide', 'warped',
  'detached', 'squat', 'layered', 'crystal', 'crown', 'solar',
  'inverted', 'ribbon', 'wing',
]);

const EDGE_STYLES: ReadonlySet<EdgeStyle> = new Set<EdgeStyle>([
  'round', 'sharp', 'jagged', 'crystal',
]);

const TIERS: ReadonlySet<FlameTier> = new Set<FlameTier>(['base', 'streak', 'time']);

const flamesOf = (tier: FlameTier): FlameStyle[] => FLAMES.filter((f) => f.tier === tier);

describe('FLAMES catalog — structure', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('exactly one base flame exists and it is BASE_FLAME_ID', () => {
    const bases = flamesOf('base');
    expect(bases).toHaveLength(1);
    expect(bases[0].id).toBe(BASE_FLAME_ID);
  });

  test('base flame has no achievement (always unlocked)', () => {
    const base = FLAMES.find((f) => f.id === BASE_FLAME_ID);
    expect(base).toBeDefined();
    expect(base!.achievement).toBeNull();
  });

  test('every non-base flame has an achievement', () => {
    for (const f of FLAMES.filter((f) => f.tier !== 'base')) {
      expect(f.achievement).not.toBeNull();
    }
  });

  test('every tier is one of the known FlameTier values', () => {
    for (const f of FLAMES) {
      expect(TIERS.has(f.tier)).toBe(true);
    }
  });

  test('rarity strictly increases base < streak < time', () => {
    const maxBase = Math.max(...flamesOf('base').map((f) => f.rarity));
    const minStreak = Math.min(...flamesOf('streak').map((f) => f.rarity));
    const maxStreak = Math.max(...flamesOf('streak').map((f) => f.rarity));
    const minTime = Math.min(...flamesOf('time').map((f) => f.rarity));
    expect(maxBase).toBeLessThan(minStreak);
    expect(maxStreak).toBeLessThan(minTime);
  });
});

describe('FLAMES catalog — ids', () => {
  test('every FlameId is unique', () => {
    const ids: FlameId[] = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every FlameId is kebab-case', () => {
    for (const f of FLAMES) {
      expect(f.id).toMatch(KEBAB_CASE);
    }
  });

  test('every flame has a non-empty display name', () => {
    for (const f of FLAMES) {
      expect(typeof f.name).toBe('string');
      expect(f.name.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('FLAMES catalog — streak achievements', () => {
  test('every streak flame has an achievement of type "streak"', () => {
    for (const f of flamesOf('streak')) {
      expect(f.achievement?.type).toBe('streak');
    }
  });

  test('streak achievements do not define windowDays', () => {
    for (const f of flamesOf('streak')) {
      const a = f.achievement as Achievement;
      expect(a.windowDays).toBeUndefined();
    }
  });

  test('streak achievements have a non-empty requirement string', () => {
    for (const f of flamesOf('streak')) {
      const a = f.achievement as Achievement;
      expect(a.requirement.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('FLAMES catalog — time achievements', () => {
  test('every time flame has an achievement of type "time"', () => {
    for (const f of flamesOf('time')) {
      expect(f.achievement?.type).toBe('time');
    }
  });

  test('every time achievement has a positive integer windowDays', () => {
    for (const f of flamesOf('time')) {
      const a = f.achievement as Achievement;
      expect(typeof a.windowDays).toBe('number');
      expect(Number.isInteger(a.windowDays)).toBe(true);
      expect(a.windowDays as number).toBeGreaterThan(0);
    }
  });
});

describe('FLAMES catalog — gradients and palettes', () => {
  test('every gradient is non-empty', () => {
    for (const f of FLAMES) {
      expect(Array.isArray(f.gradient)).toBe(true);
      expect(f.gradient.length).toBeGreaterThan(0);
    }
  });

  test('every gradient entry is a valid hex color', () => {
    for (const f of FLAMES) {
      for (const stop of f.gradient) {
        expect(stop).toMatch(HEX_COLOR);
      }
    }
  });

  test('paletteFromGradient returns a Palette with core and red set for each flame', () => {
    for (const f of FLAMES) {
      const palette = paletteFromGradient(f.gradient);
      expect(palette.core).toBeDefined();
      expect(palette.red).toBeDefined();
      expect(palette.core).toMatch(HEX_COLOR);
      expect(palette.red).toMatch(HEX_COLOR);
    }
  });

  test('catalog palette matches paletteFromGradient on the same gradient', () => {
    for (const f of FLAMES) {
      expect(f.palette).toEqual(paletteFromGradient(f.gradient));
    }
  });

  test('emberedPalette returns a Palette with core and red set for each flame', () => {
    for (const f of FLAMES) {
      const embered = emberedPalette(f.palette);
      expect(embered.core).toBeDefined();
      expect(embered.red).toBeDefined();
      expect(embered.core).toMatch(HEX_COLOR);
      expect(embered.red).toMatch(HEX_COLOR);
    }
  });

  test('embered output differs from the source palette for each flame', () => {
    for (const f of FLAMES) {
      expect(f.embered).not.toEqual(f.palette);
      expect(f.embered.core).not.toBe(f.palette.core);
    }
  });

  test('embered matches emberedPalette on the source palette', () => {
    for (const f of FLAMES) {
      expect(f.embered).toEqual(emberedPalette(f.palette));
    }
  });
});

describe('FLAMES catalog — visual profiles', () => {
  test('every catalog row supplies a visualProfile', () => {
    for (const f of FLAMES) {
      expect(f.visualProfile).toBeDefined();
    }
  });

  test('every shape variant is a known ShapeVariant', () => {
    for (const f of FLAMES) {
      expect(SHAPE_VARIANTS.has(f.visualProfile!.shape.variant)).toBe(true);
    }
  });

  test('every edge style is a known EdgeStyle', () => {
    for (const f of FLAMES) {
      expect(EDGE_STYLES.has(f.visualProfile!.shape.edge)).toBe(true);
    }
  });

  test('every profile has at least one tongue and positive motion speed', () => {
    for (const f of FLAMES) {
      const p = f.visualProfile!;
      expect(p.shape.tongues.length).toBeGreaterThan(0);
      expect(p.motion.speed).toBeGreaterThan(0);
    }
  });

  test('safeVisualProfile accepts every catalog profile unchanged', () => {
    for (const f of FLAMES) {
      expect(safeVisualProfile(f.visualProfile)).toBe(f.visualProfile);
    }
  });

  test('safeVisualProfile falls back to the default for missing/malformed input', () => {
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('reading profiles does not mutate them', () => {
    const before = FLAMES.map((f) => JSON.stringify(f.visualProfile));
    for (const f of FLAMES) {
      safeVisualProfile(f.visualProfile);
      void f.visualProfile!.shape.variant;
      void f.visualProfile!.particles.length;
    }
    const after = FLAMES.map((f) => JSON.stringify(f.visualProfile));
    expect(after).toEqual(before);
  });
});

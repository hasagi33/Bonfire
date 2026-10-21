/**
 * flames.test.ts — catalog invariants for the flame domain.
 *
 * Pure, deterministic tests: no React, no AsyncStorage, no Date.now(),
 * no network. Covers the FLAMES catalog shape (unique ids, single base flame,
 * tier/achievement well-formedness), the palette derivation helpers, and the
 * visual profile closed sets.
 */

import {
  FLAMES,
  BASE_FLAME_ID,
  DEFAULT_VISUAL_PROFILE,
  safeVisualProfile,
  type FlameId,
  type FlameStyle,
  type FlameTier,
  type Achievement,
  type ShapeVariant,
  type EdgeStyle,
} from './flames';
import { paletteFromGradient, emberedPalette } from '../theme/palettes';

const VALID_TIERS: FlameTier[] = ['base', 'streak', 'time'];

const SHAPE_VARIANTS: ShapeVariant[] = [
  'classic', 'lance', 'split', 'forked', 'twin', 'wide', 'warped',
  'detached', 'squat', 'layered', 'crystal', 'crown', 'solar',
  'inverted', 'ribbon', 'wing',
];

const EDGE_STYLES: EdgeStyle[] = ['round', 'sharp', 'jagged', 'crystal'];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isHexColor(value: unknown): boolean {
  return typeof value === 'string' && HEX_RE.test(value);
}

function expectWellFormedAchievement(flame: FlameStyle, achievement: Achievement): void {
  expect(['streak', 'time']).toContain(achievement.type);
  expect(typeof achievement.kind).toBe('string');
  expect(achievement.params).toBeDefined();
  expect(typeof achievement.requirement).toBe('string');
  expect(achievement.requirement.length).toBeGreaterThan(0);

  if (achievement.type === 'time') {
    expect(typeof achievement.windowDays).toBe('number');
    expect(Number.isInteger(achievement.windowDays)).toBe(true);
    expect(achievement.windowDays!).toBeGreaterThan(0);
  } else {
    // streak flames must not require a window
    expect(achievement.windowDays).toBeUndefined();
  }
  expect(flame.tier).not.toBe('base');
}

describe('FLAMES catalog', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  it('contains exactly one base flame, and it is the Amber default', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
    expect(bases[0].id).toBe(BASE_FLAME_ID);
    expect(bases[0].id).toBe('amber');
  });

  it('always treats the base flame as unlocked (no achievement gate)', () => {
    const base = FLAMES.find((f) => f.id === BASE_FLAME_ID);
    expect(base).toBeDefined();
    expect(base!.achievement).toBeNull();
  });

  it('gives every non-base flame an achievement', () => {
    for (const flame of FLAMES) {
      if (flame.tier === 'base') continue;
      expect(flame.achievement).not.toBeNull();
    }
  });

  it('has unique FlameIds', () => {
    const ids: FlameId[] = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses only valid tiers', () => {
    for (const flame of FLAMES) {
      expect(VALID_TIERS).toContain(flame.tier);
    }
  });

  it('has strictly increasing rarity across base < streak < time', () => {
    const rank: Record<FlameTier, number> = { base: 0, streak: 1, time: 2 };
    const byTier = [...FLAMES].sort((a, b) => a.rarity - b.rarity);
    for (let i = 1; i < byTier.length; i++) {
      expect(rank[byTier[i].tier]).toBeGreaterThanOrEqual(rank[byTier[i - 1].tier]);
    }
    const base = FLAMES.find((f) => f.tier === 'base')!;
    for (const flame of FLAMES) {
      if (flame.tier === 'streak') expect(flame.rarity).toBeGreaterThan(base.rarity);
      if (flame.tier === 'time') expect(flame.rarity).toBeGreaterThan(base.rarity);
    }
  });

  it('authors each gradient with at least two valid hex stops', () => {
    for (const flame of FLAMES) {
      expect(Array.isArray(flame.gradient)).toBe(true);
      expect(flame.gradient.length).toBeGreaterThanOrEqual(2);
      for (const stop of flame.gradient) {
        expect(isHexColor(stop)).toBe(true);
      }
    }
  });

  it('has a well-formed achievement for every flame', () => {
    for (const flame of FLAMES) {
      if (flame.achievement === null) continue;
      expectWellFormedAchievement(flame, flame.achievement);
    }
  });

  it('requires windowDays on time flames and forbids it on streak flames', () => {
    const timeFlames = FLAMES.filter((f) => f.achievement?.type === 'time');
    const streakFlames = FLAMES.filter((f) => f.achievement?.type === 'streak');
    for (const flame of timeFlames) {
      expect(flame.tier).toBe('time');
      expect(flame.achievement!.windowDays).toBeGreaterThan(0);
    }
    for (const flame of streakFlames) {
      expect(flame.tier).toBe('streak');
      expect(flame.achievement!.windowDays).toBeUndefined();
    }
  });
});

describe('palette helpers', () => {
  it('paletteFromGradient maps the hot (first) stop to core and the cool (last) stop to red', () => {
    const gradient = ['#ffffff', '#ff8800', '#880000'];
    const palette = paletteFromGradient(gradient);
    expect(palette.core).toBe(gradient[0]);
    expect(palette.red).toBe(gradient[gradient.length - 1]);
  });

  it('paletteFromGradient is deterministic for the same input', () => {
    const gradient = ['#ffeeaa', '#ff6600', '#440000'];
    expect(paletteFromGradient(gradient)).toEqual(paletteFromGradient(gradient));
  });

  it('every catalog flame palette maps core/red from its gradient ends', () => {
    for (const flame of FLAMES) {
      expect(flame.palette.core).toBe(flame.gradient[0]);
      expect(flame.palette.red).toBe(flame.gradient[flame.gradient.length - 1]);
    }
  });

  it('emberedPalette derives a dim variant that differs from the source palette', () => {
    for (const flame of FLAMES) {
      const derived = emberedPalette(flame.palette);
      expect(derived).toEqual(flame.embered);
      expect(derived).not.toEqual(flame.palette);
    }
  });

  it('emberedPalette is deterministic', () => {
    const palette = paletteFromGradient(['#ffcc00', '#ff3300', '#330000']);
    expect(emberedPalette(palette)).toEqual(emberedPalette(palette));
  });
});

describe('visual profiles', () => {
  it('every catalog flame carries a visualProfile', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile).toBeDefined();
    }
  });

  it('keeps shape variant and edge style inside the closed sets', () => {
    for (const flame of FLAMES) {
      const profile = flame.visualProfile!;
      expect(SHAPE_VARIANTS).toContain(profile.shape.variant);
      expect(EDGE_STYLES).toContain(profile.shape.edge);
    }
  });

  it('keeps motion family within the closed set and speed positive', () => {
    for (const flame of FLAMES) {
      const motion = flame.visualProfile!.motion;
      expect(['smooth', 'harsh']).toContain(motion.family);
      expect(motion.speed).toBeGreaterThan(0);
    }
  });

  it('has at least one tongue per shape', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile!.shape.tongues.length).toBeGreaterThan(0);
    }
  });

  it('keeps aura kind inside the closed set', () => {
    const kinds = ['oval', 'tall', 'wide', 'circular', 'ring'];
    for (const flame of FLAMES) {
      expect(kinds).toContain(flame.visualProfile!.aura.kind);
    }
  });

  it('safeVisualProfile returns the default for missing or malformed profiles', () => {
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('safeVisualProfile passes through a valid catalog profile unchanged', () => {
    const flame = FLAMES.find((f) => f.visualProfile)!;
    expect(safeVisualProfile(flame.visualProfile)).toBe(flame.visualProfile);
  });
});

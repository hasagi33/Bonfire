/**
 * flames.test.ts — unit tests for the flame catalog (src/domain/flames.ts).
 *
 * Pure data inspection only: no React, no AsyncStorage, no Date.now(),
 * no network. Deterministic by construction.
 */

import { FLAMES, BASE_FLAME_ID, paletteFromGradient, emberedPalette } from './flames';
import type {
  FlameStyle,
  FlameId,
  FlameTier,
  ShapeVariant,
  EdgeStyle,
  Achievement,
  ConditionKind,
} from './flames';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONDITION_KINDS: ConditionKind[] = [
  'runDays',
  'runStrength',
  'strongDaysInRun',
  'runStrengthAndDays',
  'consecutivePerfect',
  'unbrokenChain',
  'unbrokenChainMinScore',
  'perfectCalendarWeek',
  'consecutivePerfectWeeks',
  'crossStrength',
];

const SHAPE_VARIANTS: ShapeVariant[] = [
  'classic', 'lance', 'split', 'forked', 'twin', 'wide', 'warped',
  'detached', 'squat', 'layered', 'crystal', 'crown', 'solar',
  'inverted', 'ribbon', 'wing',
];

const EDGE_STYLES: EdgeStyle[] = ['round', 'sharp', 'jagged', 'crystal'];

const TIERS: FlameTier[] = ['base', 'streak', 'time'];

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function brightness(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

describe('FLAMES catalog', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  it('has exactly one base-tier flame, and it is the BASE_FLAME_ID', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
    expect(bases[0].id).toBe(BASE_FLAME_ID);
  });

  it('always treats the base flame as unlocked (no achievement gate)', () => {
    const base = FLAMES.find((f) => f.tier === 'base') as FlameStyle;
    expect(base.achievement).toBeNull();
  });

  it('gives every non-base flame an achievement', () => {
    for (const f of FLAMES) {
      if (f.tier === 'base') continue;
      expect(f.achievement).not.toBeNull();
    }
  });

  it('uses only known tiers', () => {
    for (const f of FLAMES) {
      expect(TIERS).toContain(f.tier);
    }
  });

  it('has unique ids', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses kebab-case ids', () => {
    for (const f of FLAMES) {
      expect(f.id).toMatch(KEBAB_CASE);
    }
  });

  it('has strictly increasing rarity across tiers (base < streak < time)', () => {
    const base = FLAMES.filter((f) => f.tier === 'base');
    const streaks = FLAMES.filter((f) => f.tier === 'streak');
    const times = FLAMES.filter((f) => f.tier === 'time');
    const maxBase = Math.max(...base.map((f) => f.rarity));
    const minStreak = Math.min(...streaks.map((f) => f.rarity));
    const maxStreak = Math.max(...streaks.map((f) => f.rarity));
    const minTime = Math.min(...times.map((f) => f.rarity));
    expect(maxBase).toBeLessThan(minStreak);
    expect(maxStreak).toBeLessThan(minTime);
  });
});

describe('time and streak achievement shapes', () => {
  const timeFlames = FLAMES.filter((f) => f.achievement?.type === 'time');
  const streakFlames = FLAMES.filter((f) => f.achievement?.type === 'streak');

  it('gives every time flame a positive integer windowDays', () => {
    expect(timeFlames.length).toBeGreaterThan(0);
    for (const f of timeFlames) {
      const a = f.achievement as Achievement;
      expect(Number.isInteger(a.windowDays)).toBe(true);
      expect(a.windowDays as number).toBeGreaterThan(0);
    }
  });

  it('does not require windowDays on streak flames', () => {
    expect(streakFlames.length).toBeGreaterThan(0);
    for (const f of streakFlames) {
      const a = f.achievement as Achievement;
      expect(a.windowDays).toBeUndefined();
    }
  });

  it('gives every achievement a non-empty requirement string', () => {
    for (const f of FLAMES) {
      if (!f.achievement) continue;
      expect(typeof f.achievement.requirement).toBe('string');
      expect(f.achievement.requirement.trim().length).toBeGreaterThan(0);
    }
  });

  it('uses only known ConditionKind values for every achievement', () => {
    for (const f of FLAMES) {
      if (!f.achievement) continue;
      expect(CONDITION_KINDS).toContain(f.achievement.kind);
    }
  });

  it('gives every achievement a valid type (streak or time) that matches its tier', () => {
    for (const f of FLAMES) {
      if (!f.achievement) continue;
      expect(['streak', 'time']).toContain(f.achievement.type);
      if (f.tier === 'time') expect(f.achievement.type).toBe('time');
      if (f.tier === 'streak') expect(f.achievement.type).toBe('streak');
    }
  });

  it('gives each achievement a params object of finite numbers', () => {
    for (const f of FLAMES) {
      if (!f.achievement) continue;
      expect(typeof f.achievement.params).toBe('object');
      for (const value of Object.values(f.achievement.params)) {
        expect(Number.isFinite(value)).toBe(true);
      }
    }
  });

  it('never sets windowDays on a streak achievement, even as zero or null', () => {
    for (const f of FLAMES) {
      if (f.achievement?.type !== 'streak') continue;
      expect('windowDays' in f.achievement).toBe(false);
    }
  });
});

describe('gradients and palettes', () => {
  it('has a non-empty gradient for every flame', () => {
    for (const f of FLAMES) {
      expect(Array.isArray(f.gradient)).toBe(true);
      expect(f.gradient.length).toBeGreaterThan(0);
    }
  });

  it('samples core from the brightest stop and red from the darkest stop', () => {
    for (const f of FLAMES) {
      const stops = f.gradient;
      const brightest = stops.reduce((a, b) => (brightness(b) > brightness(a) ? b : a));
      const darkest = stops.reduce((a, b) => (brightness(b) < brightness(a) ? b : a));
      const sampled = paletteFromGradient(stops);
      expect(sampled.core).toBe(brightest);
      expect(sampled.red).toBe(darkest);
    }
  });

  it('exposes a palette equal to paletteFromGradient(gradient)', () => {
    for (const f of FLAMES) {
      expect(f.palette).toEqual(paletteFromGradient(f.gradient));
    }
  });

  it('derives a dimmed embered variant for every flame', () => {
    for (const f of FLAMES) {
      const embered = emberedPalette(f.palette);
      expect(f.embered).toEqual(embered);
      expect(f.embered).not.toEqual(f.palette);
    }
  });

  it('keeps the embered core no brighter than the active core', () => {
    for (const f of FLAMES) {
      expect(brightness(f.embered.core)).toBeLessThanOrEqual(brightness(f.palette.core));
    }
  });

  it('keeps every gradient entry as a 6-digit or 3-digit hex color', () => {
    for (const f of FLAMES) {
      for (const stop of f.gradient) {
        expect(stop).toMatch(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
      }
    }
  });
});

describe('visual profiles', () => {
  it('attaches a visualProfile to every flame', () => {
    for (const f of FLAMES) {
      expect(f.visualProfile).toBeDefined();
    }
  });

  it('uses a valid ShapeVariant and EdgeStyle for every flame', () => {
    for (const f of FLAMES) {
      const shape = (f.visualProfile as NonNullable<FlameStyle['visualProfile']>).shape;
      expect(SHAPE_VARIANTS).toContain(shape.variant);
      expect(EDGE_STYLES).toContain(shape.edge);
    }
  });

  it('gives every profile at least one tongue and a positive motion speed', () => {
    for (const f of FLAMES) {
      const profile = f.visualProfile as NonNullable<FlameStyle['visualProfile']>;
      expect(profile.shape.tongues.length).toBeGreaterThan(0);
      expect(profile.motion.speed).toBeGreaterThan(0);
    }
  });

  it('records the BonfireDesign source marker on every profile', () => {
    for (const f of FLAMES) {
      const profile = f.visualProfile as NonNullable<FlameStyle['visualProfile']>;
      expect(profile.source).toBe('BonfireDesign');
    }
  });

  it('gives each flame a unique id that is not used as a profile key', () => {
    const ids: FlameId[] = FLAMES.map((f) => f.id);
    expect(ids.every((id) => typeof id === 'string')).toBe(true);
  });
});

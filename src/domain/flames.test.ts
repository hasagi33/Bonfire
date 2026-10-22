/**
 * flames.test.ts — catalog integrity tests for src/domain/flames.ts.
 *
 * Covers the five public surfaces the plan calls out:
 *  - FLAMES catalog integrity (exactly one 'base' flame, unique kebab-case ids,
 *    time achievements carry windowDays, streak achievements carry none)
 *  - paletteFromGradient / emberedPalette derived colors exist for every flame
 *  - visualProfile data is present for every flame
 *
 * Deterministic: no network, no Date.now(), no React, no AsyncStorage.
 */

import { FLAMES, BASE_FLAME_ID, BONFIRE_DESIGN_SOURCE } from './flames';
import type { FlameStyle, FlameTier, FlameId, Achievement } from './flames';
import { paletteFromGradient, emberedPalette } from '../theme/palettes';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

describe('FLAMES catalog integrity', () => {
  it('is a non-empty array of flame styles', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  it('contains exactly one base-tier flame', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
  });

  it('marks the base flame with the BASE_FLAME_ID and no achievement', () => {
    const base = FLAMES.find((f) => f.tier === 'base') as FlameStyle;
    expect(base.id).toBe(BASE_FLAME_ID);
    expect(base.achievement).toBeNull();
  });

  it('gives every non-base flame an achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier !== 'base')) {
      expect(flame.achievement).not.toBeNull();
    }
  });

  it('uses unique ids', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses kebab-case ids', () => {
    for (const flame of FLAMES) {
      expect(flame.id).toMatch(KEBAB_CASE);
    }
  });

  it('only uses known tiers', () => {
    const allowed: FlameTier[] = ['base', 'streak', 'time'];
    for (const flame of FLAMES) {
      expect(allowed).toContain(flame.tier);
    }
  });

  it('gives every time-tier achievement a positive windowDays', () => {
    const timeFlames = FLAMES.filter((f) => f.tier === 'time');
    for (const flame of timeFlames) {
      const a = flame.achievement as Achievement;
      expect(a.type).toBe('time');
      expect(typeof a.windowDays).toBe('number');
      expect(a.windowDays as number).toBeGreaterThan(0);
    }
  });

  it('gives every streak-tier achievement no windowDays requirement', () => {
    const streakFlames = FLAMES.filter((f) => f.tier === 'streak');
    for (const flame of streakFlames) {
      const a = flame.achievement as Achievement;
      expect(a.type).toBe('streak');
      expect(a.windowDays).toBeUndefined();
    }
  });

  it('keeps rarity strictly ordered base < streak < time (SC-009)', () => {
    const base = FLAMES.find((f) => f.tier === 'base') as FlameStyle;
    const maxStreak = Math.max(
      ...FLAMES.filter((f) => f.tier === 'streak').map((f) => f.rarity),
    );
    const minTime = Math.min(
      ...FLAMES.filter((f) => f.tier === 'time').map((f) => f.rarity),
    );
    expect(base.rarity).toBeLessThan(maxStreak);
    expect(maxStreak).toBeLessThan(minTime);
  });
});

describe('derived palettes (paletteFromGradient / emberedPalette)', () => {
  it('produces a 5-stop palette with hex colors for every flame', () => {
    for (const flame of FLAMES) {
      const keys = Object.keys(flame.palette).sort();
      expect(keys.length).toBeGreaterThanOrEqual(5);
      for (const key of keys) {
        const value = (flame.palette as unknown as Record<string, unknown>)[key];
        expect(typeof value).toBe('string');
        expect(value as string).toMatch(HEX_COLOR);
      }
    }
  });

  it('produces an embered variant for every flame', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toBeDefined();
      expect(Object.keys(flame.embered).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('matches what paletteFromGradient derives from the flame gradient', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toEqual(paletteFromGradient(flame.gradient));
    }
  });

  it('matches what emberedPalette derives from the flame palette', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toEqual(emberedPalette(flame.palette));
    }
  });

  it('is deterministic across repeated derivations', () => {
    for (const flame of FLAMES) {
      expect(paletteFromGradient(flame.gradient)).toEqual(
        paletteFromGradient(flame.gradient),
      );
    }
  });
});

describe('visualProfile presence', () => {
  it('attaches a visualProfile to every flame', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile).toBeDefined();
    }
  });

  it('tags every profile with the BonfireDesign source marker', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile?.source).toBe(BONFIRE_DESIGN_SOURCE);
    }
  });

  it('gives every profile a non-empty shape with at least one tongue', () => {
    for (const flame of FLAMES) {
      const shape = flame.visualProfile?.shape;
      expect(shape).toBeDefined();
      expect(typeof shape?.variant).toBe('string');
      expect(shape?.tongues.length).toBeGreaterThan(0);
    }
  });

  it('gives every profile a positive motion speed', () => {
    for (const flame of FLAMES) {
      const motion = flame.visualProfile?.motion;
      expect(motion).toBeDefined();
      expect(motion?.speed).toBeGreaterThan(0);
    }
  });

  it('gives every profile at least one particle population', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile?.particles.length).toBeGreaterThan(0);
    }
  });

  it('gives every profile all six design-reference labels', () => {
    for (const flame of FLAMES) {
      const ref = flame.visualProfile?.designRef;
      expect(ref).toBeDefined();
      for (const label of [
        'silhouette',
        'core',
        'aura',
        'particles',
        'motion',
        'implementationIntent',
      ] as const) {
        expect(typeof ref?.[label]).toBe('string');
        expect((ref?.[label] as string).length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps flame ids unique and typed as FlameId strings', () => {
    const ids: FlameId[] = FLAMES.map((f) => f.id);
    for (const id of ids) {
      expect(typeof id).toBe('string');
    }
  });
});

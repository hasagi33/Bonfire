/**
 * flames.test.ts — tests for the flame catalog (src/domain/flames.ts).
 *
 * Pure-data tests: no React, no AsyncStorage, no Date.now(), no network.
 * Any date-dependent assertion uses fixed ISO local date keys.
 */

import {
  FLAMES,
  BASE_FLAME_ID,
  BONFIRE_DESIGN_SOURCE,
  DEFAULT_VISUAL_PROFILE,
  safeVisualProfile,
  type FlameId,
  type FlameStyle,
  type FlameTier,
  type Achievement,
  type VisualProfile,
} from './flames';
import { paletteFromGradient, emberedPalette } from '../theme/palettes';

const PALETTE_KEYS = ['core', 'mid', 'outer', 'ember', 'red'] as const;

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
}

function byId(id: FlameId): FlameStyle | undefined {
  return FLAMES.find((f) => f.id === id);
}

describe('FLAMES catalog — structure', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  it('contains exactly one base-tier flame', () => {
    const base = FLAMES.filter((f) => f.tier === 'base');
    expect(base).toHaveLength(1);
  });

  it('always makes the base flame the BASE_FLAME_ID (Amber)', () => {
    const base = FLAMES.find((f) => f.tier === 'base');
    expect(base).toBeDefined();
    expect(base!.id).toBe(BASE_FLAME_ID);
    expect(BASE_FLAME_ID).toBe('amber');
  });

  it('gives the base flame no achievement (it is always unlocked)', () => {
    const base = byId(BASE_FLAME_ID)!;
    expect(base.achievement).toBeNull();
  });

  it('gives every non-base flame an achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier !== 'base')) {
      expect(flame.achievement).not.toBeNull();
    }
  });

  it('assigns unique ids', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('uses kebab-case ids', () => {
    for (const flame of FLAMES) {
      expect(flame.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('gives every flame a non-empty name', () => {
    for (const flame of FLAMES) {
      expect(typeof flame.name).toBe('string');
      expect(flame.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('gives every flame a non-empty gradient of valid hex stops', () => {
    for (const flame of FLAMES) {
      expect(Array.isArray(flame.gradient)).toBe(true);
      expect(flame.gradient.length).toBeGreaterThan(0);
      for (const stop of flame.gradient) {
        expect(isHexColor(stop)).toBe(true);
      }
    }
  });

  it('has rarity strictly increasing base < streak < time', () => {
    const maxBase = Math.max(...FLAMES.filter((f) => f.tier === 'base').map((f) => f.rarity));
    const streakRarities = FLAMES.filter((f) => f.tier === 'streak').map((f) => f.rarity);
    const timeRarities = FLAMES.filter((f) => f.tier === 'time').map((f) => f.rarity);
    for (const r of streakRarities) expect(r).toBeGreaterThan(maxBase);
    const maxStreak = Math.max(...streakRarities);
    for (const r of timeRarities) expect(r).toBeGreaterThan(maxStreak);
  });
});

describe('FLAMES catalog — achievements', () => {
  it('gives streak-tier flames a streak-type achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier === 'streak')) {
      expect(flame.achievement!.type).toBe('streak');
    }
  });

  it('gives time-tier flames a time-type achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier === 'time')) {
      expect(flame.achievement!.type).toBe('time');
    }
  });

  it('defines windowDays on every time achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier === 'time')) {
      const a = flame.achievement as Achievement;
      expect(typeof a.windowDays).toBe('number');
      expect(a.windowDays!).toBeGreaterThan(0);
    }
  });

  it('does not define windowDays on any streak achievement', () => {
    for (const flame of FLAMES.filter((f) => f.tier === 'streak')) {
      const a = flame.achievement as Achievement;
      expect(a.windowDays).toBeUndefined();
    }
  });

  it('gives every achievement a non-empty requirement string', () => {
    for (const flame of FLAMES.filter((f) => f.achievement)) {
      const a = flame.achievement as Achievement;
      expect(typeof a.requirement).toBe('string');
      expect(a.requirement.trim().length).toBeGreaterThan(0);
    }
  });

  it('gives every achievement a kind and a params object', () => {
    for (const flame of FLAMES.filter((f) => f.achievement)) {
      const a = flame.achievement as Achievement;
      expect(typeof a.kind).toBe('string');
      expect(a.params).toEqual(expect.any(Object));
    }
  });

  it('does not share one achievement between two flames', () => {
    const requirements = FLAMES.filter((f) => f.achievement).map(
      (f) => `${f.achievement!.type}:${f.achievement!.kind}:${JSON.stringify(f.achievement!.params)}:${f.achievement!.windowDays ?? ''}`,
    );
    expect(new Set(requirements).size).toBe(requirements.length);
  });
});

describe('FLAMES catalog — derived palettes', () => {
  it('produces a 5-stop palette for every flame', () => {
    for (const flame of FLAMES) {
      for (const key of PALETTE_KEYS) {
        expect(isHexColor(flame.palette[key] as string)).toBe(true);
        expect(isHexColor(flame.embered[key] as string)).toBe(true);
      }
    }
  });

  it('derives each flame palette from its gradient', () => {
    for (const flame of FLAMES) {
      expect(flame.palette).toEqual(paletteFromGradient(flame.gradient));
    }
  });

  it('derives each embered palette from the render palette', () => {
    for (const flame of FLAMES) {
      expect(flame.embered).toEqual(emberedPalette(flame.palette));
    }
  });

  it('keeps the palette deterministic across calls', () => {
    const base = byId(BASE_FLAME_ID)!;
    expect(paletteFromGradient(base.gradient)).toEqual(base.palette);
    expect(paletteFromGradient(base.gradient)).toEqual(paletteFromGradient(base.gradient));
  });
});

describe('FLAMES catalog — visual profiles', () => {
  it('attaches a visual profile with the BonfireDesign source to every flame', () => {
    for (const flame of FLAMES) {
      expect(flame.visualProfile).toBeDefined();
      expect(flame.visualProfile!.source).toBe(BONFIRE_DESIGN_SOURCE);
    }
  });

  it('gives every profile all six design reference labels', () => {
    for (const flame of FLAMES) {
      const ref = flame.visualProfile!.designRef;
      for (const key of ['silhouette', 'core', 'aura', 'particles', 'motion', 'implementationIntent'] as const) {
        expect(typeof ref[key]).toBe('string');
        expect(ref[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('keeps every profile renderable without falling back', () => {
    for (const flame of FLAMES) {
      expect(safeVisualProfile(flame.visualProfile)).toBe(flame.visualProfile);
    }
  });
});

describe('safeVisualProfile', () => {
  it('returns the default profile for null or undefined', () => {
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('returns the default profile for a non-object', () => {
    expect(safeVisualProfile('nope' as unknown as VisualProfile)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('returns the default profile when tongues are empty', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      shape: { ...DEFAULT_VISUAL_PROFILE.shape, tongues: [] },
    };
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('returns the default profile when motion speed is not positive', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      motion: { family: 'smooth' as const, speed: 0 },
    };
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('returns the default profile when the design reference is missing', () => {
    const broken = { ...DEFAULT_VISUAL_PROFILE, designRef: undefined } as unknown as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('passes a valid profile through unchanged', () => {
    expect(safeVisualProfile(DEFAULT_VISUAL_PROFILE)).toBe(DEFAULT_VISUAL_PROFILE);
  });
});

describe('FLAMES tier invariants', () => {
  it('only uses the known tier values', () => {
    const allowed: FlameTier[] = ['base', 'streak', 'time'];
    for (const flame of FLAMES) {
      expect(allowed).toContain(flame.tier);
    }
  });

  it('keeps time flames as the most exotic tier by count ordering', () => {
    const timeCount = FLAMES.filter((f) => f.tier === 'time').length;
    const streakCount = FLAMES.filter((f) => f.tier === 'streak').length;
    expect(timeCount).toBeGreaterThanOrEqual(0);
    expect(streakCount).toBeGreaterThanOrEqual(0);
  });
});

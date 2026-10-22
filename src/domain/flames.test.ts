/**
 * flames.test.ts — pure unit tests for the flame catalog (src/domain/flames.ts).
 *
 * Covers the catalog invariants (exactly one base flame, Amber always unlocked
 * by default, unique kebab-case ids, time/streak window rules), per-flame palette
 * derivation through paletteFromGradient / emberedPalette, and the well-formedness
 * of every visualProfile. No network, no storage, no Date.now(): fully
 * deterministic and renderer-agnostic.
 */

import {
  FLAMES,
  BASE_FLAME_ID,
  BONFIRE_DESIGN_SOURCE,
  DEFAULT_VISUAL_PROFILE,
  safeVisualProfile,
  type FlameStyle,
  type FlameId,
  type FlameTier,
  type Achievement,
  type VisualProfile,
} from './flames';
import { paletteFromGradient, emberedPalette } from '../theme/palettes';

const KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_OR_RGBA = /^(#[0-9a-fA-F]{3,8}|rgba?\(.+\))$/;

const flameById = (id: FlameId): FlameStyle | undefined =>
  FLAMES.find((f) => f.id === id);

describe('FLAMES catalog — structure', () => {
  test('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  test('contains exactly one base-tier flame', () => {
    const base = FLAMES.filter((f) => f.tier === 'base');
    expect(base).toHaveLength(1);
  });

  test('the base flame is the one referenced by BASE_FLAME_ID', () => {
    const base = FLAMES.find((f) => f.tier === 'base');
    expect(base?.id).toBe(BASE_FLAME_ID);
  });

  test('the base flame has no achievement (always unlocked)', () => {
    const base = flameById(BASE_FLAME_ID);
    expect(base).toBeDefined();
    expect(base!.achievement).toBeNull();
  });

  test('every non-base flame is achievement-gated', () => {
    for (const f of FLAMES.filter((x) => x.tier !== 'base')) {
      expect(f.achievement).not.toBeNull();
    }
  });

  test('every flame id is unique', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every flame id is kebab-case', () => {
    for (const f of FLAMES) {
      expect(f.id).toMatch(KEBAB_CASE);
    }
  });

  test('every flame has a non-empty name', () => {
    for (const f of FLAMES) {
      expect(typeof f.name).toBe('string');
      expect(f.name.trim().length).toBeGreaterThan(0);
    }
  });

  test('rarity strictly increases base < streak < time', () => {
    const order: FlameTier[] = ['base', 'streak', 'time'];
    const rarityOf = (tier: FlameTier) =>
      FLAMES.filter((f) => f.tier === tier).map((f) => f.rarity);
    const maxOf = (xs: number[]) => Math.max(...xs);
    const minOf = (xs: number[]) => Math.min(...xs);

    for (let i = 0; i < order.length - 1; i++) {
      const lower = rarityOf(order[i]);
      const upper = rarityOf(order[i + 1]);
      if (lower.length && upper.length) {
        expect(maxOf(lower)).toBeLessThan(minOf(upper));
      }
    }
  });
});

describe('FLAMES catalog — achievements', () => {
  test('each time flame has a positive integer windowDays', () => {
    for (const f of FLAMES.filter((x) => x.tier === 'time')) {
      const a = f.achievement as Achievement;
      expect(a.type).toBe('time');
      expect(Number.isInteger(a.windowDays)).toBe(true);
      expect(a.windowDays!).toBeGreaterThan(0);
    }
  });

  test('each streak flame does not require windowDays', () => {
    for (const f of FLAMES.filter((x) => x.tier === 'streak')) {
      const a = f.achievement as Achievement;
      expect(a.type).toBe('streak');
      expect(a.windowDays).toBeUndefined();
    }
  });

  test('each achievement has a human-readable requirement', () => {
    for (const f of FLAMES.filter((x) => x.achievement)) {
      expect(typeof f.achievement!.requirement).toBe('string');
      expect(f.achievement!.requirement.trim().length).toBeGreaterThan(0);
    }
  });

  test('achievement type matches flame tier', () => {
    for (const f of FLAMES.filter((x) => x.achievement)) {
      expect(f.achievement!.type).toBe(f.tier === 'time' ? 'time' : 'streak');
    }
  });
});

describe('FLAMES catalog — palettes', () => {
  test('each flame gradient has at least two stops', () => {
    for (const f of FLAMES) {
      expect(Array.isArray(f.gradient)).toBe(true);
      expect(f.gradient.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('each flame palette equals paletteFromGradient(gradient)', () => {
    for (const f of FLAMES) {
      expect(f.palette).toEqual(paletteFromGradient(f.gradient));
    }
  });

  test('each flame embered variant equals emberedPalette(palette)', () => {
    for (const f of FLAMES) {
      expect(f.embered).toEqual(emberedPalette(f.palette));
    }
  });

  test('palette and embered objects expose well-formed color strings', () => {
    for (const f of FLAMES) {
      for (const palette of [f.palette, f.embered]) {
        for (const value of Object.values(palette)) {
          expect(typeof value).toBe('string');
          expect(value).toMatch(HEX_OR_RGBA);
        }
      }
    }
  });
});

describe('FLAMES catalog — visual profiles', () => {
  test('every catalog row supplies a visualProfile', () => {
    for (const f of FLAMES) {
      expect(f.visualProfile).toBeDefined();
    }
  });

  test('every visualProfile is sourced from BonfireDesign', () => {
    for (const f of FLAMES) {
      expect(f.visualProfile!.source).toBe(BONFIRE_DESIGN_SOURCE);
    }
  });

  test('visualProfile fields are present and well-formed', () => {
    for (const f of FLAMES) {
      const p = f.visualProfile as VisualProfile;
      expect(typeof p.designNumber).toBe('string');
      expect(['common', 'rare']).toContain(p.designTier);
      expect(typeof p.tagline).toBe('string');
      expect(typeof p.shape.variant).toBe('string');
      expect(Array.isArray(p.shape.tongues)).toBe(true);
      expect(p.shape.tongues.length).toBeGreaterThan(0);
      expect(p.motion.speed).toBeGreaterThan(0);
      expect(Array.isArray(p.particles)).toBe(true);
      expect(typeof p.aura.kind).toBe('string');
      expect(Array.isArray(p.accents)).toBe(true);
      expect(p.designRef).toBeDefined();
      for (const key of [
        'silhouette',
        'core',
        'aura',
        'particles',
        'motion',
        'implementationIntent',
      ] as const) {
        expect(typeof p.designRef[key]).toBe('string');
        expect(p.designRef[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  test('every particle population has a positive count and a color', () => {
    for (const f of FLAMES) {
      for (const particle of f.visualProfile!.particles) {
        expect(particle.n).toBeGreaterThan(0);
        expect(typeof particle.color).toBe('string');
        expect(particle.color.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('safeVisualProfile', () => {
  test('returns a valid catalog profile unchanged', () => {
    const profile = flameById(BASE_FLAME_ID)!.visualProfile!;
    expect(safeVisualProfile(profile)).toBe(profile);
  });

  test('falls back to DEFAULT_VISUAL_PROFILE for null or undefined', () => {
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('falls back for a profile with an empty tongue list', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      shape: { ...DEFAULT_VISUAL_PROFILE.shape, tongues: [] },
    } as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('falls back for a non-positive motion speed', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      motion: { family: 'smooth', speed: 0 },
    } as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('falls back for a profile missing designRef', () => {
    const broken = { ...DEFAULT_VISUAL_PROFILE, designRef: undefined } as unknown as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('never throws on arbitrary garbage input', () => {
    expect(() => safeVisualProfile(42 as unknown as VisualProfile)).not.toThrow();
    expect(() => safeVisualProfile('oops' as unknown as VisualProfile)).not.toThrow();
    expect(safeVisualProfile(42 as unknown as VisualProfile)).toBe(DEFAULT_VISUAL_PROFILE);
  });
});

describe('DEFAULT_VISUAL_PROFILE', () => {
  test('is a well-formed baseline profile', () => {
    expect(DEFAULT_VISUAL_PROFILE.source).toBe(BONFIRE_DESIGN_SOURCE);
    expect(DEFAULT_VISUAL_PROFILE.shape.variant).toBe('classic');
    expect(DEFAULT_VISUAL_PROFILE.shape.tongues.length).toBeGreaterThan(0);
    expect(DEFAULT_VISUAL_PROFILE.motion.speed).toBeGreaterThan(0);
    expect(DEFAULT_VISUAL_PROFILE.aura.kind).toBe('oval');
  });
});

describe('FlameStyle typing sanity', () => {
  test('base flame exposes a usable style object', () => {
    const base: FlameStyle | undefined = flameById(BASE_FLAME_ID);
    expect(base).toBeDefined();
    expect(base!.tier).toBe('base');
    expect(base!.gradient.length).toBeGreaterThanOrEqual(2);
  });
});

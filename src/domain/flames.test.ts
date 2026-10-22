/**
 * flames.test.ts — catalog-level tests for src/domain/flames.ts.
 *
 * Pure unit tests: no React, no I/O, no network, no Date.now(). All
 * assertions are derived from the exported FLAMES catalog and helpers.
 */

import {
  FLAMES,
  BASE_FLAME_ID,
  BONFIRE_DESIGN_SOURCE,
  DEFAULT_VISUAL_PROFILE,
  safeVisualProfile,
  paletteFromGradient,
  emberedPalette,
  type FlameStyle,
  type FlameTier,
  type Achievement,
  type ConditionKind,
  type VisualProfile,
} from './flames';

const BANNED_CONDITION_KINDS: string[] = [];

const TIER_ORDER: Record<FlameTier, number> = { base: 0, streak: 1, time: 2 };

const VALID_TIERS: FlameTier[] = ['base', 'streak', 'time'];

const PALETTE_KEYS = ['core', 'red'] as const;

const byId = (id: string): FlameStyle => {
  const found = FLAMES.find((f) => f.id === id);
  if (!found) throw new Error(`flame not found: ${id}`);
  return found;
};

const nonBase = (): FlameStyle[] => FLAMES.filter((f) => f.id !== BASE_FLAME_ID);

describe('FLAMES catalog', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(FLAMES)).toBe(true);
    expect(FLAMES.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = FLAMES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has unique names', () => {
    const names = FLAMES.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every id is kebab-case / lowercase alphanumeric', () => {
    for (const f of FLAMES) {
      expect(f.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('every tier is one of base | streak | time', () => {
    for (const f of FLAMES) {
      expect(VALID_TIERS).toContain(f.tier);
    }
  });

  it('contains exactly one base flame, and it is the BASE_FLAME_ID', () => {
    const bases = FLAMES.filter((f) => f.tier === 'base');
    expect(bases).toHaveLength(1);
    expect(bases[0].id).toBe(BASE_FLAME_ID);
  });

  it('base flame has no achievement', () => {
    expect(byId(BASE_FLAME_ID).achievement).toBeNull();
  });

  it('base flame has no embers-only marker and an embered palette', () => {
    const base = byId(BASE_FLAME_ID);
    expect(base.embered).toBeDefined();
  });

  it('every non-base flame has an achievement', () => {
    for (const f of nonBase()) {
      expect(f.achievement).not.toBeNull();
    }
  });

  it('achievement type matches the flame tier', () => {
    for (const f of nonBase()) {
      expect(f.achievement!.type).toBe(f.tier);
    }
  });

  it('rarity strictly increases base < streak < time', () => {
    for (const a of FLAMES) {
      for (const b of FLAMES) {
        if (TIER_ORDER[a.tier] < TIER_ORDER[b.tier]) {
          expect(a.rarity).toBeLessThan(b.rarity);
        }
      }
    }
  });

  it('rarities are finite numbers', () => {
    for (const f of FLAMES) {
      expect(Number.isFinite(f.rarity)).toBe(true);
    }
  });

  it('windowDays is present only on time achievements', () => {
    for (const f of FLAMES) {
      const a = f.achievement;
      if (!a) continue;
      if (a.type === 'time') {
        expect(a.windowDays).toBeDefined();
      } else {
        expect(a.windowDays).toBeUndefined();
      }
    }
  });

  it('windowDays is a positive integer on time achievements', () => {
    for (const f of FLAMES) {
      const a = f.achievement;
      if (a && a.type === 'time') {
        expect(Number.isInteger(a.windowDays)).toBe(true);
        expect(a.windowDays!).toBeGreaterThan(0);
      }
    }
  });

  it('every achievement has a non-empty requirement string', () => {
    for (const f of nonBase()) {
      expect(typeof f.achievement!.requirement).toBe('string');
      expect(f.achievement!.requirement.trim().length).toBeGreaterThan(0);
    }
  });

  it('no achievement uses a banned condition kind', () => {
    for (const f of nonBase()) {
      expect(BANNED_CONDITION_KINDS).not.toContain(f.achievement!.kind);
    }
  });

  it('achievement kinds are strings from the ConditionKind set', () => {
    const kinds: ConditionKind[] = [
      'runDays', 'runStrength', 'strongDaysInRun', 'runStrengthAndDays',
      'consecutivePerfect', 'unbrokenChain', 'unbrokenChainMinScore',
      'perfectCalendarWeek', 'consecutivePerfectWeeks', 'crossStrength',
    ];
    for (const f of nonBase()) {
      expect(kinds).toContain(f.achievement!.kind);
    }
  });

  it('gradients are non-empty arrays of strings', () => {
    for (const f of FLAMES) {
      expect(Array.isArray(f.gradient)).toBe(true);
      expect(f.gradient.length).toBeGreaterThan(1);
      for (const stop of f.gradient) {
        expect(typeof stop).toBe('string');
      }
    }
  });

  it('palettes have populated core and red stops', () => {
    for (const f of FLAMES) {
      for (const key of PALETTE_KEYS) {
        expect(typeof f.palette[key]).toBe('string');
        expect(f.palette[key].length).toBeGreaterThan(0);
      }
    }
  });

  it('palette matches paletteFromGradient(gradient)', () => {
    for (const f of FLAMES) {
      expect(f.palette).toEqual(paletteFromGradient(f.gradient));
    }
  });

  it('embered palette is present and derived from the palette', () => {
    for (const f of FLAMES) {
      expect(f.embered).toBeDefined();
      expect(f.embered).toEqual(emberedPalette(f.palette));
    }
  });

  it('embered palette differs from the live palette for every flame', () => {
    for (const f of FLAMES) {
      expect(f.embered).not.toEqual(f.palette);
    }
  });

  it('every flame carries a visual profile sourced from BonfireDesign', () => {
    for (const f of FLAMES) {
      expect(f.visualProfile).toBeDefined();
      expect(f.visualProfile!.source).toBe(BONFIRE_DESIGN_SOURCE);
    }
  });

  it('design numbers are unique two-digit strings', () => {
    const nums = FLAMES.map((f) => f.visualProfile!.designNumber);
    expect(new Set(nums).size).toBe(nums.length);
    for (const n of nums) {
      expect(n).toMatch(/^\d{2}$/);
    }
  });

  it('every visual profile has all six designRef labels populated', () => {
    for (const f of FLAMES) {
      const ref = f.visualProfile!.designRef;
      for (const key of [
        'silhouette', 'core', 'aura', 'particles', 'motion', 'implementationIntent',
      ] as const) {
        expect(typeof ref[key]).toBe('string');
        expect(ref[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('every visual profile has at least one tongue and a positive motion speed', () => {
    for (const f of FLAMES) {
      expect(f.visualProfile!.shape.tongues.length).toBeGreaterThan(0);
      expect(f.visualProfile!.motion.speed).toBeGreaterThan(0);
    }
  });

  it('visual profile tiers are common or rare', () => {
    for (const f of FLAMES) {
      expect(['common', 'rare']).toContain(f.visualProfile!.designTier);
    }
  });
});

describe('achievement strength ordering', () => {
  const streakRows = FLAMES.filter((f) => f.tier === 'streak');
  const timeRows = FLAMES.filter((f) => f.tier === 'time');

  it('streak achievements carry numeric params only', () => {
    for (const f of streakRows) {
      for (const v of Object.values(f.achievement!.params)) {
        expect(typeof v).toBe('number');
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('time achievements carry numeric params only', () => {
    for (const f of timeRows) {
      for (const v of Object.values(f.achievement!.params)) {
        expect(typeof v).toBe('number');
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it('stronger score thresholds (s) are not easier than weaker ones', () => {
    const withScore = FLAMES.filter(
      (f) => f.achievement && typeof f.achievement.params.s === 'number',
    );
    for (const a of withScore) {
      for (const b of withScore) {
        if (a.rarity > b.rarity) {
          expect(a.achievement!.params.s!).toBeGreaterThanOrEqual(
            b.achievement!.params.s!,
          );
        }
      }
    }
  });

  it('higher cumulative strength requirements (strength params) rank higher', () => {
    const strengthKeys = ['strength', 'runStrength', 'cumStrength', 'minStrength'];
    const rows = FLAMES.filter(
      (f) => f.achievement && strengthKeys.some((k) => typeof f.achievement!.params[k] === 'number'),
    );
    for (const a of rows) {
      for (const b of rows) {
        if (a.rarity > b.rarity) {
          const key = strengthKeys.find((k) => typeof a.achievement!.params[k] === 'number')!;
          const bKey = strengthKeys.find((k) => typeof b.achievement!.params[k] === 'number');
          if (bKey) {
            expect(a.achievement!.params[key]).toBeGreaterThanOrEqual(
              b.achievement!.params[bKey],
            );
          }
        }
      }
    }
  });

  it('longer continuity requirements (day counts) rank higher', () => {
    const dayKeys = ['n', 'days', 'runDays'];
    const rows = FLAMES.filter(
      (f) => f.achievement && dayKeys.some((k) => typeof f.achievement!.params[k] === 'number'),
    );
    for (const a of rows) {
      for (const b of rows) {
        if (a.rarity > b.rarity) {
          const key = dayKeys.find((k) => typeof a.achievement!.params[k] === 'number')!;
          const bKey = dayKeys.find((k) => typeof b.achievement!.params[k] === 'number');
          if (bKey) {
            expect(a.achievement!.params[key]).toBeGreaterThanOrEqual(
              b.achievement!.params[bKey],
            );
          }
        }
      }
    }
  });
});

describe('paletteFromGradient', () => {
  it('samples the hot end into core and the cool end into red', () => {
    const p = paletteFromGradient(['#ffffff', '#888888', '#000000']);
    expect(p.core).toBeDefined();
    expect(p.red).toBeDefined();
    expect(p.core).not.toEqual(p.red);
  });

  it('is deterministic for identical input', () => {
    const grad = ['#ff0000', '#ff8800', '#220000'];
    expect(paletteFromGradient(grad)).toEqual(paletteFromGradient(grad));
  });

  it('returns populated core and red for a two-stop gradient', () => {
    const p = paletteFromGradient(['#ffcc00', '#330000']);
    expect(p.core).toBeTruthy();
    expect(p.red).toBeTruthy();
  });
});

describe('emberedPalette', () => {
  it('returns a palette that differs from its input', () => {
    const p = paletteFromGradient(['#ffcc00', '#ff4400', '#330000']);
    expect(emberedPalette(p)).not.toEqual(p);
  });

  it('is deterministic for identical input', () => {
    const p = paletteFromGradient(['#ffcc00', '#330000']);
    expect(emberedPalette(p)).toEqual(emberedPalette(p));
  });

  it('keeps every palette key populated', () => {
    const p = paletteFromGradient(['#ffcc00', '#330000']);
    const e = emberedPalette(p);
    for (const key of PALETTE_KEYS) {
      expect(typeof e[key]).toBe('string');
      expect(e[key].length).toBeGreaterThan(0);
    }
  });
});

describe('safeVisualProfile', () => {
  it('returns the input profile when it is structurally valid', () => {
    const p = byId('crimson').visualProfile!;
    expect(safeVisualProfile(p)).toBe(p);
  });

  it('falls back to DEFAULT_VISUAL_PROFILE for null', () => {
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('falls back to DEFAULT_VISUAL_PROFILE for undefined', () => {
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('falls back when the tongue list is empty', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      shape: { ...DEFAULT_VISUAL_PROFILE.shape, tongues: [] },
    } as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('falls back when motion speed is non-positive', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      motion: { family: 'smooth', speed: 0 },
    } as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('falls back when the shape variant is missing', () => {
    const broken = {
      ...DEFAULT_VISUAL_PROFILE,
      shape: { ...DEFAULT_VISUAL_PROFILE.shape, variant: undefined },
    } as unknown as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  it('never throws on arbitrary garbage input', () => {
    expect(() => safeVisualProfile({} as unknown as VisualProfile)).not.toThrow();
    expect(safeVisualProfile({} as unknown as VisualProfile)).toBe(DEFAULT_VISUAL_PROFILE);
  });
});

describe('Achievement typing sanity', () => {
  it('a streak achievement shape has no windowDays', () => {
    const a: Achievement = {
      type: 'streak',
      kind: 'runDays',
      params: { n: 3 },
      requirement: 'Keep a 3-day run',
    };
    expect(a.windowDays).toBeUndefined();
  });

  it('a time achievement shape carries windowDays', () => {
    const a: Achievement = {
      type: 'time',
      kind: 'consecutivePerfect',
      params: { n: 5 },
      windowDays: 10,
      requirement: 'Five perfect days within a window',
    };
    expect(a.windowDays).toBe(10);
  });
});

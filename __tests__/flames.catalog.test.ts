/**
 * flames.catalog.test.ts — invariants for the editable flame catalog.
 *
 * The catalog is hand-edited product data, so these tests are the guard rails:
 * they fail loudly if a new/tuned flame breaks an assumption the engine or UI
 * relies on (unique ids, difficulty ordering, a window on every time flame, a
 * full + embered palette on every entry).
 */

import {
  FLAMES,
  BASE_FLAME_ID,
  DEFAULT_VISUAL_PROFILE,
  flameById,
  safeVisualProfile,
  type FlameStyle,
  type VisualProfile,
} from '../src/domain/flames';
import type { Palette } from '../src/theme/palettes';

const HEX = /^#[0-9a-f]{6}$/i;

function stops(p: Palette): string[] {
  return [p.red, p.ember, p.amber, p.gold, p.core];
}

test('all flame ids are unique', () => {
  const ids = FLAMES.map(f => f.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('exactly one base flame, and it is the configured BASE_FLAME_ID with no achievement', () => {
  const base = FLAMES.filter(f => f.tier === 'base');
  expect(base).toHaveLength(1);
  expect(base[0].id).toBe(BASE_FLAME_ID);
  expect(base[0].achievement).toBeNull();
});

test('every non-base flame has a non-null achievement with non-empty requirement', () => {
  for (const f of FLAMES) {
    if (f.tier === 'base') continue;
    expect(f.achievement).not.toBeNull();
    expect(f.achievement?.requirement.length).toBeGreaterThan(0);
  }
});

test('every time flame has a positive integer windowDays; no streak flame has one', () => {
  for (const f of FLAMES) {
    const a = f.achievement;
    if (!a) continue;
    if (a.type === 'time') {
      expect(typeof a.windowDays).toBe('number');
      expect(a.windowDays).toBeGreaterThan(0);
      expect(Number.isInteger(a.windowDays)).toBe(true);
    } else {
      expect(a.windowDays).toBeUndefined();
    }
  }
});

test('rarity is strictly increasing, and all time > all streak > base (SC-009)', () => {
  for (let i = 1; i < FLAMES.length; i++) {
    expect(FLAMES[i].rarity).toBeGreaterThan(FLAMES[i - 1].rarity);
  }
  const maxBase = Math.max(...FLAMES.filter(f => f.tier === 'base').map(f => f.rarity));
  const minStreak = Math.min(...FLAMES.filter(f => f.tier === 'streak').map(f => f.rarity));
  const maxStreak = Math.max(...FLAMES.filter(f => f.tier === 'streak').map(f => f.rarity));
  const minTime = Math.min(...FLAMES.filter(f => f.tier === 'time').map(f => f.rarity));
  expect(minStreak).toBeGreaterThan(maxBase);
  expect(minTime).toBeGreaterThan(maxStreak);
});

test('every flame has a full palette and an embered palette of valid hex stops', () => {
  for (const f of FLAMES) {
    for (const stop of stops(f.palette)) expect(stop).toMatch(HEX);
    for (const stop of stops(f.embered)) expect(stop).toMatch(HEX);
  }
});

test('the embered variant differs from the full palette on every flame (ember vs "embered")', () => {
  for (const f of FLAMES) {
    const full = stops(f.palette);
    const dim = stops(f.embered);
    full.forEach((s, i) => expect(dim[i]).not.toBe(s));
  }
});

test('catalog has the expected 20 flames (1 base + 8 streak + 11 time)', () => {
  expect(FLAMES).toHaveLength(20);
  expect(FLAMES.filter(f => f.tier === 'streak')).toHaveLength(8);
  expect(FLAMES.filter(f => f.tier === 'time')).toHaveLength(11);
});

test('unlock requirements use only positive achievement condition kinds', () => {
  const allowedKinds = new Set([
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
  ]);

  for (const f of FLAMES) {
    const a = f.achievement;
    if (!a) continue;
    expect(allowedKinds.has(a.kind)).toBe(true);
  }
});

test('flameById falls back to the base flame for an unknown id', () => {
  expect(flameById('does-not-exist').id).toBe(BASE_FLAME_ID);
  expect(flameById('voidfire').id).toBe('voidfire');
});

// ===========================================================================
// BonfireDesign visual profile parity (spec 004).
//
// `BonfireDesign/flame-profiles.js` is the authoritative design source; this
// EXPECTED map pins the identity-defining tokens of all 20 profiles so a
// catalog edit that drifts from the design fails loudly. Order matters: the
// array below is BonfireDesign #01..#20 and must match catalog ids.
// ===========================================================================

interface ExpectedProfile {
  id: string;
  num: string;
  tier: 'common' | 'rare';
  variant: string;
  edge: string;
  tongues: number;
  auraKind: string;
  auraDim?: boolean;
  auraCrisp?: boolean;
  accents: string[];
  particles: string[]; // particle kinds in order
  family: 'smooth' | 'harsh';
  speed: number;
  sway?: number;
  pulse?: 'coal' | 'core';
  hueDrift?: number;
  warp?: boolean;
  ribbon?: boolean;
  footprint?: number;
  coreScale?: number;
  opacity?: number;
  invert?: boolean;
}

const EXPECTED: ExpectedProfile[] = [
  { id: 'amber', num: '01', tier: 'common', variant: 'classic', edge: 'round', tongues: 1, auraKind: 'oval', accents: [], particles: ['sparks'], family: 'smooth', speed: 1 },
  { id: 'crimson', num: '02', tier: 'common', variant: 'classic', edge: 'sharp', tongues: 1, auraKind: 'oval', accents: [], particles: ['sparks'], family: 'smooth', speed: 0.7 },
  { id: 'sapphire', num: '03', tier: 'common', variant: 'classic', edge: 'round', tongues: 1, auraKind: 'tall', accents: [], particles: ['sparks'], family: 'smooth', speed: 1.7 },
  { id: 'sodium', num: '04', tier: 'common', variant: 'lance', edge: 'sharp', tongues: 1, auraKind: 'tall', auraCrisp: true, accents: [], particles: ['sparks'], family: 'smooth', speed: 0.4 },
  { id: 'strontium', num: '05', tier: 'common', variant: 'split', edge: 'jagged', tongues: 2, auraKind: 'oval', auraDim: true, accents: [], particles: ['sparks'], family: 'harsh', speed: 0.5 },
  { id: 'emerald', num: '06', tier: 'common', variant: 'forked', edge: 'round', tongues: 3, auraKind: 'oval', accents: [], particles: ['motes'], family: 'smooth', speed: 1 },
  { id: 'lilac', num: '07', tier: 'common', variant: 'twin', edge: 'round', tongues: 2, auraKind: 'oval', auraDim: true, accents: [], particles: ['wisps'], family: 'smooth', speed: 2 },
  { id: 'magenta', num: '08', tier: 'common', variant: 'wide', edge: 'round', tongues: 1, auraKind: 'wide', accents: [], particles: ['stars'], family: 'smooth', speed: 0.8, sway: 7 },
  { id: 'ghostlight', num: '09', tier: 'rare', variant: 'classic', edge: 'round', tongues: 1, auraKind: 'oval', auraDim: true, accents: [], particles: ['wisps'], family: 'smooth', speed: 2.4, opacity: 0.55 },
  { id: 'toxic', num: '10', tier: 'rare', variant: 'warped', edge: 'round', tongues: 1, auraKind: 'oval', auraDim: true, accents: [], particles: ['bubbles'], family: 'smooth', speed: 1.1, warp: true },
  { id: 'wisp', num: '11', tier: 'rare', variant: 'detached', edge: 'round', tongues: 4, auraKind: 'oval', auraDim: true, accents: [], particles: ['wisps'], family: 'smooth', speed: 2.2 },
  { id: 'ember', num: '12', tier: 'rare', variant: 'squat', edge: 'round', tongues: 1, auraKind: 'wide', auraDim: true, accents: [], particles: ['ash', 'sparks'], family: 'smooth', speed: 1.6, pulse: 'coal' },
  { id: 'spectral', num: '13', tier: 'rare', variant: 'layered', edge: 'round', tongues: 3, auraKind: 'oval', auraDim: true, accents: ['afterimage'], particles: ['motes'], family: 'smooth', speed: 1.4, opacity: 0.85 },
  { id: 'frostfire', num: '14', tier: 'rare', variant: 'crystal', edge: 'crystal', tongues: 3, auraKind: 'oval', auraCrisp: true, accents: [], particles: ['shards'], family: 'harsh', speed: 0.85 },
  { id: 'conflagration', num: '15', tier: 'rare', variant: 'crown', edge: 'round', tongues: 5, auraKind: 'wide', accents: [], particles: ['sparks'], family: 'harsh', speed: 0.55, footprint: 1.3 },
  { id: 'solfire', num: '16', tier: 'rare', variant: 'solar', edge: 'round', tongues: 1, auraKind: 'circular', accents: ['solarCircle'], particles: ['stars', 'motes'], family: 'smooth', speed: 0.9, pulse: 'core', coreScale: 1.7 },
  { id: 'voidfire', num: '17', tier: 'rare', variant: 'inverted', edge: 'sharp', tongues: 1, auraKind: 'ring', accents: ['voidRing'], particles: ['motes'], family: 'smooth', speed: 1.2, invert: true },
  { id: 'aurora', num: '18', tier: 'rare', variant: 'ribbon', edge: 'round', tongues: 3, auraKind: 'wide', auraDim: true, accents: ['auroraBand'], particles: ['wisps', 'motes'], family: 'smooth', speed: 1.9, hueDrift: 14, ribbon: true },
  { id: 'phoenix', num: '19', tier: 'rare', variant: 'wing', edge: 'round', tongues: 3, auraKind: 'tall', accents: [], particles: ['sparks', 'ash'], family: 'smooth', speed: 0.9 },
  { id: 'nebula', num: '20', tier: 'rare', variant: 'layered', edge: 'round', tongues: 3, auraKind: 'circular', accents: ['orbitRing', 'auroraBand'], particles: ['stars', 'motes'], family: 'smooth', speed: 1.6, hueDrift: 22, footprint: 1.2 },
];

// A profile is "complete" when every required section + design label exists.
// Shared by the per-flame tests and the validation-helper test below (T021).
function missingProfileParts(p: VisualProfile | undefined): string[] {
  const missing: string[] = [];
  if (!p) return ['visualProfile'];
  if (!p.shape?.variant || !p.shape?.edge || !p.shape?.tongues?.length) missing.push('shape');
  if (!p.motion?.family || !(p.motion?.speed > 0)) missing.push('motion');
  if (!Array.isArray(p.particles) || p.particles.length === 0) missing.push('particles');
  if (!p.aura?.kind) missing.push('aura');
  if (!Array.isArray(p.accents)) missing.push('accents');
  if (!p.paletteIntent) missing.push('paletteIntent');
  return missing;
}

describe('BonfireDesign profile parity (US4)', () => {
  test('all 20 flames carry a complete visualProfile', () => {
    for (const f of FLAMES) {
      expect({ id: f.id, missing: missingProfileParts(f.visualProfile) }).toEqual({ id: f.id, missing: [] });
    }
  });

  test('catalog order and identity cover BonfireDesign #01..#20 exactly', () => {
    expect(FLAMES.map(f => f.id)).toEqual(EXPECTED.map(e => e.id));
  });

  test.each(EXPECTED)('$id matches its BonfireDesign tokens', e => {
    const p = flameById(e.id).visualProfile!;
    expect(p.shape.variant).toBe(e.variant);
    expect(p.shape.edge).toBe(e.edge);
    expect(p.shape.tongues).toHaveLength(e.tongues);
    expect(p.aura.kind).toBe(e.auraKind);
    expect(p.aura.dim ?? undefined).toBe(e.auraDim);
    expect(p.aura.crisp ?? undefined).toBe(e.auraCrisp);
    expect(p.accents).toEqual(e.accents);
    expect(p.particles.map(d => d.kind)).toEqual(e.particles);
    expect(p.motion.family).toBe(e.family);
    expect(p.motion.speed).toBe(e.speed);
    expect(p.motion.sway ?? undefined).toBe(e.sway);
    expect(p.motion.pulse ?? undefined).toBe(e.pulse);
    expect(p.motion.hueDrift ?? undefined).toBe(e.hueDrift);
    expect(p.motion.warp ?? undefined).toBe(e.warp);
    expect(p.motion.ribbon ?? undefined).toBe(e.ribbon);
    expect(p.footprint ?? undefined).toBe(e.footprint);
    expect(p.shape.coreScale ?? undefined).toBe(e.coreScale);
    expect(p.paletteIntent.opacity ?? undefined).toBe(e.opacity);
    expect(p.paletteIntent.invert ?? undefined).toBe(e.invert);
  });

  test('BonfireDesign special traits: footprints, core scale, opacity, inverted core', () => {
    expect(flameById('conflagration').visualProfile!.footprint).toBe(1.3);
    expect(flameById('nebula').visualProfile!.footprint).toBe(1.2);
    expect(flameById('solfire').visualProfile!.shape.coreScale).toBe(1.7);
    expect(flameById('ghostlight').visualProfile!.paletteIntent.opacity).toBe(0.55);
    expect(flameById('spectral').visualProfile!.paletteIntent.opacity).toBe(0.85);
    expect(flameById('voidfire').visualProfile!.paletteIntent.invert).toBe(true);
  });

  test('multi-variant particle mixes are preserved (Ember/Solfire/Aurora/Phoenix/Nebula)', () => {
    expect(flameById('ember').visualProfile!.particles.map(d => d.kind)).toEqual(['ash', 'sparks']);
    expect(flameById('solfire').visualProfile!.particles.map(d => d.kind)).toEqual(['stars', 'motes']);
    expect(flameById('aurora').visualProfile!.particles.map(d => d.kind)).toEqual(['wisps', 'motes']);
    expect(flameById('phoenix').visualProfile!.particles.map(d => d.kind)).toEqual(['sparks', 'ash']);
    expect(flameById('nebula').visualProfile!.particles.map(d => d.kind)).toEqual(['stars', 'motes']);
    // Every particle entry has a positive count and a color.
    for (const f of FLAMES) {
      for (const d of f.visualProfile!.particles) {
        expect(d.n).toBeGreaterThan(0);
        expect(d.color.length).toBeGreaterThan(0);
      }
    }
  });

  test('the validation helper detects missing tokens (T021)', () => {
    const broken = JSON.parse(JSON.stringify(flameById('amber').visualProfile)) as VisualProfile;
    // @ts-expect-error — deliberately malformed for the negative test
    delete broken.aura;
    const missing = missingProfileParts(broken);
    expect(missing).toContain('aura');
    expect(missingProfileParts(undefined)).toEqual(['visualProfile']);
  });

  test('safeVisualProfile falls back to the Amber-like default for malformed input', () => {
    expect(safeVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(safeVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
    const broken = { shape: { variant: 'classic', tongues: [] } } as unknown as VisualProfile;
    expect(safeVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
    const valid = flameById('voidfire').visualProfile!;
    expect(safeVisualProfile(valid)).toBe(valid);
  });
});

// ---------------------------------------------------------------------------
// US5 invariants: visualProfile is additive — it must not change any existing
// catalog meaning the engine/UI relies on.
// ---------------------------------------------------------------------------
describe('visualProfile does not change existing catalog behavior (US5)', () => {
  // The exact pre-004 catalog facts, pinned: achievements, rarity, drift.
  const LEGACY: [string, string | null, number][] = [
    ['amber', null, 0],
    ['crimson', 'runStrength', 1], ['sapphire', 'runDays', 2], ['sodium', 'runDays', 3],
    ['strontium', 'strongDaysInRun', 4], ['emerald', 'runStrength', 5], ['lilac', 'runDays', 6],
    ['magenta', 'runStrength', 7], ['ghostlight', 'runStrengthAndDays', 8],
    ['toxic', 'consecutivePerfect', 9], ['wisp', 'unbrokenChainMinScore', 10],
    ['ember', 'unbrokenChainMinScore', 11], ['spectral', 'crossStrength', 12],
    ['frostfire', 'perfectCalendarWeek', 13], ['conflagration', 'perfectCalendarWeek', 14],
    ['solfire', 'crossStrength', 15], ['voidfire', 'unbrokenChain', 16],
    ['aurora', 'unbrokenChain', 17], ['phoenix', 'crossStrength', 18],
    ['nebula', 'consecutivePerfectWeeks', 19],
  ];

  test('achievement kinds, params shape, and rarity are unchanged', () => {
    for (const [id, kind, rarity] of LEGACY) {
      const f = flameById(id);
      expect(f.achievement?.kind ?? null).toBe(kind);
      expect(f.rarity).toBe(rarity);
    }
    // Spot-check params that gameplay depends on.
    expect(flameById('crimson').achievement!.params).toEqual({ n: 5 });
    expect(flameById('ghostlight').achievement!.params).toEqual({ s: 80, n: 14 });
    expect(flameById('nebula').achievement!.params).toEqual({ weeks: 2, minScore: 4, minPerfect: 10 });
  });

  test('palette sampling and embered derivation still come only from the gradient', () => {
    const { paletteFromGradient, emberedPalette } = jest.requireActual('../src/theme/palettes');
    for (const f of FLAMES) {
      expect(f.palette).toEqual(paletteFromGradient(f.gradient));
      expect(f.embered).toEqual(emberedPalette(f.palette));
    }
  });

  test('drift data is unchanged (only Aurora and Nebula drift)', () => {
    const drifting = FLAMES.filter((f: FlameStyle) => f.drift);
    expect(drifting.map(f => f.id)).toEqual(['aurora', 'nebula']);
    expect(flameById('aurora').drift).toEqual({ hueDeg: 40, ms: 12000 });
    expect(flameById('nebula').drift).toEqual({ hueDeg: 60, ms: 16000 });
  });
});

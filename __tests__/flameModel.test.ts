/**
 * flameModel.test.ts — the pure strength→visual curve.
 *
 * Guards the oracle from contracts/flame-and-theme.md: intensity starts at 0,
 * strictly increases, soft-caps toward 1; and the lit flame height never shrinks
 * as strength grows.
 */

import {
  intensity,
  flameVisual,
  resolveVisualProfile,
  resolveShapeDescriptor,
  resolveMotionDescriptor,
  resolveParticleDescriptors,
  resolveAuraDescriptor,
  resolveStrengthVisuals,
} from '../src/components/Bonfire/flameModel';
import type { FireState } from '../src/domain/fire';
import {
  flameById,
  DEFAULT_VISUAL_PROFILE,
  FLAMES,
  type VisualProfile,
} from '../src/domain/flames';

const lit = (strength: number): FireState => ({
  state: 'lit',
  strength,
  everLit: true,
  label: { word: '', sub: '' },
});

describe('intensity', () => {
  test('intensity(0) === 0', () => {
    expect(intensity(0)).toBe(0);
  });

  test('strictly increasing in strength', () => {
    for (let s = 0; s < 60; s++) {
      expect(intensity(s + 1)).toBeGreaterThan(intensity(s));
    }
  });

  test('soft caps below 1', () => {
    expect(intensity(100)).toBeLessThan(1);
    expect(intensity(100)).toBeGreaterThan(0.99);
  });

  test('clamps negative strength to 0', () => {
    expect(intensity(-5)).toBe(0);
  });
});

describe('flameVisual', () => {
  test('not-lit fires are a tiny spark with no intensity', () => {
    const unlit = flameVisual({ state: 'unlit', strength: 0, everLit: false, label: { word: '', sub: '' } });
    expect(unlit.height).toBe(30);
    expect(unlit.glow).toBeCloseTo(0.12);
    expect(unlit.intensity).toBe(0);

    const out = flameVisual({ state: 'out', strength: 0, everLit: true, label: { word: '', sub: '' } });
    expect(out.height).toBe(30);
    expect(out.glow).toBe(0);
    expect(out.intensity).toBe(0);
  });

  test('lit height is non-decreasing in strength', () => {
    let prev = -Infinity;
    for (let s = 0; s < 60; s++) {
      const h = flameVisual(lit(s)).height;
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });

  test('lit base height is 60 at strength 0', () => {
    expect(flameVisual(lit(0)).height).toBe(60);
  });
});

// ===========================================================================
// Profile → render descriptors (spec 004). Pure mappings: a flame's
// BonfireDesign visualProfile becomes fully-defaulted numbers for the renderer.
// ===========================================================================

const profileOf = (id: string): VisualProfile => flameById(id).visualProfile!;

describe('FLAMES catalog invariants', () => {
  test('exactly one base-tier flame exists and it has no achievement', () => {
    const base = FLAMES.filter(f => f.tier === 'base');
    expect(base).toHaveLength(1);
    expect(base[0].achievement).toBeNull();
  });

  test('every streak/time flame has an achievement; windowDays present iff type === time', () => {
    for (const f of FLAMES) {
      if (f.tier === 'base') continue;
      expect(f.achievement).not.toBeNull();
      const a = f.achievement!;
      if (a.type === 'time') {
        expect(typeof a.windowDays).toBe('number');
      } else {
        expect(a.windowDays).toBeUndefined();
      }
    }
  });

  test('palette and embered variants are derived consistently for every flame', () => {
    for (const f of FLAMES) {
      expect(f.palette).toBeDefined();
      expect(f.embered).toBeDefined();
      expect(f.gradient.length).toBeGreaterThan(0);
      expect(f.embered).not.toEqual(f.palette);
    }
  });

  test('every flame carries a visualProfile with the required top-level fields', () => {
    for (const f of FLAMES) {
      const p = f.visualProfile;
      expect(p).toBeDefined();
      expect(p!.shape).toBeDefined();
      expect(p!.motion).toBeDefined();
      expect(Array.isArray(p!.particles)).toBe(true);
      expect(p!.aura).toBeDefined();
      expect(Array.isArray(p!.accents)).toBe(true);
      expect(p!.paletteIntent).toBeDefined();
      expect(p!.designRef).toBeDefined();
    }
  });
});

describe('resolveVisualProfile / fallback (US1)', () => {
  test('returns the style profile when present', () => {
    const style = flameById('voidfire');
    expect(resolveVisualProfile(style)).toBe(style.visualProfile);
  });

  test('falls back to the Amber-like default for missing/malformed profiles', () => {
    expect(resolveVisualProfile(undefined)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(resolveVisualProfile(null)).toBe(DEFAULT_VISUAL_PROFILE);
    expect(resolveVisualProfile({ visualProfile: undefined })).toBe(DEFAULT_VISUAL_PROFILE);
    const broken = { visualProfile: { shape: { tongues: [] } } } as never;
    expect(resolveVisualProfile(broken)).toBe(DEFAULT_VISUAL_PROFILE);
  });

  test('a malformed shape resolves to Amber-like safe descriptors', () => {
    const desc = resolveShapeDescriptor({ shape: { variant: 'classic', tongues: [] } } as never);
    // The default has a single classic tongue with identity transforms.
    expect(desc.variant).toBe('classic');
    expect(desc.tongues).toHaveLength(1);
    expect(desc.tongues[0]).toMatchObject({ dx: 0, sx: 1, sy: 1, rot: 0 });
  });
});

describe('resolveShapeDescriptor — all 16 variants (US1)', () => {
  const VARIANTS = [
    'classic', 'lance', 'split', 'forked', 'twin', 'wide', 'warped', 'detached',
    'squat', 'layered', 'crystal', 'crown', 'solar', 'inverted', 'ribbon', 'wing',
  ];

  test('every BonfireDesign variant is represented by some catalog flame', () => {
    const { FLAMES } = jest.requireActual('../src/domain/flames');
    const seen = new Set(FLAMES.map((f: { visualProfile?: VisualProfile }) => f.visualProfile?.shape.variant));
    for (const v of VARIANTS) expect(seen.has(v)).toBe(true);
  });

  test('tongue transforms are fully defaulted to identity baselines', () => {
    const amber = resolveShapeDescriptor(profileOf('amber'));
    expect(amber.tongues[0]).toEqual({
      dx: 0, fy: 0, rot: 0, sx: 1, sy: 1, lag: 0, soft: false, float: false, ghost: null, hue: 0,
    });
  });

  test('detached fragments carry float + soft layer flags (Wisp)', () => {
    const wisp = resolveShapeDescriptor(profileOf('wisp'));
    expect(wisp.variant).toBe('detached');
    expect(wisp.tongues[0].float).toBe(false); // base tongue is solid
    expect(wisp.tongues.slice(1).every(t => t.float && t.soft)).toBe(true);
  });

  test('layered ghosts carry opacity + hue tokens (Spectral/Nebula)', () => {
    const spectral = resolveShapeDescriptor(profileOf('spectral'));
    expect(spectral.tongues[1].ghost).toBeCloseTo(0.35);
    const nebula = resolveShapeDescriptor(profileOf('nebula'));
    expect(nebula.tongues[1].hue).toBe(130);
    expect(nebula.tongues[2].hue).toBe(-95);
  });

  test('special scale traits: footprint, coreScale, opacity, inverted core', () => {
    expect(resolveShapeDescriptor(profileOf('conflagration')).footprint).toBe(1.3);
    expect(resolveShapeDescriptor(profileOf('nebula')).footprint).toBe(1.2);
    expect(resolveShapeDescriptor(profileOf('solfire')).coreScale).toBe(1.7);
    expect(resolveShapeDescriptor(profileOf('ghostlight')).bodyOpacity).toBe(0.55);
    expect(resolveShapeDescriptor(profileOf('voidfire')).invertCore).toBe(true);
    // Defaults for a plain flame.
    const amber = resolveShapeDescriptor(profileOf('amber'));
    expect(amber).toMatchObject({ footprint: 1, coreScale: 1, bodyOpacity: 1, invertCore: false });
  });
});

describe('resolveMotionDescriptor (US2)', () => {
  test('smooth vs harsh family and BonfireDesign speed pass through', () => {
    expect(resolveMotionDescriptor(profileOf('amber'))).toMatchObject({ family: 'smooth', speed: 1 });
    expect(resolveMotionDescriptor(profileOf('strontium')).family).toBe('harsh');
    expect(resolveMotionDescriptor(profileOf('conflagration')).family).toBe('harsh');
    expect(resolveMotionDescriptor(profileOf('sodium')).speed).toBe(0.4); // fast shimmer
    expect(resolveMotionDescriptor(profileOf('ghostlight')).speed).toBe(2.4); // low-gravity drift
  });

  test('modifiers map: sway, coal/core pulse, hueDrift(ms), warp, ribbon', () => {
    expect(resolveMotionDescriptor(profileOf('magenta')).sway).toBe(7);
    expect(resolveMotionDescriptor(profileOf('ember')).pulse).toBe('coal');
    expect(resolveMotionDescriptor(profileOf('solfire')).pulse).toBe('core');
    expect(resolveMotionDescriptor(profileOf('aurora'))).toMatchObject({ hueDriftMs: 14000, ribbon: true });
    expect(resolveMotionDescriptor(profileOf('nebula')).hueDriftMs).toBe(22000);
    expect(resolveMotionDescriptor(profileOf('toxic')).warp).toBe(true);
  });

  test('absent modifiers default off; zero/negative speed is guarded to 1', () => {
    const amber = resolveMotionDescriptor(profileOf('amber'));
    expect(amber).toMatchObject({ sway: 0, pulse: null, hueDriftMs: 0, warp: false, ribbon: false });
    const bad = resolveMotionDescriptor({ motion: { family: 'smooth', speed: 0 } } as never);
    expect(bad.speed).toBe(1);
  });
});

describe('resolveParticleDescriptors (US3)', () => {
  test('all seven particle kinds appear across the catalog', () => {
    const { FLAMES } = jest.requireActual('../src/domain/flames');
    const kinds = new Set<string>();
    for (const f of FLAMES) {
      for (const d of resolveParticleDescriptors(f.visualProfile)) kinds.add(d.kind);
    }
    expect([...kinds].sort()).toEqual(['ash', 'bubbles', 'motes', 'shards', 'sparks', 'stars', 'wisps']);
  });

  test('multi-variant mixes preserve order and count', () => {
    const ember = resolveParticleDescriptors(profileOf('ember'));
    expect(ember.map(d => d.kind)).toEqual(['ash', 'sparks']);
    expect(ember[0].count).toBe(9);
    expect(ember[1].count).toBe(4);
  });

  test('per-kind controls (size/rise/speed) default to 1 and pass through', () => {
    const crimson = resolveParticleDescriptors(profileOf('crimson'))[0];
    expect(crimson).toMatchObject({ kind: 'sparks', size: 1.25, rise: 1, speed: 1 });
    const sodium = resolveParticleDescriptors(profileOf('sodium'))[0];
    expect(sodium).toMatchObject({ size: 0.55, rise: 0.8, speed: 0.8 });
  });

  test('counts are bounded for performance (per-kind and total caps)', () => {
    const huge = resolveParticleDescriptors({
      particles: [
        { kind: 'sparks', n: 999, color: '#fff' },
        { kind: 'motes', n: 999, color: '#fff' },
      ],
    } as never);
    const total = huge.reduce((s, d) => s + d.count, 0);
    expect(total).toBeLessThanOrEqual(32);
    expect(huge[0].count).toBeLessThanOrEqual(20);
  });
});

describe('resolveAuraDescriptor (US3)', () => {
  test('aura kinds map to distinct geometry', () => {
    expect(resolveAuraDescriptor(profileOf('amber')).kind).toBe('oval');
    const tall = resolveAuraDescriptor(profileOf('sapphire'));
    expect(tall.heightScale).toBeGreaterThan(tall.widthScale);
    const wide = resolveAuraDescriptor(profileOf('magenta'));
    expect(wide.widthScale).toBeGreaterThan(wide.heightScale);
    expect(resolveAuraDescriptor(profileOf('solfire')).kind).toBe('circular');
    expect(resolveAuraDescriptor(profileOf('voidfire')).ring).toBe(true);
  });

  test('dim and crisp modifiers change energy and blur', () => {
    const dim = resolveAuraDescriptor(profileOf('lilac'));
    expect(dim.opacityScale).toBeLessThan(1);
    const crisp = resolveAuraDescriptor(profileOf('sodium'));
    expect(crisp.blur).toBeLessThan(resolveAuraDescriptor(profileOf('amber')).blur);
  });
});

describe('resolveStrengthVisuals reads intensity without mutating it (US2/US5)', () => {
  test('all channels are 1 at t=0 and grow with t', () => {
    const p = profileOf('amber');
    expect(resolveStrengthVisuals(p, 0)).toEqual({ size: 1, motion: 1, particles: 1, aura: 1 });
    const hot = resolveStrengthVisuals(p, 1);
    for (const v of Object.values(hot)) expect(v).toBeGreaterThan(1);
  });

  test('clamps out-of-range intensity and never feeds back into fire math', () => {
    const p = profileOf('amber');
    expect(resolveStrengthVisuals(p, -5)).toEqual({ size: 1, motion: 1, particles: 1, aura: 1 });
    expect(resolveStrengthVisuals(p, 99).size).toBeCloseTo(resolveStrengthVisuals(p, 1).size);
    // The pure curve is untouched: intensity()/flameVisual() are independent.
    expect(intensity(14)).toBeCloseTo(1 - Math.exp(-1));
  });
});

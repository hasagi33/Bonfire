/**
 * flameModel.ts — pure math that turns a FireState + VisualProfile into render
 * descriptors.
 *
 * Two halves:
 *  1. The original strength→visual curve (ported from `BonfireDesign/fire.jsx`):
 *     strength grows without bound, but the flame's normalised "intensity"
 *     approaches 1 along an exponential curve, so a roaring fire looks dramatic
 *     without the geometry exploding (soft cap → SC-002).
 *  2. Profile resolvers (spec 004): small pure functions that normalize a
 *     BonfireDesign `VisualProfile` into plain-number descriptors the Skia
 *     renderers (`Flame.tsx`, `Embers.tsx`) can consume directly. Kept pure (no
 *     React, no Skia) so every shape/motion/particle/aura mapping is
 *     unit-testable, and so a malformed profile can never crash a render —
 *     `resolveVisualProfile` falls back to the Amber-like default.
 *
 * None of the profile resolvers read or mutate fire math: they only translate
 * static catalog data (plus the already-computed intensity) into visuals.
 */

import type { FireState } from '../../domain/fire';
import { fireHealthVisualModifiers, type FireHealthState } from '../../domain/fireHealth';
import {
  safeVisualProfile,
  type AccentProfile,
  type AuraKind,
  type EdgeStyle,
  type FlameStyle,
  type ParticleKind,
  type ShapeVariant,
  type VisualProfile,
} from '../../domain/flames';

export interface FlameVisual {
  height: number; // flame height in px: lit ? 60 + 268*t : 30 (spark)
  glow: number; // 0..1 halo/ground intensity: lit ? 0.35 + 0.6*t : unlit ? 0.12 : 0
  bright: number; // brightness multiplier: 0.85 + 0.45*t
  intensity: number; // t = 1 - e^(-strength/14), or 0 when not lit
  emberRate: number; // embers spawned per tick ~ intensity: 1 + round(t*2)
}

/**
 * Continuous strength → normalised intensity in [0,1) with a flatter start and
 * the current s/(s+60) tail.

 */
export function intensity(strength: number): number {
  const s = Math.max(0, strength);
  return s / (s + 60 + Math.max(0, 60 - s));
}

/** Map the full fire state to the numbers the flame/embers render from. */
export function flameVisual(fire: FireState): FlameVisual {
  const lit = fire.state === 'lit';
  const t = intensity(fire.strength);
  const height = lit ? 60 + 268 * t : 30;
  const glow = lit ? 0.35 + 0.6 * t : fire.state === 'unlit' ? 0.12 : 0;
  const bright = 0.85 + 0.45 * t;
  const emberRate = 1 + Math.round(t * 2);

  return {
    height,
    glow,
    bright,
    intensity: lit ? t : 0,
    emberRate,
  };
}

// ---------------------------------------------------------------------------
// Profile resolvers (spec 004). Each takes BonfireDesign profile data and
// returns a fully-defaulted descriptor: every optional token gets its baseline
// value so the renderer never needs `?? fallback` logic in the hot path.
// ---------------------------------------------------------------------------

/**
 * The single profile entry point for renderers: take the active style (or
 * nothing) and return a guaranteed-valid profile. Missing/malformed profiles
 * resolve to the Amber-like safe default — never a crash, never a blank flame.
 */
export function resolveVisualProfile(style?: Pick<FlameStyle, 'look'> | null): VisualProfile {
  return safeVisualProfile(style?.look);
}

// One tongue with every transform defaulted (BonfireDesign baseline = identity).
export interface TongueDescriptor {
  dx: number; // horizontal offset, fraction of flame height
  fy: number; // vertical base lift, fraction of flame height
  rot: number; // rotation in degrees
  sx: number; // width scale
  sy: number; // height scale
  lag: number; // animation phase lag, seconds
  soft: boolean; // reduced layer mode: only the soft mid/inner layers, no core
  float: boolean; // floating-fragment bob
  ghost: number | null; // afterimage opacity, or null for a solid tongue
  hue: number; // static hue offset in degrees (0 = none)
}

// The full normalized silhouette: tongues + whole-flame shape traits.
export interface ShapeDescriptor {
  variant: ShapeVariant;
  edge: EdgeStyle;
  tongues: TongueDescriptor[];
  coreScale: number; // 1 = standard core size (Solfire: 1.7)
  footprint: number; // whole-flame scale (Conflagration 1.3, Nebula 1.2)
  bodyOpacity: number; // translucent body (Ghostlight 0.55), 1 = solid
  invertCore: boolean; // dark "void" core (Voidfire)
}

/** Normalize a profile's shape section into fully-defaulted tongue descriptors. */
export function resolveShapeDescriptor(profile: VisualProfile): ShapeDescriptor {
  const p = safeVisualProfile(profile);
  return {
    variant: p.shape.variant,
    edge: p.shape.edge ?? 'round',
    tongues: p.shape.tongues.map(t => ({
      dx: t.dx ?? 0,
      fy: t.fy ?? 0,
      rot: t.rot ?? 0,
      sx: t.sx ?? 1,
      sy: t.sy ?? 1,
      lag: t.lag ?? 0,
      soft: t.layers === 'soft',
      float: t.float === true,
      ghost: t.ghost ?? null,
      hue: t.hue ?? 0,
    })),
    coreScale: p.shape.coreScale ?? 1,
    footprint: p.footprint ?? 1,
    bodyOpacity: p.paletteIntent?.opacity ?? 1,
    invertCore: p.paletteIntent?.invert === true,
  };
}

// Motion with every modifier defaulted. `speed` keeps BonfireDesign semantics:
// it multiplies the animation PERIOD, so smaller = faster flicker.
export interface MotionDescriptor {
  family: 'smooth' | 'harsh';
  speed: number; // period multiplier, > 0
  sway: number; // horizontal group sway in px (0 = none)
  pulse: 'coal' | 'core' | null;
  hueDriftMs: number; // hue-drift period in ms (0 = none)
  warp: boolean;
  ribbon: boolean;
}

/** Normalize a profile's motion section; guards against zero/negative speed. */
export function resolveMotionDescriptor(profile: VisualProfile): MotionDescriptor {
  const m = safeVisualProfile(profile).motion;
  return {
    family: m.family === 'harsh' ? 'harsh' : 'smooth',
    speed: m.speed > 0 ? m.speed : 1,
    sway: m.sway ?? 0,
    pulse: m.pulse ?? null,
    hueDriftMs: (m.hueDrift ?? 0) * 1000,
    warp: m.warp === true,
    ribbon: m.ribbon === true,
  };
}

// One particle population, count-bounded and fully defaulted.
export interface ParticleDescriptor {
  kind: ParticleKind;
  count: number;
  color: string;
  size: number; // size multiplier
  rise: number; // rise-distance multiplier
  speed: number; // duration multiplier
}

// Hard performance bounds: per-population and whole-flame particle caps so a
// hand-edited catalog row can never spawn an unbounded Skia node count.
const MAX_PARTICLES_PER_KIND = 20;
const MAX_PARTICLES_TOTAL = 32;

/** Normalize a profile's particle mix into bounded, defaulted descriptors. */
export function resolveParticleDescriptors(profile: VisualProfile): ParticleDescriptor[] {
  const p = safeVisualProfile(profile);
  const out: ParticleDescriptor[] = [];
  let total = 0;
  for (const def of p.particles) {
    const want = Math.max(0, Math.min(MAX_PARTICLES_PER_KIND, Math.round(def.n)));
    const count = Math.min(want, MAX_PARTICLES_TOTAL - total);
    if (count <= 0) continue;
    total += count;
    out.push({
      kind: def.kind,
      count,
      color: def.color,
      size: def.size ?? 1,
      rise: def.rise ?? 1,
      speed: def.speed ?? 1,
    });
  }
  return out;
}

// Halo geometry: scales applied to the baseline oval halo dimensions.
export interface AuraDescriptor {
  kind: AuraKind;
  widthScale: number; // × the baseline halo width
  heightScale: number; // × the baseline halo height
  opacityScale: number; // dim modifier (1 = full)
  blur: number; // halo blur radius in px (crisp = tighter)
  ring: boolean; // hollow ring halo (Voidfire)
}

// Per-kind halo geometry, translated from BonfireDesign `.fp-aura.k-*` CSS.
const AURA_GEOMETRY: Record<AuraKind, { w: number; h: number }> = {
  oval: { w: 1, h: 1 },
  tall: { w: 0.72, h: 1.35 },
  wide: { w: 1.4, h: 0.8 },
  circular: { w: 1.15, h: 0.85 },
  ring: { w: 1.05, h: 0.8 },
};

/** Normalize a profile's aura into halo sizing/energy numbers for the renderer. */
export function resolveAuraDescriptor(profile: VisualProfile): AuraDescriptor {
  const a = safeVisualProfile(profile).aura;
  const geo = AURA_GEOMETRY[a.kind] ?? AURA_GEOMETRY.oval;
  return {
    kind: a.kind,
    widthScale: geo.w,
    heightScale: geo.h,
    opacityScale: a.dim ? 0.55 : 1,
    blur: a.crisp ? 6 : 14,
    ring: a.kind === 'ring',
  };
}

/** Accent list straight from the (validated) profile — a tiny helper so the
 *  renderer and tests share one access path. */
export function resolveAccents(profile: VisualProfile): AccentProfile[] {
  return safeVisualProfile(profile).accents;
}

// How the active flame's visuals scale with the EXISTING fire intensity. These
// multipliers are read-only consumers of intensity; they never change strength.
export interface StrengthVisuals {
  size: number; // whole-flame size response
  motion: number; // flicker/sway/pulse amplitude response
  particles: number; // particle count/opacity response
  aura: number; // halo/accent visibility response
}

export interface HealthVisuals {
  glow: number;
  warmth: number;
  energy: number;
  density: number;
}

/**
 * Resolve a profile's visual response to fire intensity t ∈ [0,1].
 * Each channel grows linearly from 1 (t=0) by up to 30% × the profile's
 * per-channel weight (default 1). Pure: never touches fire state or storage.
 */
export function resolveStrengthVisuals(profile: VisualProfile, t: number): StrengthVisuals {
  const sr = safeVisualProfile(profile).strengthResponse ?? {};
  const clamped = Math.max(0, Math.min(1, t));
  const lift = (weight: number | undefined) => 1 + clamped * 0.3 * (weight ?? 1);
  return {
    size: lift(sr.size),
    motion: lift(sr.motion),
    particles: lift(sr.particles),
    aura: lift(sr.aura),
  };
}

/**
 * Resolve visual-only Fire Health multipliers for the flame renderer.
 * Suppressed health resolves to neutral values and never touches fire strength.
 */
export function resolveHealthVisuals(health?: FireHealthState): HealthVisuals {
  const modifiers = fireHealthVisualModifiers(health);
  return {
    glow: modifiers.glow,
    warmth: modifiers.warmth,
    energy: modifiers.energy,
    density: modifiers.density,
  };
}

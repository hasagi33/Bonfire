/**
 * flames.ts — THE editable flame catalog (the single source of truth).
 *
 * Want to add, tune, or recolor a flame? Edit ONE entry in `FLAMES` below.
 * Nothing else in the app hard-codes a flame: visuals (the gradient + the
 * BonfireDesign visual profile), the achievement that unlocks it, and (for time
 * flames) the window length all live here. Pure data + pure color helpers — no
 * React, no I/O.
 *
 * Two achievement tiers (harder = rarer = further down the list):
 *  - `streak` flames are unlocked WHILE the current run satisfies their
 *    condition, and relock the moment the fire goes out.
 *  - `time` flames unlock on the calendar day their condition completes and stay
 *    unlocked for `windowDays` after that day (while the fire stays lit), then
 *    expire until re-earned.
 *
 * Each gradient is authored BRIGHTEST → DARKEST (hot core first, dark base last)
 * so `paletteFromGradient` samples the hot end into `core` and the cool end into
 * `red`. The dim, locked-state `embered` variant is derived once per flame.
 *
 * VISUAL PROFILES (spec 004): every flame also carries a `visualProfile` — the
 * BonfireDesign-derived description of HOW it should look beyond color: shape
 * variant + per-tongue transforms, motion family/speed, particle mix, aura kind,
 * and special accents. The data is translated 1:1 from
 * `BonfireDesign/flame-profiles.js` (the authoritative design source) and the
 * renderers (`Flame.tsx`, `Embers.tsx`) interpret it generically — no renderer
 * code ever branches on a flame id. Profiles are static catalog data; they are
 * never persisted to storage and never affect unlock logic or fire math.
 */

import {
  paletteFromGradient,
  emberedPalette,
  type Palette,
} from '../theme/palettes';

// A stable, unique id for one flame (kebab-case): 'amber', 'voidfire', …
export type FlameId = string;

// Difficulty/grouping tier. Exactly one 'base' flame exists (always unlocked).
export type FlameTier = 'base' | 'streak' | 'time';

// The closed set of condition kinds the achievement engine knows how to evaluate.
export type ConditionKind =
  // streak kinds (read the CURRENT run)
  | 'runDays'
  | 'runStrength'
  | 'strongDaysInRun'
  | 'runStrengthAndDays'
  // time kinds (scan the timeline for the latest completion day)
  | 'consecutivePerfect'
  | 'unbrokenChain'
  | 'unbrokenChainMinScore'
  | 'perfectCalendarWeek'
  | 'consecutivePerfectWeeks'
  | 'crossStrength';

// The unlock condition tied to a flame.
export interface Achievement {
  type: 'streak' | 'time';
  kind: ConditionKind;
  params: Record<string, number>; // kind-specific numbers, e.g. { n: 7 } or { s: 80, n: 14 }
  windowDays?: number; // REQUIRED iff type === 'time' (the W in the D+W window)
  requirement: string; // human-readable gallery text (FR-017)
}

// ---------------------------------------------------------------------------
// Visual profile types (spec 004) — typed mirrors of BonfireDesign tokens.
// Each type maps to one reusable concept in `BonfireDesign/flame-profiles.js`;
// none of them encodes per-flame behavior, only data the renderer interprets.
// ---------------------------------------------------------------------------

// The closed set of BonfireDesign silhouette families a flame can use.
export type ShapeVariant =
  | 'classic' | 'lance' | 'split' | 'forked' | 'twin' | 'wide' | 'warped'
  | 'detached' | 'squat' | 'layered' | 'crystal' | 'crown' | 'solar'
  | 'inverted' | 'ribbon' | 'wing';

// How tongue outlines are treated (BonfireDesign edge-* classes).
export type EdgeStyle = 'round' | 'sharp' | 'jagged' | 'crystal';

// One tongue's reusable transform. dx/fy are fractions of the flame height.
export interface TongueTransform {
  dx?: number; // horizontal offset (fraction of flame height)
  fy?: number; // vertical base lift for detached fragments (fraction of height)
  rot?: number; // rotation in degrees
  sx?: number; // width scale
  sy?: number; // height scale
  lag?: number; // animation phase lag in seconds
  layers?: 'soft'; // reduced layer mode: only the soft mid/inner layers
  float?: boolean; // floating-fragment bob (Wisp)
  ghost?: number; // opacity for afterimage copies (Spectral/Nebula)
  hue?: number; // static hue offset in degrees (Aurora/Nebula layers)
}

// The full silhouette description for one flame.
export interface ShapeProfile {
  variant: ShapeVariant;
  edge: EdgeStyle;
  tongues: TongueTransform[]; // ordered; first tongue is the main body
  coreScale?: number; // oversized-core multiplier (Solfire)
}

// Animated feel: which flicker family, how fast, plus optional modifiers.
export interface MotionProfile {
  family: 'smooth' | 'harsh';
  speed: number; // BonfireDesign period multiplier (smaller = faster)
  sway?: number; // horizontal group sway amplitude in px
  pulse?: 'coal' | 'core'; // brightness pulse mode
  hueDrift?: number; // hue-drift period in seconds
  warp?: boolean; // warping-outline loop (Toxic)
  ribbon?: boolean; // ribbon-wave motion (Aurora)
}

// The closed set of particle motifs Embers.tsx can draw.
export type ParticleKind =
  | 'sparks' | 'motes' | 'ash' | 'bubbles' | 'shards' | 'wisps' | 'stars';

// One particle population. A flame may mix several (e.g. Phoenix sparks+ash).
export interface ParticleProfile {
  kind: ParticleKind;
  n: number; // BonfireDesign count/density
  color: string; // intended particle color (hex or rgba)
  size?: number; // size multiplier
  rise?: number; // rise-distance multiplier
  speed?: number; // duration multiplier
}

// Halo/glow geometry around the flame.
export type AuraKind = 'oval' | 'tall' | 'wide' | 'circular' | 'ring';
export interface AuraProfile {
  kind: AuraKind;
  dim?: boolean; // fainter halo
  crisp?: boolean; // tighter blur, sharper falloff
  tint?: string; // optional aura tint override
}

// Special one-off visual behaviors, still selected purely by data.
export type AccentProfile =
  | 'afterimage' | 'shockPulse' | 'solarCircle' | 'orbitRing' | 'voidRing' | 'auroraBand';

// BonfireDesign palette metadata that affects rendering beyond the 5-stop palette.
export interface PaletteIntent {
  opacity?: number; // translucent body (Ghostlight 0.55, Spectral 0.85)
  invert?: boolean; // dark "void" core (Voidfire)
  glow?: string; // BonfireDesign glow rgb triple, kept for parity review
}

// Optional per-flame visual response to the existing fire strength. These only
// scale visuals; they must never feed back into fire math or unlock state.
export interface StrengthResponse {
  size?: number;
  motion?: number;
  particles?: number;
  aura?: number;
}

// Everything the renderers need to draw one flame's BonfireDesign identity.
export interface VisualProfile {
  shape: ShapeProfile;
  motion: MotionProfile;
  particles: ParticleProfile[];
  aura: AuraProfile;
  accents: AccentProfile[];
  footprint?: number; // whole-flame scale (Conflagration 1.3, Nebula 1.2)
  paletteIntent: PaletteIntent;
  strengthResponse?: StrengthResponse;
}

/**
 * The Amber-like safe profile: the baseline every other flame only overrides.
 * Render-time fallback for a missing/malformed profile (never crashes, never
 * blanks the flame).
 */
export const DEFAULT_VISUAL_PROFILE: VisualProfile = {
  shape: { variant: 'classic', edge: 'round', tongues: [{}] },
  motion: { family: 'smooth', speed: 1 },
  aura: { kind: 'oval' },
  accents: [],
  particles: [{ kind: 'sparks', n: 8, color: '#ffae3b' }],
  paletteIntent: { glow: '255,150,40' },
};

/**
 * Validate a profile enough to render safely; anything structurally broken
 * (missing sections, empty tongue list…) falls back to the Amber-like default.
 * This is the renderer's single safety gate — it never throws.
 */
export function safeVisualProfile(profile?: VisualProfile | null): VisualProfile {
  if (
    profile &&
    typeof profile === 'object' &&
    profile.shape &&
    typeof profile.shape.variant === 'string' &&
    Array.isArray(profile.shape.tongues) &&
    profile.shape.tongues.length > 0 &&
    profile.motion &&
    typeof profile.motion.speed === 'number' &&
    profile.motion.speed > 0 &&
    Array.isArray(profile.particles) &&
    profile.aura &&
    typeof profile.aura.kind === 'string' &&
    Array.isArray(profile.accents)
  ) {
    return profile;
  }
  return DEFAULT_VISUAL_PROFILE;
}

// One catalog flame: its identity, look, and (optional) unlock achievement.
export interface FlameStyle {
  id: FlameId;
  name: string;
  tier: FlameTier;
  rarity: number; // strictly increases base < streak < time (SC-009)
  gradient: string[]; // full multicolor stops, brightest → darkest
  drift?: { hueDeg: number; ms: number }; // optional slow hue drift (visual polish)
  palette: Palette; // 5-stop palette the Skia flame consumes (sampled from gradient)
  embered: Palette; // dim/desaturated locked-state variant (FR-014/FR-024)
  achievement: Achievement | null; // null ONLY for the base flame
  visualProfile?: VisualProfile; // BonfireDesign visual identity (spec 004)
}

export const BASE_FLAME_ID: FlameId = 'amber';

/**
 * Small builder so each catalog row stays compact: it samples the gradient
 * into the render palette and precomputes the embered variant. Keeping this here
 * means a new flame is genuinely "append one entry". `visualProfile` is optional
 * in the signature (renderers fall back safely), but every catalog row supplies
 * one — the parity tests enforce that.
 */
function flame(
  id: FlameId,
  name: string,
  tier: FlameTier,
  rarity: number,
  gradient: string[],
  achievement: Achievement | null,
  visualProfile?: VisualProfile,
  drift?: { hueDeg: number; ms: number },
): FlameStyle {
  const palette = paletteFromGradient(gradient);
  return {
    id, name, tier, rarity, gradient, palette,
    embered: emberedPalette(palette), achievement, drift, visualProfile,
  };
}

// Convenience constructors for the two achievement shapes (readability only).
function streak(kind: ConditionKind, params: Record<string, number>, requirement: string): Achievement {
  return { type: 'streak', kind, params, requirement };
}
function time(
  kind: ConditionKind,
  params: Record<string, number>,
  windowDays: number,
  requirement: string,
): Achievement {
  return { type: 'time', kind, params, windowDays, requirement };
}

// ---------------------------------------------------------------------------
// The 20 BonfireDesign visual profiles, translated 1:1 from
// `BonfireDesign/flame-profiles.js`. Token values (tongue transforms, speeds,
// particle counts/colors, footprints, core scales, opacities) are copied
// verbatim.
// ---------------------------------------------------------------------------

const PROFILES: Record<FlameId, VisualProfile> = {
  amber: DEFAULT_VISUAL_PROFILE,
  crimson: {
    shape: { variant: 'classic', edge: 'sharp', tongues: [{ sx: 0.94, sy: 1.04 }] },
    motion: { family: 'smooth', speed: 0.7 },
    aura: { kind: 'oval' },
    accents: [],
    particles: [{ kind: 'sparks', n: 11, color: '#ff5a3a', size: 1.25 }],
    paletteIntent: { glow: '255,70,50' },
  },
  sapphire: {
    shape: { variant: 'classic', edge: 'round', tongues: [{ sx: 0.9, sy: 1.3 }] },
    motion: { family: 'smooth', speed: 1.7 },
    aura: { kind: 'tall' },
    accents: [],
    particles: [{ kind: 'sparks', n: 7, color: '#bfe0ff', size: 0.85, rise: 1.2 }],
    paletteIntent: { glow: '90,150,255' },
  },
  sodium: {
    shape: { variant: 'lance', edge: 'sharp', tongues: [{ sx: 0.55, sy: 1.45 }] },
    motion: { family: 'smooth', speed: 0.4 },
    aura: { kind: 'tall', crisp: true },
    accents: [],
    particles: [{ kind: 'sparks', n: 12, color: '#fff2a0', size: 0.55, rise: 0.8, speed: 0.8 }],
    paletteIntent: { glow: '255,210,40' },
  },
  strontium: {
    shape: {
      variant: 'split', edge: 'jagged',
      tongues: [{ dx: -0.09, rot: -8, sx: 0.7, sy: 0.97 }, { dx: 0.09, rot: 8, sx: 0.7, sy: 0.9, lag: 0.2 }],
    },
    motion: { family: 'harsh', speed: 0.5 },
    aura: { kind: 'oval', dim: true },
    accents: [],
    particles: [{ kind: 'sparks', n: 10, color: '#ff7a4a', rise: 0.55, speed: 0.7 }],
    paletteIntent: { glow: '255,60,40' },
  },
  emerald: {
    shape: {
      variant: 'forked', edge: 'round',
      tongues: [
        { sx: 0.82, sy: 1.06 },
        { dx: -0.12, rot: -14, sx: 0.5, sy: 0.7, lag: 0.3 },
        { dx: 0.12, rot: 14, sx: 0.5, sy: 0.66, lag: 0.55 },
      ],
    },
    motion: { family: 'smooth', speed: 1 },
    aura: { kind: 'oval' },
    accents: [],
    particles: [{ kind: 'motes', n: 8, color: '#7defa8' }],
    paletteIntent: { glow: '40,220,120' },
  },
  lilac: {
    shape: {
      variant: 'twin', edge: 'round',
      tongues: [{ dx: -0.09, rot: -4, sx: 0.6, sy: 0.96 }, { dx: 0.09, rot: 4, sx: 0.6, sy: 0.88, lag: 0.4 }],
    },
    motion: { family: 'smooth', speed: 2 },
    aura: { kind: 'oval', dim: true },
    accents: [],
    particles: [{ kind: 'wisps', n: 5, color: 'rgba(190,160,255,0.55)' }],
    paletteIntent: { glow: '170,140,250' },
  },
  magenta: {
    shape: { variant: 'wide', edge: 'round', tongues: [{ sx: 1.38, sy: 0.92 }] },
    motion: { family: 'smooth', speed: 0.8, sway: 7 },
    aura: { kind: 'wide' },
    accents: [],
    particles: [{ kind: 'stars', n: 8, color: '#ff9ade' }],
    paletteIntent: { glow: '255,70,190' },
  },
  ghostlight: {
    shape: { variant: 'classic', edge: 'round', tongues: [{ sx: 0.95, sy: 1.05 }] },
    motion: { family: 'smooth', speed: 2.4 },
    aura: { kind: 'oval', dim: true },
    accents: [],
    particles: [{ kind: 'wisps', n: 6, color: 'rgba(170,220,220,0.5)', rise: 1.2 }],
    paletteIntent: { opacity: 0.55, glow: '140,200,200' },
  },
  toxic: {
    shape: { variant: 'warped', edge: 'round', tongues: [{ sx: 1.04, sy: 0.96 }] },
    motion: { family: 'smooth', speed: 1.1, warp: true },
    aura: { kind: 'oval', dim: true },
    accents: [],
    particles: [{ kind: 'bubbles', n: 9, color: '#b8f25e' }],
    paletteIntent: { glow: '140,230,30' },
  },
  wisp: {
    shape: {
      variant: 'detached', edge: 'round',
      tongues: [
        { sx: 0.55, sy: 0.62 },
        { dx: -0.18, fy: 0.62, sx: 0.22, sy: 0.3, layers: 'soft', float: true },
        { dx: 0.15, fy: 0.85, sx: 0.18, sy: 0.26, layers: 'soft', float: true, lag: 0.7 },
        { dx: -0.04, fy: 1.1, sx: 0.14, sy: 0.2, layers: 'soft', float: true, lag: 1.4 },
      ],
    },
    motion: { family: 'smooth', speed: 2.2 },
    aura: { kind: 'oval', dim: true },
    accents: [],
    particles: [{ kind: 'wisps', n: 7, color: 'rgba(80,230,210,0.5)' }],
    paletteIntent: { glow: '50,220,200' },
  },
  ember: {
    shape: { variant: 'squat', edge: 'round', tongues: [{ sx: 1.22, sy: 0.55 }] },
    motion: { family: 'smooth', speed: 1.6, pulse: 'coal' },
    aura: { kind: 'wide', dim: true },
    accents: [],
    particles: [
      { kind: 'ash', n: 9, color: '#9a8e84' },
      { kind: 'sparks', n: 4, color: '#ff8c3a', rise: 0.6 },
    ],
    paletteIntent: { glow: '230,90,20' },
  },
  spectral: {
    shape: {
      variant: 'layered', edge: 'round',
      tongues: [
        { sx: 0.9, sy: 1.02 },
        { dx: -0.07, sx: 0.88, sy: 1, ghost: 0.35, lag: 0.3 },
        { dx: 0.075, sx: 0.86, sy: 0.96, ghost: 0.22, lag: 0.6 },
      ],
    },
    motion: { family: 'smooth', speed: 1.4 },
    aura: { kind: 'oval', dim: true },
    accents: ['afterimage'],
    particles: [{ kind: 'motes', n: 8, color: '#7fe8f4' }],
    paletteIntent: { opacity: 0.85, glow: '70,210,230' },
  },
  frostfire: {
    shape: {
      variant: 'crystal', edge: 'crystal',
      tongues: [
        { sx: 0.9, sy: 1.12 },
        { dx: -0.13, rot: -18, sx: 0.42, sy: 0.56, lag: 0.25 },
        { dx: 0.13, rot: 18, sx: 0.42, sy: 0.5, lag: 0.5 },
      ],
    },
    motion: { family: 'harsh', speed: 0.85 },
    aura: { kind: 'oval', crisp: true },
    accents: [],
    particles: [{ kind: 'shards', n: 8, color: '#cfeaff' }],
    paletteIntent: { glow: '130,190,255' },
  },
  conflagration: {
    shape: {
      variant: 'crown', edge: 'round',
      tongues: [
        { sx: 0.95, sy: 1.1 },
        { dx: -0.16, rot: -12, sx: 0.6, sy: 0.82, lag: 0.15 },
        { dx: 0.16, rot: 12, sx: 0.6, sy: 0.78, lag: 0.3 },
        { dx: -0.3, rot: -24, sx: 0.42, sy: 0.55, lag: 0.45 },
        { dx: 0.3, rot: 24, sx: 0.42, sy: 0.52, lag: 0.6 },
      ],
    },
    motion: { family: 'harsh', speed: 0.55 },
    aura: { kind: 'wide' },
    accents: [],
    particles: [{ kind: 'sparks', n: 16, color: '#ffb03a', size: 1.2, rise: 1.3 }],
    footprint: 1.3,
    paletteIntent: { glow: '255,120,20' },
  },
  solfire: {
    shape: { variant: 'solar', edge: 'round', tongues: [{ sx: 0.85, sy: 0.92 }], coreScale: 1.7 },
    motion: { family: 'smooth', speed: 0.9, pulse: 'core' },
    aura: { kind: 'circular' },
    accents: ['solarCircle'],
    particles: [
      { kind: 'stars', n: 6, color: '#ffe88a' },
      { kind: 'motes', n: 5, color: '#ffd24a' },
    ],
    paletteIntent: { glow: '255,200,60' },
  },
  voidfire: {
    shape: { variant: 'inverted', edge: 'sharp', tongues: [{ sx: 0.96, sy: 1.06 }] },
    motion: { family: 'smooth', speed: 1.2 },
    aura: { kind: 'ring' },
    accents: ['voidRing'],
    particles: [{ kind: 'motes', n: 7, color: '#b07aff' }],
    paletteIntent: { invert: true, glow: '150,80,255' },
  },
  aurora: {
    shape: {
      variant: 'ribbon', edge: 'round',
      tongues: [
        { dx: -0.18, rot: -9, sx: 0.5, sy: 1.02, hue: -35, lag: 0.4 },
        { sx: 0.56, sy: 1.16 },
        { dx: 0.18, rot: 9, sx: 0.5, sy: 0.94, hue: 35, lag: 0.8 },
      ],
    },
    motion: { family: 'smooth', speed: 1.9, hueDrift: 14, ribbon: true },
    aura: { kind: 'wide', dim: true },
    accents: ['auroraBand'],
    particles: [
      { kind: 'wisps', n: 6, color: 'rgba(90,230,190,0.5)' },
      { kind: 'motes', n: 4, color: '#8ae8d8' },
    ],
    paletteIntent: { glow: '80,230,180' },
  },
  phoenix: {
    shape: {
      variant: 'wing', edge: 'round',
      tongues: [
        { sx: 0.8, sy: 1.18 },
        { dx: -0.22, rot: -30, sx: 0.7, sy: 0.82, lag: 0.35 },
        { dx: 0.22, rot: 30, sx: 0.7, sy: 0.78, lag: 0.55 },
      ],
    },
    motion: { family: 'smooth', speed: 0.9 },
    aura: { kind: 'tall' },
    accents: [],
    particles: [
      { kind: 'sparks', n: 8, color: '#ffc34a', rise: 1.2 },
      { kind: 'ash', n: 6, color: '#8a7e74' },
    ],
    paletteIntent: { glow: '255,150,40' },
  },
  nebula: {
    shape: {
      variant: 'layered', edge: 'round',
      tongues: [
        { sx: 1.04, sy: 1.1 },
        { dx: -0.09, sx: 0.7, sy: 0.86, ghost: 0.55, hue: 130, lag: 0.4 },
        { dx: 0.1, sx: 0.6, sy: 0.76, ghost: 0.5, hue: -95, lag: 0.8 },
      ],
    },
    motion: { family: 'smooth', speed: 1.6, hueDrift: 22 },
    aura: { kind: 'circular' },
    accents: ['orbitRing', 'auroraBand'],
    particles: [
      { kind: 'stars', n: 9, color: '#ffe9a0' },
      { kind: 'motes', n: 7, color: '#54d8e8' },
    ],
    footprint: 1.2,
    paletteIntent: { glow: '150,100,255' },
  },
};

/**
 * THE CATALOG — rarity ascending. Edit here to tune the whole feature.
 * Unlocks must always reward stronger scores and longer continuity. Do not add
 * conditions that require keeping scores low or intentionally letting the fire go
 * out.
 */
export const FLAMES: readonly FlameStyle[] = [
  // ---- Base (always unlocked) ----
  flame('amber', 'Amber', 'base', 0, ['#fff4cf', '#ffd27a', '#ffae3b', '#ff7a18', '#b3380f'], null,
    PROFILES.amber),

  // ---- Streak (unlocked while the run satisfies the condition) ----
  flame('crimson', 'Crimson', 'streak', 1, ['#fff0d6', '#ffc27a', '#ff7a3b', '#ff3b1f', '#7a0f0f'],
    streak('runStrength', { n: 5 }, 'Reach run strength 5'), PROFILES.crimson),
  flame('sapphire', 'Sapphire', 'streak', 2, ['#f0f9ff', '#bfe3ff', '#4ab6ff', '#2a8bff', '#163f8a'],
    streak('runDays', { n: 5 }, 'Keep a 5-day run'), PROFILES.sapphire),
  flame('sodium', 'Sodium', 'streak', 3, ['#FFF6B0', '#FFC400', '#E36A00'],
    streak('runDays', { n: 7 }, 'Keep a 7-day run'), PROFILES.sodium),
  flame('strontium', 'Strontium', 'streak', 4, ['#FFC9B0', '#FF3B2E', '#8C0A12'],
    streak('strongDaysInRun', { n: 5 }, 'Log 5 strong days (4 or 5) in one run'), PROFILES.strontium),
  flame('emerald', 'Emerald', 'streak', 5, ['#EAFFC2', '#6FE85A', '#1FB36A', '#138A2E'],
    streak('runStrength', { n: 20 }, 'Reach run strength 20'), PROFILES.emerald),
  flame('lilac', 'Lilac', 'streak', 6, ['#FFE6FF', '#C77DFF', '#6A2FB5'],
    streak('runDays', { n: 10 }, 'Keep a 10-day run'), PROFILES.lilac),
  flame('magenta', 'Magenta', 'streak', 7, ['#FFD9EC', '#FF4D9D', '#B0114E'],
    streak('runStrength', { n: 40 }, 'Reach run strength 40'), PROFILES.magenta),
  flame('ghostlight', 'Ghostlight', 'streak', 8, ['#FFFFFF', '#BFE6FF', '#4FA8FF'],
    streak('runStrengthAndDays', { s: 80, n: 14 }, 'Reach run strength 80 within a 14-day run'),
    PROFILES.ghostlight),

  // ---- Time (unlock on the achievement day, expire after the window) ----
  flame('toxic', 'Toxic', 'time', 9, ['#F2FFB0', '#9AFF1E', '#2EA800'],
    time('consecutivePerfect', { n: 3 }, 7, 'Score 3 perfect days (5) in a row'), PROFILES.toxic),
  flame('wisp', 'Wisp', 'time', 10, ['#DFFFF6', '#5FE0C0', '#1E7F86'],
    time('unbrokenChainMinScore', { n: 5, min: 3 }, 10, 'Log 5 days in a row, none below 3'), PROFILES.wisp),
  flame('ember', 'Ember', 'time', 11, ['#FFB060', '#E8501E', '#5C0E08'],
    time('unbrokenChainMinScore', { n: 10, min: 3 }, 14, 'Log 10 days in a row, all 3 or higher'),
    PROFILES.ember),
  flame('spectral', 'Spectral', 'time', 12, ['#F0FFFF', '#7FFFE0', '#2E9FB0'],
    time('crossStrength', { n: 30 }, 10, 'Reach run strength 30'), PROFILES.spectral),
  flame('frostfire', 'Frostfire', 'time', 13, ['#FFFFFF', '#9FE8FF', '#2E7BD6'],
    time('perfectCalendarWeek', { minScore: 1 }, 14, 'Score every day of one calendar week'),
    PROFILES.frostfire),
  flame('conflagration', 'Conflagration', 'time', 14, ['#FFFFFF', '#FFD24A', '#FF5A00'],
    time('perfectCalendarWeek', { minScore: 4 }, 14, 'Score 4 or more every day of one calendar week'),
    PROFILES.conflagration),
  flame('solfire', 'Solfire', 'time', 15, ['#FFFFFF', '#FFE066', '#FFA21E'],
    time('crossStrength', { n: 100 }, 14, 'Reach run strength 100'), PROFILES.solfire),
  flame('voidfire', 'Voidfire', 'time', 16, ['#E2B3FF', '#8B2FE0', '#2A0A4A'],
    time('unbrokenChain', { n: 14 }, 21, 'Log 14 days in a row'), PROFILES.voidfire),
  flame('aurora', 'Aurora', 'time', 17, ['#B8FFD9', '#5FE0C0', '#FF7AD9', '#8B2FE0'],
    time('unbrokenChain', { n: 30 }, 21, 'Log 30 days in a row'), PROFILES.aurora,
    { hueDeg: 40, ms: 12000 }),
  flame('phoenix', 'Phoenix', 'time', 18, ['#FFFFFF', '#FFD24A', '#FF5A00', '#4A4A4A'],
    time('crossStrength', { n: 150 }, 21, 'Reach run strength 150'), PROFILES.phoenix),
  flame('nebula', 'Nebula', 'time', 19, ['#FFE066', '#7FFFE0', '#2E9FB0', '#2A0A4A'],
    time('consecutivePerfectWeeks', { weeks: 2, minScore: 4, minPerfect: 10 }, 21,
      'Two strong weeks in a row (every day 4+, 10+ perfect days)'), PROFILES.nebula,
    { hueDeg: 60, ms: 16000 }),
];

// Fast id → flame lookup, built once.
const BY_ID: Record<FlameId, FlameStyle> = Object.fromEntries(FLAMES.map(f => [f.id, f]));

/** Look up a flame by id; any unknown id safely falls back to the base flame. */
export function flameById(id: FlameId): FlameStyle {
  return BY_ID[id] ?? BY_ID[BASE_FLAME_ID];
}

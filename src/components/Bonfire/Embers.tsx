/**
 * Embers.tsx — rising particles (React Native Skia).
 *
 * Two pools, mirroring the design:
 *  - ambient background embers (`styles.css .bg-embers`): ~14 slow, faint motes
 *    drifting up the whole scene, always on.
 *  - PROFILE particles (spec 004, `BonfireDesign/flame-profiles.js`): the active
 *    flame's `look.particles` mix — sparks/motes/ash/bubbles/shards/
 *    wisps/stars — each population with its own count, color, size, rise and
 *    speed, brightness scaling with the fire's `intensity` (0 when not lit, so
 *    out-state precedence holds: no live particles on a dead fire).
 *
 * Every variant is drawn by ONE shared <ProfileParticle> with kind-specific
 * geometry (no per-flame components, no flame-id branches). Seeds are
 * deterministic — a tiny seeded PRNG keyed by dimensions + the particle
 * descriptor — and memoized, so profile/dimension changes rebuild pools once
 * and re-renders never reshuffle particles.
 *
 * Each particle loops on the UI thread from a shared clock, so motion stays
 * smooth at the display refresh rate without any per-frame JS/React work.
 * Reduced motion freezes the clock (particles hold still).
 */

import React, { useMemo } from 'react';
import { Canvas, Circle, Group, Oval, Path, RadialGradient, Skia, rect, vec } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import type { FlameStyle, ParticleKind } from '../../domain/flames';
import type { FlamePulseState } from '../../domain/flamePulses';
import { withAlpha, type Palette } from '../../theme/palettes';
import { resolveParticleDescriptors, resolveVisualProfile, type ParticleDescriptor } from './flameModel';

export interface EmbersProps {
  width: number;
  height: number;
  intensity: number; // 0..1 (0 = not lit → no fire particles)
  palette: Palette;
  // The active catalog flame; its look.particles selects the mix.
  activeStyle?: FlameStyle;
  // Shared scene clock from BonfireScreen; avoids a second per-frame driver.
  clock: SharedValue<number>;
  pulse?: FlamePulseState;
}

// A deterministic seed for one particle.
interface Seed {
  x: number; // horizontal start, fraction of width
  size: number;
  period: number; // ms for one full rise
  phase: number; // 0..1 offset so they don't all start together
  drift: number; // horizontal drift in px over the rise
  rise: number; // how far up it travels, px
  spin: number; // rotation speed factor (shards/stars tumble)
}

// Tiny deterministic PRNG (mulberry32): same seed → same particle field, so
// pools are stable across re-renders and reproducible in tests.
function mulberry32(seedNum: number) {
  let a = seedNum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cheap string hash so descriptor identity (kind+color+count…) seeds the PRNG.
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Per-kind motion/size defaults, translated from BonfireDesign FP_PKIND
// (durations s → ms; rise px; size px). Profile size/rise/speed multiply these.
const KIND_DEFAULTS: Record<ParticleKind, {
  period: [number, number]; rise: [number, number]; size: [number, number];
  spread: number; drift: number;
}> = {
  sparks: { period: [1400, 2400], rise: [130, 240], size: [2, 4], spread: 0.18, drift: 40 },
  motes: { period: [2600, 4200], rise: [90, 170], size: [2.5, 4.5], spread: 0.24, drift: 50 },
  ash: { period: [3000, 5000], rise: [110, 190], size: [2, 3.5], spread: 0.22, drift: 70 },
  bubbles: { period: [1800, 2800], rise: [36, 80], size: [3, 6], spread: 0.1, drift: 12 },
  shards: { period: [1800, 2900], rise: [110, 190], size: [3, 5], spread: 0.22, drift: 46 },
  wisps: { period: [3200, 5200], rise: [80, 150], size: [4, 7], spread: 0.26, drift: 60 },
  stars: { period: [2000, 3300], rise: [110, 210], size: [3.5, 6], spread: 0.24, drift: 56 },
};

/** Build a deterministic seed pool for one particle descriptor. */
function makeProfileSeeds(d: ParticleDescriptor, index: number, width: number, height: number): Seed[] {
  const base = KIND_DEFAULTS[d.kind];
  const rand = mulberry32(hashString(`${d.kind}|${d.color}|${d.count}|${index}|${width}x${height}`));
  const seeds: Seed[] = [];
  for (let i = 0; i < d.count; i++) {
    seeds.push({
      // Spawn around the flame's center column, spread per kind.
      x: 0.5 + (rand() - 0.5) * 2 * base.spread,
      size: (base.size[0] + rand() * (base.size[1] - base.size[0])) * d.size,
      period: (base.period[0] + rand() * (base.period[1] - base.period[0])) * d.speed,
      phase: rand(),
      drift: (rand() - 0.5) * 2 * base.drift,
      rise: (base.rise[0] + rand() * (base.rise[1] - base.rise[0])) * d.rise,
      spin: 0.5 + rand(),
    });
  }
  return seeds;
}

/** Seeds for the always-on ambient pool (deterministic for stability). */
function makeAmbientSeeds(count: number, height: number): Seed[] {
  const rand = mulberry32(hashString(`ambient|${count}|${height}`));
  const seeds: Seed[] = [];
  for (let i = 0; i < count; i++) {
    seeds.push({
      x: 0.05 + rand() * 0.9,
      size: 1.5 + rand() * 1.5,
      period: 6000 + rand() * 7000,
      phase: rand(),
      drift: (rand() - 0.5) * 60,
      rise: height,
      spin: 1,
    });
  }
  return seeds;
}

// Canonical small shapes for the angular particle kinds, built once. Particles
// position/scale them via transforms, so each kind shares one path.
const SHARD_PATH = Skia.Path.MakeFromSVGString('M 0 -4 L 2.6 0 L 0 4 L -2.6 0 Z') ?? Skia.Path.Make();
const STAR_PATH =
  Skia.Path.MakeFromSVGString('M 0 -4.5 L 1 -1 L 4.5 0 L 1 1 L 0 4.5 L -1 1 L -4.5 0 L -1 -1 Z') ??
  Skia.Path.Make();

/**
 * One particle of any kind. `clock` is shared ms; `bright` scales the peak
 * opacity. Kind selects the drawing primitive:
 *  - sparks/motes: soft radial dot (motes larger + softer via seed size)
 *  - ash: small flat fleck (low opacity disc, no glow)
 *  - bubbles: hollow stroked circle that swells as it rises
 *  - shards: spinning diamond (Frostfire glints)
 *  - wisps: elongated soft ellipse (vapor trail)
 *  - stars: four-point star fleck
 */
function particleProgress(ms: number, seed: Seed): number {
  'worklet';
  return ((ms / seed.period + seed.phase) % 1 + 1) % 1;
}

function particleOpacity(p: number, bright: number): number {
  'worklet';
  const env = p < 0.15 ? p / 0.15 : p > 0.85 ? (1 - p) / 0.15 : 1;
  return env * bright;
}

function DotParticle({ seed, clock, width, baseY, color, bright, ash = false }: {
  seed: Seed;
  clock: SharedValue<number>;
  width: number;
  baseY: number;
  color: string;
  bright: number;
  ash?: boolean;
}) {
  const startX = seed.x * width;
  const point = useDerivedValue(() => {
    'worklet';
    const p = particleProgress(clock.value, seed);
    return vec(startX + p * seed.drift, baseY - p * seed.rise);
  });
  const opacity = useDerivedValue(() => {
    'worklet';
    return particleOpacity(particleProgress(clock.value, seed), bright);
  });
  if (ash) {
    return <Circle c={point} r={seed.size} color={withAlpha(color, 0.7)} opacity={opacity} />;
  }
  return (
    <Circle c={point} r={seed.size} opacity={opacity}>
      <RadialGradient
        c={point}
        r={seed.size}
        colors={[color, color, withAlpha(color, 0)]}
        positions={[0, 0.45, 1]}
      />
    </Circle>
  );
}

function ShapeParticle({ kind, seed, clock, width, baseY, color, bright }: {
  kind: 'bubbles' | 'shards' | 'stars';
  seed: Seed;
  clock: SharedValue<number>;
  width: number;
  baseY: number;
  color: string;
  bright: number;
}) {
  const startX = seed.x * width;
  const transform = useDerivedValue(() => {
    'worklet';
    const p = particleProgress(clock.value, seed);
    const rot = (clock.value / 1000) * seed.spin * (kind === 'shards' ? 2.2 : 0.9);
    const scale = (seed.size / 4) * (kind === 'bubbles' ? 0.7 + p * 0.6 : 1);
    return [
      { translateX: startX + p * seed.drift },
      { translateY: baseY - p * seed.rise },
      { rotate: rot },
      { scale },
    ];
  });
  const opacity = useDerivedValue(() => {
    'worklet';
    return particleOpacity(particleProgress(clock.value, seed), bright);
  });

  if (kind === 'bubbles') {
    return (
      <Group transform={transform} opacity={opacity}>
        <Circle c={vec(0, 0)} r={4} color={color} style="stroke" strokeWidth={1.2} />
      </Group>
    );
  }

  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={kind === 'shards' ? SHARD_PATH : STAR_PATH} color={color} />
    </Group>
  );
}

function WispParticle({ seed, clock, width, baseY, color, bright }: {
  seed: Seed;
  clock: SharedValue<number>;
  width: number;
  baseY: number;
  color: string;
  bright: number;
}) {
  const startX = seed.x * width;
  const transform = useDerivedValue(() => {
    'worklet';
    const p = particleProgress(clock.value, seed);
    return [{ translateX: startX + p * seed.drift }, { translateY: baseY - p * seed.rise }];
  });
  const opacity = useDerivedValue(() => {
    'worklet';
    return particleOpacity(particleProgress(clock.value, seed), bright);
  });
  const w = seed.size;
  const h = seed.size * 2.4;
  return (
    <Group transform={transform} opacity={opacity}>
      <Oval rect={rect(-w / 2, -h / 2, w, h)} color={color} />
    </Group>
  );
}

function ProfileParticle({ kind, seed, clock, width, baseY, color, bright }: {
  kind: ParticleKind;
  seed: Seed;
  clock: SharedValue<number>;
  width: number;
  baseY: number;
  color: string;
  bright: number;
}) {
  if (kind === 'shards' || kind === 'stars' || kind === 'bubbles') {
    return (
      <ShapeParticle
        kind={kind}
        seed={seed}
        clock={clock}
        width={width}
        baseY={baseY}
        color={color}
        bright={bright}
      />
    );
  }
  if (kind === 'wisps') {
    return (
      <WispParticle
        seed={seed}
        clock={clock}
        width={width}
        baseY={baseY}
        color={color}
        bright={bright}
      />
    );
  }
  if (kind === 'ash') {
    return (
      <DotParticle
        seed={seed}
        clock={clock}
        width={width}
        baseY={baseY}
        color={color}
        bright={bright}
        ash
      />
    );
  }
  return (
    <DotParticle
      seed={seed}
      clock={clock}
      width={width}
      baseY={baseY}
      color={color}
      bright={bright}
    />
  );
}

export function EmbersLayer({
  width,
  height,
  intensity,
  palette,
  activeStyle,
  clock,
  pulse,
}: EmbersProps) {
  const baseY = height - 150; // just above the logs (matches the flame base)
  const pulseWeight = pulse?.active ? pulse.visualWeight : 0;
  const pulseParticleBoost =
    pulse?.active ?
      pulse.visualKind === 'brightBurst' ? 1 + 0.45 * pulseWeight
      : 1 + 0.12 * pulseWeight
    : pulse?.consistencyTint ? 1.08
    : 1;
  const showProfileParticles = intensity > 0;

  // Ambient pool: constant count, deterministic, independent of the profile.
  const bgSeeds = useMemo(() => makeAmbientSeeds(14, height), [height]);

  // Profile pools: one bounded population per descriptor in the active flame's
  // BonfireDesign particle mix (multi-variant mixes like Phoenix sparks+ash
  // become multiple pools). Memoized on profile + dimensions: a flame switch
  // rebuilds pools once; re-renders, clock ticks, and strength/intensity changes
  // never regenerate seeds or remount particles.
  const profileParticles = useMemo(() => {
    if (!showProfileParticles) return [];
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(activeStyle));
    return descriptors.map((d, i) => ({
      descriptor: d,
      seeds: makeProfileSeeds(d, i, width, height * 0.55),
    }));
  }, [activeStyle, width, height, showProfileParticles]);

  return (
    <>
      {/* ambient motes — always faintly drifting up */}
      {bgSeeds.map((seed, i) => (
        <ProfileParticle
          key={`bg${i}`}
          kind="motes"
          seed={seed}
          clock={clock}
          width={width}
          baseY={baseY}
          color={palette.amber}
          bright={0.4}
        />
      ))}
      {/* profile particles — the BonfireDesign mix, scaled by fire intensity.
          intensity is 0 when the fire is out/unlit, so they vanish with it. */}
      {profileParticles.map(({ descriptor, seeds }, pi) =>
        seeds.map((seed, i) => (
          <ProfileParticle
            key={`p${pi}-${i}`}
            kind={descriptor.kind}
            seed={seed}
            clock={clock}
            width={width}
            baseY={baseY}
            color={descriptor.color}
            bright={Math.min(1, intensity * pulseParticleBoost)}
          />
        )),
      )}
    </>
  );
}

function Embers(props: EmbersProps) {
  return (
    <Canvas style={{ width: props.width, height: props.height }} pointerEvents="none">
      <EmbersLayer {...props} />
    </Canvas>
  );
}

export default React.memo(Embers);

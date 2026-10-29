/**
 * Flame.tsx — the hero: a GPU-rendered bonfire flame (React Native Skia).
 *
 * Since spec 004 this is a GENERIC, profile-driven renderer: it reads the
 * active flame's BonfireDesign `look` (shape variant, per-tongue
 * transforms, edge treatment, motion family/speed, aura kind, accents, palette
 * intent, footprint, core scale) and draws Skia equivalents of the
 * BonfireDesign CSS rig (`BonfireDesign/flame-renderer.jsx` / `flame-catalog.css`):
 *
 *   ground-glow  → blurred radial oval, low on the ground
 *   aura/halo    → blurred radial oval whose geometry follows the profile's
 *                  aura kind (oval/tall/wide/circular/ring + dim/crisp)
 *   accents      → shockPulse / solarCircle / orbitRing / voidRing / auroraBand,
 *                  selected purely by profile data (never by flame id)
 *   N tongues    → each profile tongue is the BonfireDesign 4-layer stack
 *                  (base/mid/inner/core teardrops). Canonical layers are
 *                  rasterized once per palette/shape into alpha-safe image
 *                  textures, then positioned by each tongue's dx/fy/rot/sx/sy
 *                  transform and screen-composited.
 *
 * Animation runs on the UI thread via a shared clock (so it holds the display
 * refresh rate, ≥120 FPS, even while JS is busy). Each tongue flickers with the
 * profile's motion family (smooth/harsh) and speed (a period multiplier, as in
 * BonfireDesign), offset by its `lag`; float/warp/ribbon/sway/pulse/hueDrift are
 * additional clock-derived modifiers. All geometry, gradients, and descriptors
 * are memoized on profile/palette/dimension changes — no per-frame JS work.
 *
 * The flame (including all profile accents) is hidden when the fire is `out` or
 * `unlit` (the design shows smoke / a dim hearth in those states — see
 * Hearth/Embers), preserving out-state precedence.
 */

import React, { useEffect, useMemo } from 'react';
import {
  Canvas,
  Image,
  Group,
  Path,
  Skia,
  LinearGradient,
  RadialGradient,
  Blur,
  Paint,
  ColorMatrix,
  Circle,
  Oval,
  Rect,
  PaintStyle,
  TileMode,
  rect,
  vec,
  type SkImage,
} from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import type { FireState } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';
import type { FlameStyle } from '../../domain/flames';
import type { FlamePulseState } from '../../domain/flamePulses';
import { darken, withAlpha, type Palette } from '../../theme/palettes';
import {
  flameVisual,
  resolveAccents,
  resolveAuraDescriptor,
  resolveMotionDescriptor,
  resolveShapeDescriptor,
  resolveHealthVisuals,
  resolveStrengthVisuals,
  resolveVisualProfile,
  type MotionDescriptor,
  type ShapeDescriptor,
  type TongueDescriptor,
} from './flameModel';

export interface FlameProps {
  fire: FireState;
  // The active catalog flame; its BonfireDesign look drives the shape,
  // motion, aura, and accents. Missing/invalid profiles fall back to Amber-like.
  activeStyle?: FlameStyle;
  palette: Palette;
  width: number;
  height: number;
  // Shared scene clock from BonfireScreen. Keeps Flame and Embers on one UI
  // frame source instead of two JS requestAnimationFrame loops.
  clock: SharedValue<number>;
  // Energy knob for a LOCKED ("embered") flame: scales glow + brightness down so
  // the same flame reads as spent. Default 1 = full energy (no visual change).
  dim?: number;
  // Distance from scene bottom to the flame's visible lower edge. BonfireScreen
  // derives this from the hearth top so the visual flame/log gap stays fixed
  // across screen sizes and fire strengths.
  visibleBottomFromBottom?: number;
  // Visual-only Fire Health state. Suppressed or missing health resolves to
  // neutral multipliers, so out/unlit fires never show a healthy flame.
  health?: FireHealthState;
  pulse?: FlamePulseState;
}

// Distance (px) from the bottom of the canvas to the flame's base. The flame
// path has a small rounded foot below this point, so keep the base above the log
// tops to avoid the body rendering underneath the hearth.
export const DESIGN_FLAME_BASE_FROM_BOTTOM = 216;

// The BonfireDesign 4-layer tongue rig: [name, width×fh, height×fh, blur].
// Soft tongues (Wisp fragments) draw only mid+inner — no deep base, no hot core.
const LAYER_RIG = [
  { name: 'base', w: 0.66, h: 1.0, blur: 13 },
  { name: 'mid', w: 0.46, h: 0.86, blur: 8 },
  { name: 'inner', w: 0.3, h: 0.66, blur: 5 },
  { name: 'core', w: 0.17, h: 0.46, blur: 3 },
] as const;
type LayerName = (typeof LAYER_RIG)[number]['name'];

interface LayerTexture {
  image: SkImage | null;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Build one flame layer outline as a Skia path. The `edge` treatment maps the
 * BonfireDesign `edge-*` clip-paths to path families:
 *  - round:   smooth teardrop (cubic curves, soft shoulders)
 *  - sharp:   teardrop with pinched control points → pointed tip
 *  - jagged:  zigzag polygon (Strontium's broken edges)
 *  - crystal: angular faceted polygon (Frostfire)
 */
function tonguePath(cx: number, baseY: number, w: number, h: number, edge: string) {
  const hw = w / 2;
  const top = baseY - h;
  let d: string;
  if (edge === 'jagged') {
    d =
      `M ${cx} ${top} ` +
      `L ${cx + hw * 0.55} ${top + h * 0.28} L ${cx + hw * 0.3} ${top + h * 0.42} ` +
      `L ${cx + hw * 0.95} ${top + h * 0.68} L ${cx + hw * 0.45} ${baseY} ` +
      `L ${cx - hw * 0.45} ${baseY} L ${cx - hw * 0.95} ${top + h * 0.68} ` +
      `L ${cx - hw * 0.3} ${top + h * 0.42} L ${cx - hw * 0.55} ${top + h * 0.28} Z`;
  } else if (edge === 'crystal') {
    d =
      `M ${cx} ${top} ` +
      `L ${cx + hw * 0.5} ${top + h * 0.32} L ${cx + hw * 0.32} ${top + h * 0.5} ` +
      `L ${cx + hw} ${top + h * 0.78} L ${cx + hw * 0.42} ${baseY} ` +
      `L ${cx - hw * 0.42} ${baseY} L ${cx - hw} ${top + h * 0.78} ` +
      `L ${cx - hw * 0.32} ${top + h * 0.5} L ${cx - hw * 0.5} ${top + h * 0.32} Z`;
  } else if (edge === 'sharp') {
    // Pinched upper controls taper the tip to a point (Crimson/Sodium/Voidfire).
    d =
      `M ${cx} ${top} ` +
      `C ${cx + hw * 0.55} ${top + h * 0.5} ${cx + hw} ${top + h * 0.84} ${cx + hw * 0.5} ${baseY} ` +
      `Q ${cx} ${baseY + h * 0.06} ${cx - hw * 0.5} ${baseY} ` +
      `C ${cx - hw} ${top + h * 0.84} ${cx - hw * 0.55} ${top + h * 0.5} ${cx} ${top} Z`;
  } else {
    d =
      `M ${cx} ${top} ` +
      `C ${cx + hw * 0.9} ${top + h * 0.45} ${cx + hw} ${top + h * 0.82} ${cx + hw * 0.5} ${baseY} ` +
      `Q ${cx} ${baseY + h * 0.06} ${cx - hw * 0.5} ${baseY} ` +
      `C ${cx - hw} ${top + h * 0.82} ${cx - hw * 0.9} ${top + h * 0.45} ${cx} ${top} Z`;
  }
  return Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();
}

function layerGradient(
  layer: (typeof LAYER_RIG)[number],
  stops: Record<'base' | 'mid', string[]>,
  palette: Palette,
  invertCore: boolean,
  coreScale: number,
  fh: number,
) {
  const sc = layer.name === 'core' ? coreScale : 1;
  const lh = fh * layer.h * sc;
  const colors =
    layer.name === 'base' ? stops.base
    : layer.name === 'mid' ? stops.mid
    : layer.name === 'inner' ? [palette.ember, palette.amber, palette.gold]
    : invertCore
      // Voidfire: the core flips to a near-black void wrapped in light.
      ? [darken(palette.red, 0.35), darken(palette.red, 0.12)]
      : [palette.amber, palette.gold, palette.core];
  const positions =
    layer.name === 'base' ? [0, 0.22, 0.7, 1]
    : layer.name === 'mid' ? [0, 0.35, 0.8, 1]
    : colors.length === 2 ? [0, 1]
    : [0, 0.45, 0.88];
  return { colors, positions, lh };
}

function makeLayerTexture(
  layer: (typeof LAYER_RIG)[number],
  path: ReturnType<typeof tonguePath>,
  stops: Record<'base' | 'mid', string[]>,
  palette: Palette,
  invertCore: boolean,
  coreScale: number,
  fh: number,
  cx: number,
  baseY: number,
): LayerTexture | null {
  if (
    typeof Skia.Surface?.Make !== 'function' ||
    typeof Skia.Paint !== 'function' ||
    typeof Skia.Shader?.MakeLinearGradient !== 'function' ||
    typeof Skia.ImageFilter?.MakeBlur !== 'function'
  ) {
    return null;
  }

  const bounds = path.computeTightBounds();
  const pad = Math.ceil(layer.blur * 4 + 2);
  const x = Math.floor(bounds.x - pad);
  const y = Math.floor(bounds.y - pad);
  const width = Math.max(1, Math.ceil(bounds.width + pad * 2));
  const height = Math.max(1, Math.ceil(bounds.height + pad * 2));
  // Use CPU surface here: RN Skia documents it as 8888 + unpremul alpha.
  // Android GPU offscreen surfaces can snapshot opaque black padding.
  const surface = Skia.Surface.Make(width, height);
  if (!surface) return null;

  try {
    const canvas = surface.getCanvas();
    // GPU offscreen surfaces may start with opaque/undefined pixels on Android.
    // Clear first so the cached layer keeps the same transparent bounds as Path.
    canvas.clear(Skia.Color('rgba(0, 0, 0, 0)'));

    const localPath = path.copy().offset(-x, -y);
    const { colors, positions, lh } = layerGradient(layer, stops, palette, invertCore, coreScale, fh);
    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(PaintStyle.Fill);
    paint.setShader(
      Skia.Shader.MakeLinearGradient(
        Skia.Point(cx - x, baseY - y),
        Skia.Point(cx - x, baseY - y - lh),
        colors.map(color => Skia.Color(color)),
        positions,
        TileMode.Clamp,
      ),
    );

    const blurPaint = Skia.Paint();
    blurPaint.setImageFilter(Skia.ImageFilter.MakeBlur(layer.blur, layer.blur, TileMode.Decal, null));
    canvas.saveLayer(blurPaint, rect(0, 0, width, height));
    canvas.drawPath(localPath, paint);
    canvas.restore();
    surface.flush();
    const image = surface.makeImageSnapshot();
    return { image, x, y, width, height };
  } finally {
    surface.dispose();
  }
}

// A 4×5 color matrix that multiplies R/G/B by `b` (brightness), keeps alpha.
function brightnessMatrix(b: number): number[] {
  'worklet';
  return [b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, b, 0, 0, 0, 0, 0, 1, 0];
}

const IDENTITY_COLOR_MATRIX = brightnessMatrix(1);

// A 4×5 hue-rotation color matrix (the standard SVG feColorMatrix formula).
// Used for static per-tongue hue offsets (Aurora/Nebula layers) and the
// clock-driven whole-flame hue drift. Marked as a worklet so the drift can be
// computed on the UI thread.
function hueRotateMatrix(deg: number): number[] {
  'worklet';
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928, 0, 0,
    0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283, 0, 0,
    0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072, 0, 0,
    0, 0, 0, 1, 0,
  ];
}

/**
 * Per-tongue flicker transform, computed on the UI thread from the shared
 * clock. Generic over the profile's motion descriptor:
 *  - `family` smooth = the original gentle sine wobble; harsh = extra
 *    higher-frequency jitter (Strontium/Frostfire/Conflagration violence)
 *  - `speed` multiplies the PERIOD (BonfireDesign semantics: smaller = faster)
 *  - `lag` phase-shifts this tongue behind the others
 *  - `warp` adds the Toxic outline wobble; `ribbon` the Aurora wave;
 *    `float` the Wisp fragment bob
 */
function tongueFlicker(
  ms: number,
  motion: MotionDescriptor,
  lag: number,
  float: boolean,
  motionScale: number,
  cx: number,
  baseY: number,
) {
  'worklet';
  const t = ms / 1000 / motion.speed - lag;
  const stretch = (motion.family === 'harsh' ? 0.12 : 0.07) * motionScale;
  let sx = 1 + Math.sin(t * 5.5) * stretch * 0.4;
  let sy = 1 - Math.sin(t * 4.2) * stretch;
  let tx = Math.sin(t * 3.8) * 3 * motionScale;
  let ty = 0;
  if (motion.family === 'harsh') {
    // Jittery overtones: the "broken" flicker of the harsh keyframe family.
    sy -= Math.sin(t * 13.1) * stretch * 0.5;
    sx += Math.sin(t * 17.3) * stretch * 0.3;
    tx += Math.sin(t * 11.7) * 1.5;
  }
  if (motion.warp) {
    // Slow asymmetric squash — the Toxic border-radius warp equivalent.
    sx += Math.sin(t * 1.6) * 0.07;
    sy += Math.cos(t * 1.1) * 0.05;
  }
  if (motion.ribbon) {
    // Curtain wave: tongues drift sideways on slow offset phases.
    tx += Math.sin(ms / 1400 / motion.speed - lag * 2) * 7;
  }
  if (float) {
    // Low-gravity fragment bob (Wisp): slow vertical float, independent phase.
    ty = Math.sin(ms / 1300 - lag * 3) * 6;
  }
  return [
    { translateX: cx },
    { translateY: baseY },
    { translateX: tx },
    { translateY: ty },
    { scaleX: sx },
    { scaleY: sy },
    { translateX: -cx },
    { translateY: -baseY },
  ];
}

// ---------------------------------------------------------------------------
// One profile tongue: the static dx/fy/rot/sx/sy placement plus the animated
// flicker, drawing its layer stack (full or soft). A separate component so each
// tongue owns its hooks — profiles with different tongue counts mount/unmount
// tongue components rather than changing hook counts.
// ---------------------------------------------------------------------------
interface TongueProps {
  tongue: TongueDescriptor;
  motion: MotionDescriptor;
  motionScale: number;
  paths: Record<LayerName, ReturnType<typeof tonguePath>>;
  textures: Record<LayerName, LayerTexture | null>;
  stops: Record<'base' | 'mid', string[]>;
  palette: Palette;
  invertCore: boolean;
  coreScale: number;
  fh: number;
  cx: number;
  baseY: number;
  clock: SharedValue<number>;
}

function Tongue({
  tongue, motion, motionScale, paths, textures, stops, palette, invertCore, coreScale,
  fh, cx, baseY, clock,
}: TongueProps) {
  const flickT = useDerivedValue(() =>
    tongueFlicker(clock.value, motion, tongue.lag, tongue.float, motionScale, cx, baseY),
  );

  // Core brightness pulse (Solfire `pulse: 'core'`): only the core layer beats.
  const corePulse = useDerivedValue(() => {
    'worklet';
    if (motion.pulse !== 'core') return 1;
    return 0.72 + 0.28 * Math.sin(clock.value / (1600 * motion.speed) * Math.PI * 2);
  });

  // Static placement: offset (dx/fy fractions of flame height), rotate, scale —
  // all around the tongue's base point, exactly like the BonfireDesign wrapper.
  const placement = useMemo(
    () => [
      { translateX: cx },
      { translateY: baseY },
      { translateX: tongue.dx * fh },
      { translateY: -tongue.fy * fh },
      { rotate: (tongue.rot * Math.PI) / 180 },
      { scaleX: tongue.sx },
      { scaleY: tongue.sy },
      { translateX: -cx },
      { translateY: -baseY },
    ],
    [tongue, cx, baseY, fh],
  );

  // Soft tongues (Wisp fragments) draw only the gentle mid+inner layers.
  const layers = tongue.soft ? LAYER_RIG.slice(1, 3) : LAYER_RIG;
  // Ghost copies (Spectral/Nebula) render the whole stack at reduced opacity.
  const opacity = tongue.ghost ?? 1;

  const body = (
    <Group opacity={opacity} transform={placement}>
      <Group transform={flickT}>
        {layers.map(layer => {
          const { colors, positions, lh } = layerGradient(layer, stops, palette, invertCore, coreScale, fh);
          const texture = textures[layer.name];
          if (texture?.image) {
            return (
              <Image
                key={layer.name}
                image={texture.image}
                x={texture.x}
                y={texture.y}
                width={texture.width}
                height={texture.height}
                fit="fill"
                blendMode={layer.name === 'core' && invertCore ? 'srcOver' : undefined}
                opacity={layer.name === 'core' ? corePulse : undefined}
              />
            );
          }
          const path = (
            <Path
              path={paths[layer.name]}
              // The dark void core must NOT screen-blend (screen would erase
              // dark colors); everything else stays additive.
              blendMode={layer.name === 'core' && invertCore ? 'srcOver' : undefined}
              opacity={layer.name === 'core' ? corePulse : undefined}>
              <LinearGradient
                start={vec(cx, baseY)}
                end={vec(cx, baseY - lh)}
                colors={colors}
                positions={positions}
              />
            </Path>
          );
          return layer.blur > 0 ? (
            <Group key={layer.name} layer={<Paint><Blur blur={layer.blur} /></Paint>}>
              {path}
            </Group>
          ) : (
            <Group key={layer.name}>
              {path}
            </Group>
          );
        })}
      </Group>
    </Group>
  );

  // Static per-tongue hue offset (Aurora ±35°, Nebula ±130/−95°): wrap the
  // tongue in a hue-rotate color filter only when the profile asks for one.
  if (tongue.hue !== 0) {
    return (
      <Group layer={<Paint><ColorMatrix matrix={hueRotateMatrix(tongue.hue)} /></Paint>}>
        {body}
      </Group>
    );
  }
  return body;
}

// ---------------------------------------------------------------------------
// Accents — each is a tiny self-contained Skia element selected by profile
// data. All live INSIDE the flame's fading group, so out-state hides them.
// ---------------------------------------------------------------------------

/** Expanding shock rings (Conflagration). One ring loops outward from the base. */
function ShockPulse({ clock, cx, baseY, fh, color }: {
  clock: SharedValue<number>; cx: number; baseY: number; fh: number; color: string;
}) {
  const r = useDerivedValue(() => {
    'worklet';
    const p = (clock.value % 2400) / 2400;
    return fh * (0.35 + p * 0.85);
  });
  const opacity = useDerivedValue(() => {
    'worklet';
    const p = (clock.value % 2400) / 2400;
    return (1 - p) * 0.35;
  });
  return (
    <Circle c={vec(cx, baseY - fh * 0.3)} r={r} opacity={opacity} color={color}
      style="stroke" strokeWidth={2} />
  );
}

/** Crisp circular outline around the oversized core (Solfire). */
function SolarCircle({ cx, baseY, fh, color }: {
  cx: number; baseY: number; fh: number; color: string;
}) {
  return (
    <Circle c={vec(cx, baseY - fh * 0.34)} r={fh * 0.52} color={color}
      style="stroke" strokeWidth={1.5} opacity={0.55} />
  );
}

/** One orbiting ring with two satellites (orbitRing / each voidRing). */
function OrbitRing({ clock, cx, baseY, fh, color, periodMs, big, reverse }: {
  clock: SharedValue<number>; cx: number; baseY: number; fh: number;
  color: string; periodMs: number; big?: boolean; reverse?: boolean;
}) {
  const scale = big ? 1.35 : 1;
  const rx = fh * 0.72 * scale;
  const ry = fh * 0.26 * scale;
  const cyRing = baseY - fh * 0.42;
  const dir = reverse ? -1 : 1;
  const dotA = useDerivedValue(() => {
    'worklet';
    const a = (clock.value / periodMs) * Math.PI * 2 * dir;
    return vec(cx + Math.cos(a) * rx, cyRing + Math.sin(a) * ry);
  });
  const dotB = useDerivedValue(() => {
    'worklet';
    const a = (clock.value / periodMs) * Math.PI * 2 * dir + Math.PI;
    return vec(cx + Math.cos(a) * rx, cyRing + Math.sin(a) * ry);
  });
  return (
    <Group>
      <Oval rect={rect(cx - rx, cyRing - ry, rx * 2, ry * 2)} color={color}
        style="stroke" strokeWidth={1} opacity={0.4} />
      <Circle c={dotA} r={3} color={color} opacity={0.9} />
      <Circle c={dotB} r={2.2} color={color} opacity={0.6} />
    </Group>
  );
}

/** Soft drifting light band behind the flame (Aurora/Nebula). */
function AuroraBand({ clock, cx, baseY, fh, colors }: {
  clock: SharedValue<number>; cx: number; baseY: number; fh: number; colors: string[];
}) {
  const bw = fh * 2.0;
  const bh = fh * 0.5;
  const y = baseY - fh * 1.05;
  const drift = useDerivedValue(() => {
    'worklet';
    return [{ translateX: Math.sin(clock.value / 7000) * fh * 0.18 }];
  });
  return (
    <Group transform={drift} layer={<Paint><Blur blur={16} /></Paint>}>
      <Rect rect={rect(cx - bw / 2, y - bh / 2, bw, bh)}>
        <LinearGradient
          start={vec(cx - bw / 2, y)}
          end={vec(cx + bw / 2, y)}
          colors={colors}
          positions={[0, 0.5, 1]}
        />
      </Rect>
    </Group>
  );
}

export function FlameLayer({
  fire,
  activeStyle,
  palette,
  width,
  height,
  clock,
  dim = 1,
  visibleBottomFromBottom,
  health,
  pulse,
}: FlameProps) {
  const visual = useMemo(() => flameVisual(fire), [fire]);

  // ---- Resolve the BonfireDesign profile into plain render descriptors ----
  // All pure + memoized: a flame switch recomputes them once, never per frame.
  const profile = useMemo(() => resolveVisualProfile(activeStyle), [activeStyle]);
  const shape: ShapeDescriptor = useMemo(() => resolveShapeDescriptor(profile), [profile]);
  const motion = useMemo(() => resolveMotionDescriptor(profile), [profile]);
  const aura = useMemo(() => resolveAuraDescriptor(profile), [profile]);
  const accents = useMemo(() => resolveAccents(profile), [profile]);
  const strength = useMemo(
    () => resolveStrengthVisuals(profile, visual.intensity),
    [profile, visual.intensity],
  );
  const healthVisual = useMemo(() => resolveHealthVisuals(health), [health]);

  // Pulse visual weight is animated on the UI thread: the hook flips the
  // weight to 0 when the active segment ends, and this shared value eases that
  // change over the pulse's fade duration without adding JS frame work.
  const pulseWeight = useSharedValue(0);
  const pulseTintWeight = useSharedValue(0);
  const pulseVisualWeight = pulse?.active ? pulse.visualWeight : 0;
  const pulseFadeMs = pulse?.fadeMs ?? 160;
  useEffect(() => {
    pulseWeight.value = withTiming(pulseVisualWeight, {
      duration: pulseVisualWeight > 0 ? 90 : pulseFadeMs,
    });
    pulseTintWeight.value = withTiming(pulse?.consistencyTint ? 1 : 0, {
      duration: pulse?.consistencyTint ? 90 : pulseFadeMs,
    });
  }, [pulseVisualWeight, pulseFadeMs, pulse?.consistencyTint, pulseWeight, pulseTintWeight]);

  // Embered flames burn lower: scale the halo/ground glow and overall brightness
  // by `dim` (1 = unchanged). Color still comes entirely from the `palette` prop.
  const pulseGlowPeak =
    pulse?.visualKind === 'brightBurst' ? 1.45
    : pulse?.visualKind === 'warmGlow' ? 1.22
    : 1;
  const pulseBrightPeak =
    pulse?.visualKind === 'brightBurst' ? 1.24
    : pulse?.visualKind === 'warmGlow' ? 1.08
    : 1;
  const baseGlow =
    visual.glow *
    dim *
    aura.opacityScale *
    Math.min(strength.aura, 1.3) *
    healthVisual.glow;
  const baseBright = visual.bright * dim * healthVisual.warmth;
  const glow = useDerivedValue(() => {
    'worklet';
    return (
      baseGlow *
      (1 + (pulseGlowPeak - 1) * pulseWeight.value + 0.08 * pulseTintWeight.value)
    );
  }, [baseGlow, pulseGlowPeak, pulseWeight, pulseTintWeight]);
  const lit = fire.state === 'lit';

  const fh = visual.height * healthVisual.density * (1 + 0.04 * pulseVisualWeight);
  const flameFootExtension =
    shape.edge === 'jagged' || shape.edge === 'crystal' ? 0 : fh * 0.06 * shape.footprint;
  const resolvedVisibleBottomFromBottom =
    visibleBottomFromBottom ?? DESIGN_FLAME_BASE_FROM_BOTTOM - flameFootExtension;
  const cx = width / 2;
  const baseY = height - resolvedVisibleBottomFromBottom - flameFootExtension;

  // ---- Layer geometry: one path per rig layer, with the profile's edge ----
  // Tongues reuse these canonical paths and shape them via their transforms,
  // exactly like the BonfireDesign rig (one layer stack, N tongue wrappers).
  const paths = useMemo(() => {
    const make = (w: number, h: number) => tonguePath(cx, baseY, fh * w, fh * h, shape.edge);
    return {
      base: make(LAYER_RIG[0].w, LAYER_RIG[0].h),
      mid: make(LAYER_RIG[1].w, LAYER_RIG[1].h),
      inner: make(LAYER_RIG[2].w, LAYER_RIG[2].h),
      core: make(LAYER_RIG[3].w * shape.coreScale, LAYER_RIG[3].h * shape.coreScale),
    };
  }, [cx, baseY, fh, shape.edge, shape.coreScale]);

  // ---- Grow pop + ignite feedback (Reanimated shared values) ----
  // `grow` scales the whole flame: 1 at rest, a quick overshoot when strength
  // rises. `opacity` fades the flame in on ignite / out when extinguished.
  const grow = useSharedValue(1);
  const opacity = useSharedValue(lit ? 1 : 0);
  const prevStrength = useSharedValue(fire.strength);
  const prevLit = useSharedValue(lit);

  useEffect(() => {
    if (lit && !prevLit.value) {
      // ignite
      opacity.value = withTiming(1, { duration: 700 });
      grow.value = withSequence(
        withTiming(1.18, { duration: 260 }),
        withSpring(1, { damping: 8, stiffness: 120 }),
      );
    } else if (lit && fire.strength > prevStrength.value) {
      // grew
      grow.value = withSequence(
        withTiming(1.14, { duration: 210 }),
        withSpring(1, { damping: 9, stiffness: 140 }),
      );
    } else if (!lit) {
      opacity.value = withTiming(0, { duration: 700 });
    } else {
      opacity.value = withTiming(1, { duration: 300 });
    }
    prevStrength.value = fire.strength;
    prevLit.value = lit;
  }, [lit, fire.strength, grow, opacity, prevStrength, prevLit]);

  // Whole-flame transform: grow pop + profile footprint + profile group sway
  // (Magenta). Footprint is the BonfireDesign 1.2/1.3× oversize trait; sway is
  // a slow clock-driven sideways rock. The calendar never moves the flame.
  const flameTransform = useDerivedValue(() => {
    'worklet';
    const swayX =
      motion.sway > 0 ? Math.sin(clock.value / (2400 * motion.speed) * Math.PI * 2) * motion.sway : 0;
    return [
      { translateX: cx },
      { translateY: baseY },
      { translateX: swayX },
      { scale: grow.value * shape.footprint },
      { translateX: -cx },
      { translateY: -baseY },
    ];
  });

  // Whole-flame opacity: ignite/out fade × translucent-body intent (Ghostlight).
  const flameOpacity = useDerivedValue(
    () => opacity.value * shape.bodyOpacity,
    [opacity, shape.bodyOpacity],
  );

  // Coal pulse (Ember): the whole tongue stack breathes in brightness.
  const tonguesOpacity = useDerivedValue(() => {
    'worklet';
    if (motion.pulse !== 'coal') return 1;
    return 0.8 + 0.2 * Math.sin(clock.value / 2600 * Math.PI * 2);
  });

  // Slow whole-flame hue drift (Aurora 14s, Nebula 22s): a clock-derived
  // hue-rotation color matrix. Identity when the profile doesn't drift.
  const hueDriftMatrix = useDerivedValue(() => {
    'worklet';
    if (motion.hueDriftMs <= 0) return IDENTITY_COLOR_MATRIX;
    const p = Math.sin((clock.value / motion.hueDriftMs) * Math.PI * 2);
    return hueRotateMatrix(p * 20);
  });

  // Brightness layer applied to the whole composited flame (dim-aware). Pulse
  // fades use a derived matrix so the color boost decays smoothly on UI thread.
  const brightPaint = useDerivedValue(() => {
    'worklet';
    return brightnessMatrix(baseBright * (1 + (pulseBrightPeak - 1) * pulseWeight.value));
  }, [baseBright, pulseBrightPeak, pulseWeight]);

  // ---- Palette-derived glow + tongue stops (003 US2) ----
  // Every surrounding-light color comes from the active flame's own palette
  // (no hardcoded warm-orange literals), so a blue flame casts blue light and
  // an embered palette dims everything automatically. Memoized on `palette`:
  // recomputed only on flame switch, never per frame (SC-005, ≥120 FPS).
  const stops = useMemo(
    () => ({
      // warm pool of light on the ground (was fixed orange rgba stops)
      ground: [withAlpha(palette.amber, 0.55), withAlpha(palette.ember, 0.22), withAlpha(palette.ember, 0)],
      // big soft glow behind the flame — solid disc, or hollow ring (Voidfire)
      halo: aura.ring
        ? [withAlpha(palette.ember, 0), withAlpha(palette.amber, 0.38), withAlpha(palette.ember, 0)]
        : [withAlpha(palette.amber, 0.4), withAlpha(palette.ember, 0.16), withAlpha(palette.ember, 0)],
      haloPositions: aura.ring ? [0.45, 0.72, 1] : [0, 0.4, 0.7],
      // base tongue: deep (darkened) red → red → ember → translucent amber tip
      base: [darken(palette.red, 0.55), palette.red, palette.ember, withAlpha(palette.amber, 0.2)],
      // mid tongue: darkened red → ember → amber → translucent gold tip
      mid: [darken(palette.red, 0.8), palette.ember, palette.amber, withAlpha(palette.gold, 0.25)],
      // accent colors (rings, pulses, bands) — all palette-derived
      accent: withAlpha(palette.gold, 0.8),
      accentSoft: withAlpha(palette.gold, 0.5),
      band: [withAlpha(palette.gold, 0), withAlpha(palette.gold, 0.22), withAlpha(palette.gold, 0)],
    }),
    [palette, aura.ring],
  );

  const textures = useMemo((): Record<LayerName, LayerTexture | null> => {
    const make = (layer: (typeof LAYER_RIG)[number]) => {
      try {
        return makeLayerTexture(layer, paths[layer.name], stops, palette, shape.invertCore, shape.coreScale, fh, cx, baseY);
      } catch {
        return null;
      }
    };
    return {
      base: make(LAYER_RIG[0]),
      mid: make(LAYER_RIG[1]),
      inner: make(LAYER_RIG[2]),
      core: make(LAYER_RIG[3]),
    };
  }, [paths, stops, palette, shape.invertCore, shape.coreScale, fh, cx, baseY]);

  useEffect(() => {
    return () => {
      const disposed = new Set<SkImage>();
      Object.values(textures).forEach(texture => {
        if (texture?.image && !disposed.has(texture.image)) {
          texture.image.dispose();
          disposed.add(texture.image);
        }
      });
    };
  }, [textures]);

  // Aura sizing: the baseline oval halo scaled by the profile's aura geometry.
  const haloW = (160 + fh * 2.2) * aura.widthScale;
  const haloH = (200 + fh * 2.6) * aura.heightScale;
  const groundW = 180 + fh * 1.7;
  const groundH = 80 + fh * 0.5;

  return (
    <Group opacity={flameOpacity} transform={flameTransform}>
      {/* ---- ground glow (warm pool of light on the ground) ---- */}
      <Group
        opacity={glow}
        transform={[
          { translateX: cx },
          { translateY: baseY - 0 },
          { scaleX: groundW / 200 },
          { scaleY: groundH / 200 },
        ]}
        layer={
          <Paint>
            <Blur blur={8} />
          </Paint>
        }>
        <Circle c={vec(0, 0)} r={100}>
          <RadialGradient
            c={vec(0, 0)}
            r={100}
            colors={stops.ground}
            positions={[0, 0.38, 0.72]}
          />
        </Circle>
      </Group>

      {/* ---- aura (profile-shaped glow behind the flame) ---- */}
      <Group
        opacity={glow}
        transform={[
          { translateX: cx },
          { translateY: baseY - haloH * 0.3 },
          { scaleX: haloW / 200 },
          { scaleY: haloH / 200 },
        ]}
        layer={
          <Paint>
            <Blur blur={aura.blur} />
          </Paint>
        }>
        <Circle c={vec(0, 0)} r={100}>
          <RadialGradient
            c={vec(0, 0)}
            r={100}
            colors={stops.halo}
            positions={stops.haloPositions}
          />
        </Circle>
      </Group>

      {/* ---- behind-the-flame accents (profile data only, never flame id) ---- */}
      {accents.includes('auroraBand') && (
        <AuroraBand clock={clock} cx={cx} baseY={baseY} fh={fh} colors={stops.band} />
      )}
      {accents.includes('shockPulse') && (
        <ShockPulse clock={clock} cx={cx} baseY={baseY} fh={fh} color={stops.accentSoft} />
      )}
      {accents.includes('solarCircle') && (
        <SolarCircle cx={cx} baseY={baseY} fh={fh} color={stops.accentSoft} />
      )}

      {/* ---- the flame: profile tongues, additive (screen) + brightness +
              optional hue drift. Each tongue is a BonfireDesign 4-layer stack;
              `afterimage` ghosts are the profile's own ghost tongues. ---- */}
      <Group
        layer={
          <Paint>
            <ColorMatrix matrix={brightPaint} />
          </Paint>
        }>
        <Group
          opacity={tonguesOpacity}
          layer={
            motion.hueDriftMs > 0 ? (
              <Paint>
                <ColorMatrix matrix={hueDriftMatrix} />
              </Paint>
            ) : undefined
          }>
          <Group blendMode="screen">
            {shape.tongues.map((tongue, i) => (
              <Tongue
                key={i}
                tongue={tongue}
                motion={motion}
                motionScale={Math.min(strength.motion, 1.3) * healthVisual.energy}
                paths={paths}
                textures={textures}
                stops={stops}
                palette={palette}
                invertCore={shape.invertCore}
                coreScale={shape.coreScale}
                fh={fh}
                cx={cx}
                baseY={baseY}
                clock={clock}
              />
            ))}
          </Group>
        </Group>
      </Group>

      {/* ---- orbiting accents drawn over the flame ---- */}
      {accents.includes('orbitRing') && (
        <OrbitRing clock={clock} cx={cx} baseY={baseY} fh={fh}
          color={stops.accent} periodMs={7500} />
      )}
      {accents.includes('voidRing') && (
        <>
          <OrbitRing clock={clock} cx={cx} baseY={baseY} fh={fh}
            color={stops.accent} periodMs={9000} />
          <OrbitRing clock={clock} cx={cx} baseY={baseY} fh={fh}
            color={stops.accentSoft} periodMs={14000} big reverse />
        </>
      )}
    </Group>
  );
}

function Flame(props: FlameProps) {
  return (
    <Canvas style={{ width: props.width, height: props.height }} pointerEvents="none">
      <FlameLayer {...props} />
    </Canvas>
  );
}

// Re-render only when the inputs actually change (the flame is expensive).
export default React.memo(Flame);

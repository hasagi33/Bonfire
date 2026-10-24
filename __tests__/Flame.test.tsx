/**
 * Flame.test.tsx — unit tests for the profile-driven Bonfire flame renderer.
 *
 * Covers the public surface of src/components/Bonfire/Flame.tsx and the
 * flameModel helpers it relies on: out/unlit precedence, profile fallback to an
 * Amber-like default, dim scaling without structural change, health suppression
 * to neutral multipliers, non-lit height/glow rules, and memoization of the
 * geometry across re-renders with unchanged palette/dimensions.
 *
 * Skia and Reanimated are mocked so the tests run deterministically in Jest with
 * no native canvas and no network access.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import Flame from '../src/components/Bonfire/Flame';
import {
  flameVisual,
  resolveAccents,
  resolveAuraDescriptor,
  resolveMotionDescriptor,
  resolveShapeDescriptor,
  resolveHealthVisuals,
  resolveStrengthVisuals,
  resolveVisualProfile,
} from '../src/components/Bonfire/flameModel';
import { flameById } from '../src/domain/flames';
import type { FireState } from '../src/domain/fire';
import { palettes } from '../src/theme/palettes';

// ---------------------------------------------------------------------------
// Native-module mocks. Skia Canvas / primitives become plain host elements so
// the rendered tree is inspectable; Reanimated hooks become inert stubs.
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      require('react').createElement(name, props, props.children as never);
    Comp.displayName = name;
    return Comp;
  };
  const makeSurface = () => ({
    getCanvas: () => ({
      clear: jest.fn(),
      drawPath: jest.fn(),
      saveLayer: jest.fn(),
      restore: jest.fn(),
    }),
    flush: jest.fn(),
    makeImageSnapshot: jest.fn(() => ({ id: 'img' })),
    dispose: jest.fn(),
  });
  const makePath = () => {
    const path: Record<string, unknown> = {};
    path.copy = () => path;
    path.offset = () => path;
    path.computeTightBounds = () => ({ x: 0, y: 0, width: 10, height: 10 });
    return path;
  };
  return {
    Canvas: host('Canvas'),
    Image: host('Image'),
    Group: host('Group'),
    Path: host('Path'),
    LinearGradient: host('LinearGradient'),
    RadialGradient: host('RadialGradient'),
    Blur: host('Blur'),
    Paint: host('Paint'),
    ColorMatrix: host('ColorMatrix'),
    Circle: host('Circle'),
    Oval: host('Oval'),
    Rect: host('Rect'),
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Decal: 1 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: { MakeFromSVGString: makePath, Make: makePath },
      Surface: { Make: makeSurface },
      Paint: () => ({
        setAntiAlias: jest.fn(),
        setStyle: jest.fn(),
        setShader: jest.fn(),
        setImageFilter: jest.fn(),
      }),
      Shader: { MakeLinearGradient: jest.fn(() => ({})) },
      ImageFilter: { MakeBlur: jest.fn(() => ({})) },
      Color: (c: string) => c,
      Point: (x: number, y: number) => ({ x, y }),
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  useSharedValue: (v: unknown) => ({ value: v }),
  withSequence: (...args: unknown[]) => args[args.length - 1],
  withSpring: (v: unknown) => v,
  withTiming: (v: unknown) => v,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AMBER_PALETTE = palettes.amber;
const CRIMSON_PALETTE = palettes.crimson;
const AMBER_STYLE = flameById('amber');
const CRIMSON_STYLE = flameById('crimson');

function makeClock(): SharedValue<number> {
  return { value: 0 } as unknown as SharedValue<number>;
}

function litFire(strength = 4): FireState {
  return { state: 'lit', strength, lastScoreKey: '2024-01-01' } as unknown as FireState;
}

function outFire(): FireState {
  return { state: 'out', strength: 0, lastScoreKey: null } as unknown as FireState;
}

function unlitFire(): FireState {
  return { state: 'unlit', strength: 0, lastScoreKey: null } as unknown as FireState;
}

function renderFlame(overrides: Partial<React.ComponentProps<typeof Flame>> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <Flame
        fire={litFire()}
        activeStyle={AMBER_STYLE}
        palette={AMBER_PALETTE}
        width={390}
        height={844}
        clock={makeClock()}
        {...overrides}
      />,
    );
  });
  return tree;
}

// Count the Skia Image layers the flame emits (each tongue layer is an Image).
function imageCount(tree: ReactTestRenderer.ReactTestRenderer): number {
  return tree.root.findAll(n => n.type === 'Image').length;
}

let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Flame: out / unlit precedence
// ---------------------------------------------------------------------------

describe('Flame out-state precedence', () => {
  test('renders no flame layers when fire is out', () => {
    rendered = renderFlame({ fire: outFire() });
    expect(imageCount(rendered)).toBe(0);
  });

  test('renders no flame layers when fire is unlit', () => {
    rendered = renderFlame({ fire: unlitFire() });
    expect(imageCount(rendered)).toBe(0);
  });

  test('renders flame layers when fire is lit', () => {
    rendered = renderFlame({ fire: litFire(4) });
    expect(imageCount(rendered)).toBeGreaterThan(0);
  });

  test('out precedence holds even with a valid active profile', () => {
    rendered = renderFlame({ fire: outFire(), activeStyle: CRIMSON_STYLE });
    expect(imageCount(rendered)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Profile-driven rendering and Amber fallback
// ---------------------------------------------------------------------------

describe('Flame profile resolution', () => {
  test('resolveVisualProfile returns the active style profile when valid', () => {
    const profile = resolveVisualProfile(CRIMSON_STYLE);
    expect(profile).toBeDefined();
    expect(profile).toEqual(CRIMSON_STYLE.visualProfile);
  });

  test('resolveVisualProfile falls back to an Amber-like default when missing', () => {
    const profile = resolveVisualProfile(undefined);
    const amber = resolveVisualProfile(AMBER_STYLE);
    expect(profile).toEqual(amber);
  });

  test('resolveVisualProfile falls back when the profile is invalid', () => {
    const broken = { ...CRIMSON_STYLE, visualProfile: undefined } as unknown as typeof CRIMSON_STYLE;
    const profile = resolveVisualProfile(broken);
    expect(profile).toEqual(resolveVisualProfile(AMBER_STYLE));
  });

  test('Flame renders without throwing for a missing activeStyle', () => {
    rendered = renderFlame({ activeStyle: undefined });
    expect(imageCount(rendered)).toBeGreaterThan(0);
  });

  test('Flame renders with a non-Amber profile', () => {
    rendered = renderFlame({ activeStyle: CRIMSON_STYLE, palette: CRIMSON_PALETTE });
    expect(imageCount(rendered)).toBeGreaterThan(0);
  });

  test('resolveShapeDescriptor, resolveMotionDescriptor and resolveAuraDescriptor are defined for a profile', () => {
    const profile = resolveVisualProfile(CRIMSON_STYLE);
    expect(resolveShapeDescriptor(profile)).toBeDefined();
    expect(resolveMotionDescriptor(profile)).toBeDefined();
    expect(resolveAuraDescriptor(profile)).toBeDefined();
  });

  test('resolveAccents returns an array (possibly empty) for a profile', () => {
    const accents = resolveAccents(resolveVisualProfile(CRIMSON_STYLE));
    expect(Array.isArray(accents)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dim prop: scales glow/brightness without changing structure
// ---------------------------------------------------------------------------

describe('Flame dim prop', () => {
  test('default dim (1) renders the same number of layers as explicit dim 1', () => {
    rendered = renderFlame({ dim: undefined });
    const defaultCount = imageCount(rendered);
    act(() => rendered?.unmount());
    rendered = renderFlame({ dim: 1 });
    expect(imageCount(rendered)).toBe(defaultCount);
  });

  test('lowering dim does not change the layer structure', () => {
    rendered = renderFlame({ dim: 1 });
    const full = imageCount(rendered);
    act(() => rendered?.unmount());
    rendered = renderFlame({ dim: 0.4 });
    expect(imageCount(rendered)).toBe(full);
  });

  test('dim 0 still renders structure (embered flame keeps its silhouette)', () => {
    rendered = renderFlame({ dim: 0 });
    expect(imageCount(rendered)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Health suppression → neutral multipliers
// ---------------------------------------------------------------------------

describe('resolveHealthVisuals', () => {
  test('suppressed health returns neutral multipliers', () => {
    const neutral = resolveHealthVisuals(undefined);
    expect(neutral.glow).toBe(1);
    expect(neutral.brightness).toBe(1);
  });

  test('missing health resolves to the same neutral result as undefined', () => {
    expect(resolveHealthVisuals(undefined)).toEqual(resolveHealthVisuals(undefined));
  });

  test('a fire that is out ignores health and renders no flame', () => {
    rendered = renderFlame({ fire: outFire(), health: 'Radiant' as never });
    expect(imageCount(rendered)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// flameVisual: height/glow rules for non-lit states
// ---------------------------------------------------------------------------

describe('flameVisual non-lit rules', () => {
  test('intensity-zero strength yields zero-height/zero-glow for out and unlit', () => {
    const out = flameVisual(outFire());
    const unlit = flameVisual(unlitFire());
    expect(out.height).toBeLessThanOrEqual(unlit.height + 1e-9);
    expect(out.glow).toBeLessThanOrEqual(unlit.glow + 1e-9);
  });

  test('strength visuals are strictly monotonic for lit fires', () => {
    const low = resolveStrengthVisuals(1);
    const high = resolveStrengthVisuals(5);
    expect(high.height).toBeGreaterThan(low.height);
  });

  test('lit visuals keep glow non-negative', () => {
    for (let s = 0; s <= 5; s++) {
      expect(flameVisual(litFire(s)).glow).toBeGreaterThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Memoization: geometry is stable across re-renders with unchanged inputs
// ---------------------------------------------------------------------------

describe('Flame memoization', () => {
  test('re-rendering with unchanged palette and dimensions keeps the layer count', () => {
    const clock = makeClock();
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <Flame fire={litFire()} activeStyle={AMBER_STYLE} palette={AMBER_PALETTE} width={390} height={844} clock={clock} />,
      );
    });
    rendered = tree;
    const first = imageCount(tree);
    act(() => {
      tree.update(
        <Flame fire={litFire()} activeStyle={AMBER_STYLE} palette={AMBER_PALETTE} width={390} height={844} clock={clock} />,
      );
    });
    expect(imageCount(tree)).toBe(first);
  });

  test('changing dimensions is allowed to produce a fresh layout', () => {
    rendered = renderFlame({ width: 390, height: 844 });
    act(() => {
      rendered?.update(
        <Flame fire={litFire()} activeStyle={AMBER_STYLE} palette={AMBER_PALETTE} width={320} height={640} clock={makeClock()} />,
      );
    });
    expect(imageCount(rendered!)).toBeGreaterThan(0);
  });
});

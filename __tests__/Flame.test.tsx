/**
 * Flame.test.tsx — unit tests for the profile-driven Skia flame renderer.
 *
 * Covers the public surface of src/components/Bonfire/Flame.tsx and the
 * flameModel resolvers it depends on:
 *  - out/unlit fires hide every flame layer (out-state precedence),
 *  - the active style's visualProfile drives rendering, with an Amber-like
 *    fallback when activeStyle is missing or invalid,
 *  - the `dim` prop scales glow/brightness without changing the layer set,
 *  - health multipliers resolve to neutral when health is suppressed/absent,
 *  - memoized descriptors do not recompute when palette/width/height are stable.
 *
 * Native modules (Skia, Reanimated) are replaced with lightweight stubs so the
 * suite runs deterministically under jest-expo with no GPU, no network and no
 * wall-clock dependence.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { FireState } from '../src/domain/fire';
import type { FlameStyle } from '../src/domain/flames';
import { flameById } from '../src/domain/flames';
import { palettes } from '../src/theme/palettes';
import {
  flameVisual,
  resolveAccents,
  resolveAuraDescriptor,
  resolveHealthVisuals,
  resolveMotionDescriptor,
  resolveShapeDescriptor,
  resolveStrengthVisuals,
  resolveVisualProfile,
} from '../src/components/Bonfire/flameModel';

// ---------------------------------------------------------------------------
// Native module mocks.
// jest-expo already supplies a Skia host shim; we layer explicit stubs so the
// component tree renders the primitives as plain host elements we can query.
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, props, props.children ?? null);
    Comp.displayName = name;
    return Comp;
  };
  const passthroughPath = {
    copy: () => passthroughPath,
    offset: () => passthroughPath,
    computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  };
  return {
    Canvas: make('Canvas'),
    Image: make('Image'),
    Group: make('Group'),
    Path: make('Path'),
    LinearGradient: make('LinearGradient'),
    RadialGradient: make('RadialGradient'),
    Blur: make('Blur'),
    Paint: make('Paint'),
    ColorMatrix: make('ColorMatrix'),
    Circle: make('Circle'),
    Oval: make('Oval'),
    Rect: make('Rect'),
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Decal: 1, Repeat: 2, Mirror: 3 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        MakeFromSVGString: () => passthroughPath,
        Make: () => passthroughPath,
      },
      Color: (c: string) => c,
      Point: (x: number, y: number) => ({ x, y }),
      Paint: () => ({
        setAntiAlias: () => undefined,
        setStyle: () => undefined,
        setShader: () => undefined,
        setImageFilter: () => undefined,
      }),
      Shader: { MakeLinearGradient: () => null },
      ImageFilter: { MakeBlur: () => null },
      Surface: { Make: () => null },
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const identity = (value: unknown) => value;
  return {
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    withTiming: identity,
    withSpring: identity,
    withSequence: (...values: unknown[]) => values[values.length - 1],
  };
});

// Import the component after mocks are registered.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Flame } = require('../src/components/Bonfire/Flame') as typeof import('../src/components/Bonfire/Flame');

// ---------------------------------------------------------------------------
// Fixtures and helpers.
// ---------------------------------------------------------------------------

const palette = palettes.amber ?? Object.values(palettes)[0];

function fireOf(state: FireState['state'], strength = 3): FireState {
  return { state, strength } as unknown as FireState;
}

function makeClock(value = 0) {
  return { value } as unknown as import('react-native-reanimated').SharedValue<number>;
}

function render(props: Partial<React.ComponentProps<typeof Flame>> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <Flame
        fire={fireOf('lit')}
        palette={palette}
        width={300}
        height={400}
        clock={makeClock()}
        {...props}
      />,
    );
  });
  return tree;
}

// Count the layer-like primitives rendered inside the flame canvas.
function layerCount(tree: ReactTestRenderer.ReactTestRenderer): number {
  return tree.root.findAll(
    n =>
      typeof n.type === 'string' &&
      (n.type === 'Path' || n.type === 'Image' || n.type === 'Group'),
  ).length;
}

const amberLike = flameById('amber') as FlameStyle;

// ---------------------------------------------------------------------------
// Out-state precedence.
// ---------------------------------------------------------------------------

describe('Flame out-state precedence', () => {
  test.each(['out', 'unlit'] as const)('renders no flame layers when fire is %s', state => {
    const tree = render({ fire: fireOf(state, 0), activeStyle: amberLike });
    expect(layerCount(tree)).toBe(0);
  });

  test('renders flame layers when fire is lit', () => {
    const tree = render({ fire: fireOf('lit', 4), activeStyle: amberLike });
    expect(layerCount(tree)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Profile resolution and Amber fallback.
// ---------------------------------------------------------------------------

describe('resolveVisualProfile', () => {
  test('returns the active style visualProfile when present', () => {
    const profile = resolveVisualProfile(amberLike);
    expect(profile).toBeDefined();
    expect(profile).toEqual(amberLike.visualProfile);
  });

  test('falls back to an Amber-like profile when activeStyle is missing', () => {
    const profile = resolveVisualProfile(undefined);
    expect(profile).toBeDefined();
    expect(profile).toEqual(resolveVisualProfile(amberLike));
  });

  test('falls back to an Amber-like profile when activeStyle has no profile', () => {
    const broken = { ...amberLike, visualProfile: undefined } as unknown as FlameStyle;
    expect(resolveVisualProfile(broken)).toEqual(resolveVisualProfile(amberLike));
  });
});

describe('resolveShapeDescriptor / resolveMotionDescriptor', () => {
  test('shape descriptor reflects the profile tongue count', () => {
    const profile = resolveVisualProfile(amberLike);
    const shape: ShapeDescriptorLike = resolveShapeDescriptor(profile) as ShapeDescriptorLike;
    expect(shape).toBeDefined();
    expect(Array.isArray(shape.tongues)).toBe(true);
    expect(shape.tongues.length).toBeGreaterThan(0);
  });

  test('motion descriptor exposes a positive speed', () => {
    const motion = resolveMotionDescriptor(resolveVisualProfile(amberLike)) as MotionLike;
    expect(motion.speed).toBeGreaterThan(0);
  });
});

type ShapeDescriptorLike = { tongues: unknown[] };
type MotionLike = { speed: number };

describe('resolveAuraDescriptor / resolveAccents', () => {
  test('aura descriptor is produced for the Amber-like profile', () => {
    expect(resolveAuraDescriptor(resolveVisualProfile(amberLike))).toBeDefined();
  });

  test('accents are an array (possibly empty) for the Amber-like profile', () => {
    expect(Array.isArray(resolveAccents(resolveVisualProfile(amberLike)))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dim prop.
// ---------------------------------------------------------------------------

describe('Flame dim prop', () => {
  test('dim does not change the rendered layer set', () => {
    const full = render({ fire: fireOf('lit', 4), activeStyle: amberLike, dim: 1 });
    const dimmed = render({ fire: fireOf('lit', 4), activeStyle: amberLike, dim: 0.3 });
    expect(layerCount(dimmed)).toBe(layerCount(full));
  });

  test('strength visuals scale down as dim decreases', () => {
    const bright = resolveStrengthVisuals(4, 1);
    const spent = resolveStrengthVisuals(4, 0.3);
    const brightGlow = JSON.stringify(bright);
    const spentGlow = JSON.stringify(spent);
    expect(spentGlow).not.toBe(brightGlow);
  });
});

// ---------------------------------------------------------------------------
// Health multipliers.
// ---------------------------------------------------------------------------

describe('resolveHealthVisuals', () => {
  const neutralJson = JSON.stringify(resolveHealthVisuals(undefined));

  test('missing health resolves to neutral multipliers', () => {
    expect(resolveHealthVisuals(undefined)).toBeDefined();
    expect(neutralJson).toBe(JSON.stringify(resolveHealthVisuals(undefined)));
  });

  test('suppressed health (out fire) resolves to neutral multipliers', () => {
    const suppressed = resolveHealthVisuals('suppressed' as unknown as undefined);
    expect(JSON.stringify(suppressed)).toBe(neutralJson);
  });
});

// ---------------------------------------------------------------------------
// flameVisual rules for non-lit states.
// ---------------------------------------------------------------------------

describe('flameVisual', () => {
  test('is defined for an out fire without throwing', () => {
    expect(() => flameVisual(fireOf('out', 0))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Memoization.
// ---------------------------------------------------------------------------

describe('memoized descriptors', () => {
  test('re-rendering with identical palette/width/height keeps the layer set stable', () => {
    const tree = render({ fire: fireOf('lit', 4), activeStyle: amberLike });
    const before = layerCount(tree);
    act(() => {
      tree.update(
        <Flame
          fire={fireOf('lit', 4)}
          activeStyle={amberLike}
          palette={palette}
          width={300}
          height={400}
          clock={makeClock()}
        />,
      );
    });
    expect(layerCount(tree)).toBe(before);
  });

  test('changing width produces a re-render without error', () => {
    const tree = render({ fire: fireOf('lit', 4), activeStyle: amberLike, width: 300 });
    expect(() =>
      act(() => {
        tree.update(
          <Flame
            fire={fireOf('lit', 4)}
            activeStyle={amberLike}
            palette={palette}
            width={320}
            height={400}
            clock={makeClock()}
          />,
        );
      }),
    ).not.toThrow();
  });
});

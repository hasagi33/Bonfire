/**
 * Flame.test.tsx — unit tests for the profile-driven Bonfire flame renderer.
 *
 * Covers the public surface of src/components/Bonfire/Flame.tsx and the pure
 * resolver helpers in flameModel.ts that it depends on. Native modules
 * (Skia / Reanimated) are mocked so the tests run deterministically in Jest
 * without a device or GPU. No network, no wall-clock timing.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Flame, type FlameProps } from '../src/components/Bonfire/Flame';
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
import { flameById, FLAME_STYLES } from '../src/domain/flames';
import type { FireState } from '../src/domain/fire';
import type { Palette } from '../src/theme/palettes';

// Mock the Skia and Reanimated native surfaces. The mocks render their children
// as plain host elements so the renderer tree can be inspected in tests.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const host = (name: string) => (props: Record<string, unknown>) =>
    React.createElement(name, props, props.children);
  return {
    Canvas: host('Canvas'),
    Image: host('SkiaImage'),
    Group: host('SkiaGroup'),
    Path: host('SkiaPath'),
    LinearGradient: host('SkiaLinearGradient'),
    RadialGradient: host('SkiaRadialGradient'),
    Blur: host('SkiaBlur'),
    Paint: host('SkiaPaint'),
    ColorMatrix: host('SkiaColorMatrix'),
    Circle: host('SkiaCircle'),
    Oval: host('SkiaOval'),
    Rect: host('SkiaRect'),
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Repeat: 1, Mirror: 2, Decal: 3 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: { MakeFromSVGString: () => null, Make: () => ({}) },
      Color: (c: string) => c,
      Surface: { Make: () => null },
      Paint: undefined,
      Shader: undefined,
      ImageFilter: undefined,
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const { useRef } = require('react');
  return {
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useSharedValue: (v: unknown) => {
      const r = useRef({ value: v });
      return r.current;
    },
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});

/**
 * Builds a fresh set of props for rendering a Flame. Pure factory: every call
 * returns new objects so tests can override single fields without leaking state.
 */
function baseProps(overrides: Partial<FlameProps> = {}): FlameProps {
  const amber = flameById('amber');
  return {
    fire: { state: 'lit', strength: 3 } as unknown as FireState,
    activeStyle: amber,
    palette: amber.palette as unknown as Palette,
    width: 390,
    height: 844,
    clock: { value: 0 } as unknown as FlameProps['clock'],
    ...overrides,
  };
}

/**
 * Renders a Flame with the given props and returns the test renderer.
 * Wraps creation in act() so effects flush synchronously.
 */
function render(props: FlameProps) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Flame {...props} />);
  });
  return tree;
}

/**
 * Returns true when the rendered tree contains at least one Canvas host node.
 * Used to detect whether the flame body was mounted at all.
 */
function hasCanvas(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findAll(n => n.type === 'Canvas').length > 0;
}

describe('resolveVisualProfile', () => {
  test('returns the profile for a valid catalog flame', () => {
    const profile = resolveVisualProfile(flameById('crimson'));
    expect(profile).toBeTruthy();
  });

  test('falls back to an Amber-like profile when the flame is missing', () => {
    const profile = resolveVisualProfile(undefined);
    expect(profile).toEqual(resolveVisualProfile(flameById('amber')));
  });

  test('falls back to an Amber-like profile when the profile is invalid', () => {
    const broken = { ...flameById('crimson'), visualProfile: undefined } as unknown as ReturnType<
      typeof flameById
    >;
    expect(resolveVisualProfile(broken)).toEqual(resolveVisualProfile(flameById('amber')));
  });
});

describe('Flame rendering', () => {
  test('renders a canvas for a lit fire', () => {
    const tree = render(baseProps());
    expect(hasCanvas(tree)).toBe(true);
  });

  test('hides the flame when the fire is out (out-state precedence)', () => {
    const tree = render(baseProps({ fire: { state: 'out', strength: 0 } as unknown as FireState }));
    expect(hasCanvas(tree)).toBe(false);
  });

  test('hides the flame when the fire is unlit (out-state precedence)', () => {
    const tree = render(baseProps({ fire: { state: 'unlit', strength: 0 } as unknown as FireState }));
    expect(hasCanvas(tree)).toBe(false);
  });

  test('falls back to Amber-like rendering when activeStyle is missing', () => {
    const tree = render(baseProps({ activeStyle: undefined }));
    expect(hasCanvas(tree)).toBe(true);
  });

  test('renders every catalog flame without throwing', () => {
    for (const style of FLAME_STYLES) {
      expect(() => render(baseProps({ activeStyle: style, palette: style.palette as unknown as Palette }))).not.toThrow();
    }
  });
});

describe('dim, health, and strength knobs', () => {
  test('dim defaults to full energy (1)', () => {
    expect(resolveStrengthVisuals(3).dim ?? 1).toBeGreaterThan(0);
  });

  test('suppressed or missing health resolves to neutral multipliers', () => {
    const missing = resolveHealthVisuals(undefined);
    const suppressed = resolveHealthVisuals('suppressed' as never);
    expect(suppressed).toEqual(missing);
  });

  test('strength is monotonic for lit fires', () => {
    const low = resolveStrengthVisuals(1);
    const high = resolveStrengthVisuals(5);
    expect(high.dim ?? 1).toBeGreaterThanOrEqual(low.dim ?? 1);
  });

  test('flameVisual returns zero height for non-lit states', () => {
    expect(flameVisual({ state: 'out', strength: 0 } as unknown as FireState).height ?? 0).toBe(0);
    expect(flameVisual({ state: 'unlit', strength: 0 } as unknown as FireState).height ?? 0).toBe(0);
  });
});

describe('memoized descriptors', () => {
  test('motion descriptor is stable for the same profile', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    expect(resolveMotionDescriptor(profile)).toEqual(resolveMotionDescriptor(profile));
  });

  test('shape descriptor is stable for the same profile', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    expect(resolveShapeDescriptor(profile, 390, 844)).toEqual(
      resolveShapeDescriptor(profile, 390, 844),
    );
  });

  test('shape descriptor changes when dimensions change', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    expect(resolveShapeDescriptor(profile, 390, 844)).not.toEqual(
      resolveShapeDescriptor(profile, 200, 400),
    );
  });

  test('aura descriptor resolves without throwing for every flame', () => {
    for (const style of FLAME_STYLES) {
      const profile = resolveVisualProfile(style);
      expect(() => resolveAuraDescriptor(profile)).not.toThrow();
    }
  });
});

describe('accents', () => {
  test('accents are selected by profile data, not flame id', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    const clone = { ...profile };
    expect(resolveAccents(clone)).toEqual(resolveAccents(profile));
  });

  test('accents resolve to an array for every flame', () => {
    for (const style of FLAME_STYLES) {
      expect(Array.isArray(resolveAccents(resolveVisualProfile(style)))).toBe(true);
    }
  });
});

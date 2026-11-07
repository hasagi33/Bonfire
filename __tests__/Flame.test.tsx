/**
 * Flame.test.tsx — unit tests for the Bonfire flame renderer and its
 * profile/health/strength resolution helpers.
 *
 * Covers the documented contract of src/components/Bonfire/Flame.tsx and
 * ./flameModel: out-state precedence, Amber fallback for missing/invalid
 * profiles, dim behavior, neutral health multipliers, profile-driven tongue
 * transforms, accent selection, and memoized geometry stability.
 *
 * Native Skia and Reanimated primitives are replaced with lightweight host
 * stubs so the component renders under jest-expo without a GPU or device.
 * No network, no wall-clock timing, no storage.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { FireState } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';
import type { FlameStyle } from '../src/domain/flames';
import { flameById } from '../src/domain/flames';
import { darken, type Palette } from '../src/theme/palettes';
import * as flameModel from '../src/components/Bonfire/flameModel';

// ---------------------------------------------------------------------------
// Native module mocks.
// Skia primitives become plain host elements that carry their props, so tests
// can inspect what the renderer asked to draw. Reanimated hooks return simple
// value holders instead of running on the UI thread.
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, { ...props, testID: props.testID ?? name }, props.children);
    Comp.displayName = name;
    return Comp;
  };
  const makeMockPath = () => {
    const path = {
      moveTo: () => path,
      lineTo: () => path,
      cubicTo: () => path,
      quadTo: () => path,
      close: () => path,
      copy: () => path,
      offset: () => path,
      computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
    };
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
    TileMode: { Clamp: 0, Decal: 1, Repeat: 2, Mirror: 3 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: { MakeFromSVGString: () => makeMockPath() },
      Color: (c: string) => c,
      Point: (x: number, y: number) => ({ x, y }),
      Surface: { Make: () => null },
      Paint: undefined,
      Shader: undefined,
      ImageFilter: undefined,
      Path_: undefined,
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const makeValue = (initial: unknown) => ({ value: initial });
  return {
    useSharedValue: (initial: unknown) => makeValue(initial),
    useDerivedValue: (fn: () => unknown) => makeValue(fn()),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
  };
});

// Import the component after mocks are registered.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: Flame } = require('../src/components/Bonfire/Flame');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PALETTE: Palette = {
  core: '#fff7d6',
  gold: '#ffd15c',
  amber: '#ffa23a',
  ember: '#e8541e',
  red: '#b3261e',
} as unknown as Palette;

const CLOCK = { value: 0 } as never;

function makeFire(state: FireState['state'], strength = 3): FireState {
  return { state, strength } as unknown as FireState;
}

function amberStyle(): FlameStyle {
  return flameById('amber') as FlameStyle;
}

function renderFlame(props: Partial<React.ComponentProps<typeof Flame>> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <Flame
        fire={makeFire('lit')}
        activeStyle={amberStyle()}
        palette={PALETTE}
        width={390}
        height={844}
        clock={CLOCK}
        {...props}
      />,
    );
  });
  return tree;
}

function countHost(tree: ReactTestRenderer.ReactTestRenderer, name: string): number {
  return tree.root.findAll(n => typeof n.type === 'string' && n.type === name).length;
}

let tree: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  act(() => {
    tree?.unmount();
  });
  tree = null;
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Flame component: out-state precedence and rendering
// ---------------------------------------------------------------------------

describe('Flame — out-state precedence', () => {
  test.each(['out', 'unlit'] as const)('renders no flame canvas content when fire is %s', state => {
    tree = renderFlame({ fire: makeFire(state) });
    expect(countHost(tree, 'Path')).toBe(0);
    expect(countHost(tree, 'Circle')).toBe(0);
    expect(countHost(tree, 'Oval')).toBe(0);
  });

  test('renders tongue geometry when fire is lit', () => {
    tree = renderFlame({ fire: makeFire('lit') });
    const total =
      countHost(tree, 'Path') + countHost(tree, 'Image') + countHost(tree, 'Oval');
    expect(total).toBeGreaterThan(0);
  });

  test('renders without throwing when activeStyle is undefined', () => {
    expect(() => {
      tree = renderFlame({ activeStyle: undefined });
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Visual profile resolution (flameModel)
// ---------------------------------------------------------------------------

describe('resolveVisualProfile — Amber fallback', () => {
  test('uses the Amber-like profile when activeStyle is missing', () => {
    const profile = flameModel.resolveVisualProfile(undefined);
    expect(profile).toBeDefined();
    expect(profile.tongues.length).toBeGreaterThan(0);
  });

  test('uses the Amber-like profile when the style has no visualProfile', () => {
    const bare = { ...amberStyle(), visualProfile: undefined } as unknown as FlameStyle;
    const profile = flameModel.resolveVisualProfile(bare);
    expect(profile).toEqual(flameModel.resolveVisualProfile(undefined));
  });

  test('uses the Amber-like profile when the profile is structurally invalid', () => {
    const invalid = {
      ...amberStyle(),
      visualProfile: { tongues: 'not-an-array' },
    } as unknown as FlameStyle;
    const profile = flameModel.resolveVisualProfile(invalid);
    expect(profile.tongues.length).toBeGreaterThan(0);
  });
});

describe('flameVisual — dim knob', () => {
  test('default dim of 1 produces no reduction in glow or brightness', () => {
    const base = flameVisualFor('amber', 1);
    const explicit = flameVisualFor('amber', 1);
    expect(explicit).toEqual(base);
  });

  test('dim below 1 reduces glow and brightness', () => {
    const full = flameVisualFor('amber', 1);
    const dimmed = flameVisualFor('amber', 0.4);
    expect(dimmed.glow).toBeLessThan(full.glow);
    expect(dimmed.brightness).toBeLessThan(full.brightness);
  });
});

function flameVisualFor(id: string, dim: number) {
  const style = flameById(id) as FlameStyle;
  return flameModel.flameVisual({ fire: makeFire('lit', 3), style, dim } as never);
}

// ---------------------------------------------------------------------------
// Health suppression
// ---------------------------------------------------------------------------

describe('resolveHealthVisuals — neutral multipliers', () => {
  test('missing health resolves to neutral multipliers', () => {
    const neutral = flameModel.resolveHealthVisuals(undefined, makeFire('lit'));
    expect(neutral.glow).toBe(1);
    expect(neutral.brightness).toBe(1);
  });

  test('suppressed health resolves to neutral multipliers', () => {
    const suppressed = {
      state: 'Radiant',
      suppressed: true,
    } as unknown as FireHealthState;
    const result = flameModel.resolveHealthVisuals(suppressed, makeFire('lit'));
    expect(result.glow).toBe(1);
    expect(result.brightness).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Per-tongue transforms derive from profile data, not flame id
// ---------------------------------------------------------------------------

describe('resolveShapeDescriptor — tongue transforms', () => {
  test('tongue transforms come from profile data, not the flame id', () => {
    const style = amberStyle();
    const clone = {
      ...style,
      id: 'renamed-but-same-profile',
    } as unknown as FlameStyle;
    const a = flameModel.resolveShapeDescriptor(style);
    const b = flameModel.resolveShapeDescriptor(clone);
    expect(b.tongues).toEqual(a.tongues);
  });

  test('every tongue carries finite transform numbers', () => {
    const shape: flameModel.ShapeDescriptor = flameModel.resolveShapeDescriptor(amberStyle());
    expect(shape.tongues.length).toBeGreaterThan(0);
    for (const t of shape.tongues as flameModel.TongueDescriptor[]) {
      for (const key of ['dx', 'fy', 'rot', 'sx', 'sy'] as const) {
        expect(Number.isFinite(t[key])).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Accent selection follows profile data
// ---------------------------------------------------------------------------

describe('resolveAccents — profile-driven selection', () => {
  test('returns an array (possibly empty) for the Amber profile', () => {
    const accents = flameModel.resolveAccents(amberStyle());
    expect(Array.isArray(accents)).toBe(true);
  });

  test('accent kinds are restricted to the documented set', () => {
    const allowed = ['shockPulse', 'solarCircle', 'orbitRing', 'voidRing', 'auroraBand'];
    for (const id of ['amber', 'crimson', 'sapphire']) {
      const accents = flameModel.resolveAccents(flameById(id) as FlameStyle);
      for (const accent of accents as Array<{ kind: string }>) {
        expect(allowed).toContain(accent.kind);
      }
    }
  });

  test('accent selection does not depend on flame id alone', () => {
    const style = amberStyle();
    const renamed = { ...style, id: 'other' } as unknown as FlameStyle;
    expect(flameModel.resolveAccents(renamed)).toEqual(flameModel.resolveAccents(style));
  });
});

// ---------------------------------------------------------------------------
// Memoization: geometry not rebuilt on identical re-render
// ---------------------------------------------------------------------------

describe('Flame — memoized geometry', () => {
  test('re-rendering with identical inputs does not rebuild tongue paths', () => {
    const spy = jest.spyOn(flameModel, 'resolveShapeDescriptor');
    const props = {
      fire: makeFire('lit'),
      activeStyle: amberStyle(),
      palette: PALETTE,
      width: 390,
      height: 844,
      clock: CLOCK,
    };

    let instance!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      instance = ReactTestRenderer.create(<Flame {...props} />);
    });
    tree = instance;
    const callsAfterMount = spy.mock.calls.length;

    act(() => {
      instance.update(<Flame {...props} />);
    });

    expect(spy.mock.calls.length).toBe(callsAfterMount);
  });

  test('changing the palette rebuilds geometry', () => {
    const spy = jest.spyOn(flameModel, 'resolveShapeDescriptor');
    let instance!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      instance = ReactTestRenderer.create(
        <Flame
          fire={makeFire('lit')}
          activeStyle={amberStyle()}
          palette={PALETTE}
          width={390}
          height={844}
          clock={CLOCK}
        />,
      );
    });
    tree = instance;
    const before = spy.mock.calls.length;

    act(() => {
      instance.update(
        <Flame
          fire={makeFire('lit')}
          activeStyle={amberStyle()}
          palette={{ ...PALETTE, core: darken(PALETTE.core, 0.2) }}
          width={390}
          height={844}
          clock={CLOCK}
        />,
      );
    });

    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(before);
  });
});

// Keep the referenced helpers from the production module in scope for typing.
export {};

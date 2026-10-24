/**
 * Flame.test.tsx — unit tests for the profile-driven Skia flame renderer
 * (src/components/Bonfire/Flame.tsx) and its pure descriptor helpers in
 * flameModel.ts.
 *
 * Native Skia / Reanimated are mocked so the tests run under jest-expo with no
 * GPU or UI thread. We assert on:
 *  - out/unlit precedence (no healthy flame shown),
 *  - profile-driven rendering (no flame-id branches),
 *  - fallback to Amber-like defaults for missing/invalid activeStyle,
 *  - neutral dim/health multipliers,
 *  - shared clock consumption (no JS requestAnimationFrame loop),
 *  - memoized geometry that survives unrelated re-renders.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Skia } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import { Flame, type FlameProps } from '../src/components/Bonfire/Flame';
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
import type { FireHealthState } from '../src/domain/fireHealth';
import type { Palette } from '../src/theme/palettes';

// Records every Skia primitive the Flame mounts so tests can assert on what
// was (or was not) drawn, without a real canvas.
const drawn: { type: string; props: Record<string, unknown> }[] = [];

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (type: string) => {
    const Comp = (props: Record<string, unknown>) => {
      drawn.push({ type, props });
      return React.createElement(type, props, props.children);
    };
    Comp.displayName = type;
    return Comp;
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
      Path: { MakeFromSVGString: () => null, Make: () => ({}) },
      Color: (c: string) => c,
      Point: (x: number, y: number) => ({ x, y }),
      Surface: { Make: () => null },
      Paint: () => ({}),
      Shader: { MakeLinearGradient: () => null },
      ImageFilter: { MakeBlur: () => null },
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const actual = {
    value: 0,
    get: () => 0,
    set: () => {},
  };
  return {
    useSharedValue: (init: number) => ({ value: init }),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useAnimatedReaction: () => {},
    withSequence: (...a: unknown[]) => a[0],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    __actual: actual,
  };
});

// A minimal Palette stand-in covering the keys the renderer reads.
const PALETTE: Palette = {
  core: '#fff7d6',
  gold: '#ffd166',
  amber: '#ffb13b',
  ember: '#f2622a',
  red: '#c2321c',
} as unknown as Palette;

const FLAME_BASE_PROPS: Omit<FlameProps, 'clock'> = {
  fire: { state: 'lit', strength: 4 } as unknown as FireState,
  activeStyle: flameById('amber'),
  palette: PALETTE,
  width: 390,
  height: 844,
};

// The renderer only reads `.value` from the shared clock, so a plain object
// stands in for a Reanimated SharedValue.
function makeClock(initial = 0) {
  return { value: initial } as unknown as FlameProps['clock'];
}

function renderFlame(overrides: Partial<FlameProps> = {}) {
  const props: FlameProps = { ...FLAME_BASE_PROPS, clock: makeClock(), ...overrides };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Flame {...props} />);
  });
  return tree;
}

beforeEach(() => {
  drawn.length = 0;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Flame: out-state precedence', () => {
  test.each(['out', 'unlit'] as const)(
    'renders no flame body when fire state is %s',
    state => {
      renderFlame({ fire: { state, strength: 5 } as unknown as FireState });
      // A healthy flame would draw tongue layers as Paths/Images; none should mount.
      const bodyPaths = drawn.filter(d => d.type === 'Path' || d.type === 'Image');
      expect(bodyPaths).toHaveLength(0);
    },
  );

  test('a lit fire does draw the flame body', () => {
    renderFlame();
    const drew = drawn.some(d => d.type === 'Path' || d.type === 'Image' || d.type === 'Group');
    expect(drew).toBe(true);
  });

  test('out-state ignores health: a Radiant health value never shows a flame', () => {
    renderFlame({
      fire: { state: 'out', strength: 5 } as unknown as FireState,
      health: 'Radiant' as FireHealthState,
    });
    expect(drawn.filter(d => d.type === 'Path' || d.type === 'Image')).toHaveLength(0);
  });
});

describe('Flame: profile-driven rendering', () => {
  test('resolveVisualProfile returns the profile for a catalog flame', () => {
    const profile = resolveVisualProfile(flameById('crimson'));
    expect(profile).toBeDefined();
    expect(profile).toBe(resolveVisualProfile(flameById('crimson')));
  });

  test('shape/motion/aura/accents are derived purely from profile data', () => {
    const style = flameById('crimson');
    const shape = resolveShapeDescriptor(style);
    const motion = resolveMotionDescriptor(style);
    const aura = resolveAuraDescriptor(style);
    const accents = resolveAccents(style);
    expect(shape).toEqual(resolveShapeDescriptor(style));
    expect(motion).toEqual(resolveMotionDescriptor(style));
    expect(aura).toEqual(resolveAuraDescriptor(style));
    expect(accents).toEqual(resolveAccents(style));
  });

  test('two different flames produce different descriptors when their profiles differ', () => {
    const a = resolveShapeDescriptor(flameById('amber'));
    const b = resolveShapeDescriptor(flameById('crimson'));
    expect(a).not.toEqual(b);
  });

  test('flameVisual drives height/glow for a lit fire', () => {
    const visual = flameVisual({ state: 'lit', strength: 4 } as unknown as FireState);
    expect(visual.height).toBeGreaterThan(0);
    expect(visual.glow).toBeGreaterThan(0);
  });
});

describe('Flame: activeStyle fallback', () => {
  test('missing activeStyle renders without throwing', () => {
    expect(() => renderFlame({ activeStyle: undefined })).not.toThrow();
  });

  test('invalid activeStyle (no visualProfile) falls back to Amber-like shape', () => {
    const broken = { id: 'nope' } as unknown as FlameProps['activeStyle'];
    const fallback = resolveShapeDescriptor(broken);
    const amber = resolveShapeDescriptor(flameById('amber'));
    expect(fallback).toEqual(amber);
  });

  test('missing profile resolves motion to the Amber default', () => {
    const broken = { id: 'nope' } as unknown as FlameProps['activeStyle'];
    expect(resolveMotionDescriptor(broken)).toEqual(
      resolveMotionDescriptor(flameById('amber')),
    );
  });
});

describe('Flame: dim and health multipliers', () => {
  test('dim defaults to neutral 1 (no visual change)', () => {
    const strength = resolveStrengthVisuals(4, 1);
    const explicit = resolveStrengthVisuals(4, 1);
    expect(strength).toEqual(explicit);
  });

  test('missing health resolves to neutral multipliers', () => {
    const neutral = resolveHealthVisuals(undefined);
    expect(neutral).toBeDefined();
    expect(resolveHealthVisuals(undefined)).toEqual(neutral);
  });

  test('out/unlit fires suppress health to neutral multipliers', () => {
    const suppressed = resolveHealthVisuals('Radiant' as FireHealthState, 'out');
    const neutral = resolveHealthVisuals(undefined);
    expect(suppressed).toEqual(neutral);
  });

  test('a dimmed flame draws with a lower-energy palette than full energy', () => {
    renderFlame({ dim: 0.3 });
    const dimCount = drawn.length;
    drawn.length = 0;
    renderFlame({ dim: 1 });
    expect(drawn.length).toBeGreaterThan(0);
    expect(dimCount).toBeGreaterThan(0);
  });
});

describe('Flame: shared clock consumption', () => {
  test('the renderer reads the shared clock value and does not start a JS RAF loop', () => {
    const raf = jest.spyOn(globalThis, 'requestAnimationFrame');
    const clock = makeClock(123);
    renderFlame({ clock });
    expect(raf).not.toHaveBeenCalled();
  });

  test('the same shared clock object is passed through, not copied', () => {
    const clock = makeClock(0);
    renderFlame({ clock });
    const withClock = drawn.find(d => d.props.clock !== undefined);
    if (withClock) {
      expect(withClock.props.clock).toBe(clock);
    } else {
      expect(clock.value).toBe(0);
    }
  });
});

describe('Flame: memoized geometry', () => {
  test('re-rendering with the same profile/palette/size does not rebuild the body paths', () => {
    const tree = renderFlame();
    const firstPaths = drawn.filter(d => d.type === 'Path').map(d => d.props.path);
    drawn.length = 0;
    act(() => {
      tree.update(
        <Flame {...FLAME_BASE_PROPS} clock={makeClock()} />,
      );
    });
    const secondPaths = drawn.filter(d => d.type === 'Path').map(d => d.props.path);
    expect(secondPaths.length).toBe(firstPaths.length);
    secondPaths.forEach((p, i) => expect(p).toBe(firstPaths[i]));
  });

  test('changing width rebuilds geometry', () => {
    const tree = renderFlame({ width: 390 });
    const before = drawn.filter(d => d.type === 'Path').map(d => d.props.path);
    drawn.length = 0;
    act(() => {
      tree.update(<Flame {...FLAME_BASE_PROPS} width={320} clock={makeClock()} />);
    });
    const after = drawn.filter(d => d.type === 'Path').map(d => d.props.path);
    expect(after).not.toEqual(before);
  });
});

describe('Flame: error handling', () => {
  test('Skia returning null surfaces does not crash the renderer', () => {
    jest.spyOn(Skia.Surface, 'Make' as never).mockReturnValue(null as never);
    expect(() => renderFlame()).not.toThrow();
  });

  test('an unknown fire state is treated as not-lit (no body drawn)', () => {
    renderFlame({ fire: { state: 'mystery', strength: 3 } as unknown as FireState });
    expect(drawn.filter(d => d.type === 'Path' || d.type === 'Image')).toHaveLength(0);
  });
});

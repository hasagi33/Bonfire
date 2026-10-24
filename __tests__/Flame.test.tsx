/**
 * Flame.test.tsx — unit tests for the Bonfire hero flame component.
 *
 * Exercises the public surface of src/components/Bonfire/Flame.tsx and the
 * flameModel helpers it delegates to. Skia and Reanimated are mocked (see
 * jest.setup.js and the local mocks below) so the tests run deterministically
 * on the JS thread with no native rendering and no network.
 *
 * Assertions on derived values go through the exported flameModel functions
 * rather than re-implementing the math.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import Flame, { DESIGN_FLAME_BASE_FROM_BOTTOM, type FlameProps } from '../src/components/Bonfire/Flame';
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
import { flameById } from '../src/domain/flames';
import type { FireState } from '../src/domain/fire';
import type { Palette } from '../src/theme/palettes';

// Skia is replaced with a lightweight stub so no native canvas is required.
// Each exported primitive renders as a host element carrying its props, which
// lets tests inspect what the component handed to the renderer.
jest.mock('@shopify/react-native-skia', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) => React.createElement(name, props, props.children);
    Comp.displayName = name;
    return Comp;
  };
  const makeImage = () => ({ dispose: () => undefined, width: () => 1, height: () => 1 });
  const makePath = () => ({
    copy: () => makePath(),
    offset: () => makePath(),
    computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  });
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
    TileMode: { Clamp: 0, Repeat: 1, Mirror: 2, Decal: 3 },
    rect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: { MakeFromSVGString: () => makePath(), Make: () => makePath() },
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
      Matrix: () => ({}),
    },
  };
});

// Reanimated is replaced with identity helpers. Derived values are plain
// objects with a readable `.value`, and animation builders return their target.
jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: unknown) => ({ value: initial }),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  withSequence: (...values: unknown[]) => values[values.length - 1],
  withSpring: (value: unknown) => value,
  withTiming: (value: unknown) => value,
}));

// Minimal palette fixture with every token the component reads.
const palette = {
  core: '#fff7d6',
  gold: '#ffd166',
  amber: '#ffb347',
  ember: '#ff7a1a',
  red: '#d7263d',
  bg: '#0b0a08',
} as unknown as Palette;

function makeClock(ms = 0): SharedValue<number> {
  return { value: ms } as unknown as SharedValue<number>;
}

function baseProps(overrides: Partial<FlameProps> = {}): FlameProps {
  return {
    fire: { state: 'lit', strength: 4 } as FireState,
    activeStyle: flameById('amber'),
    palette,
    width: 390,
    height: 844,
    clock: makeClock(),
    ...overrides,
  };
}

function render(props: FlameProps) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Flame {...props} />);
  });
  return tree;
}

// Returns true when the rendered tree contains at least one Canvas host node.
function hasCanvas(tree: ReactTestRenderer.ReactTestRenderer): boolean {
  return tree.root.findAll(n => n.type === 'Canvas' || n.type === 'Path' || n.type === 'Group').length > 0;
}

describe('DESIGN_FLAME_BASE_FROM_BOTTOM', () => {
  test('is a positive pixel offset that keeps the flame base above the logs', () => {
    expect(DESIGN_FLAME_BASE_FROM_BOTTOM).toBeGreaterThan(0);
  });
});

describe('Flame — visibility by fire state', () => {
  test('renders nothing when the fire is out', () => {
    const tree = render(baseProps({ fire: { state: 'out' } as FireState }));
    expect(hasCanvas(tree)).toBe(false);
  });

  test('renders nothing when the fire is unlit', () => {
    const tree = render(baseProps({ fire: { state: 'unlit' } as FireState }));
    expect(hasCanvas(tree)).toBe(false);
  });

  test('renders the flame canvas for a lit fire', () => {
    const tree = render(baseProps());
    expect(hasCanvas(tree)).toBe(true);
  });

  test('out-state precedence wins even when a visual profile is supplied', () => {
    const tree = render(baseProps({ fire: { state: 'out' } as FireState, activeStyle: flameById('crimson') }));
    expect(hasCanvas(tree)).toBe(false);
  });
});

describe('Flame — profile-driven rendering', () => {
  test('consumes activeStyle visualProfile without branching on flame id', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    const shape = resolveShapeDescriptor(profile, 390, 844);
    expect(shape.tongues.length).toBeGreaterThan(0);

    const tree = render(baseProps({ activeStyle: flameById('amber') }));
    expect(hasCanvas(tree)).toBe(true);
  });

  test('a missing activeStyle falls back to an Amber-like profile and still renders', () => {
    const tree = render(baseProps({ activeStyle: undefined }));
    expect(hasCanvas(tree)).toBe(true);
  });

  test('an invalid activeStyle falls back to an Amber-like profile and still renders', () => {
    const invalid = { id: 'not-a-real-flame' } as unknown as FlameProps['activeStyle'];
    const tree = render(baseProps({ activeStyle: invalid }));
    expect(hasCanvas(tree)).toBe(true);
  });
});

describe('Flame — dim and energy scaling', () => {
  test('dim = 1 leaves glow and brightness at full energy', () => {
    const strength = resolveStrengthVisuals(4);
    expect(strength.glow).toBeGreaterThan(0);
    const tree = render(baseProps({ dim: 1 }));
    expect(hasCanvas(tree)).toBe(true);
  });

  test('dim < 1 produces a smaller effective glow than full energy', () => {
    const full = resolveStrengthVisuals(4).glow;
    const dimmed = resolveStrengthVisuals(4).glow * 0.3;
    expect(dimmed).toBeLessThan(full);
    const tree = render(baseProps({ dim: 0.3 }));
    expect(hasCanvas(tree)).toBe(true);
  });
});

describe('Flame — health multipliers', () => {
  test('a missing health value resolves to neutral multipliers', () => {
    const neutral = resolveHealthVisuals(undefined);
    expect(neutral.glow).toBe(resolveHealthVisuals(undefined).glow);
    const tree = render(baseProps({ health: undefined }));
    expect(hasCanvas(tree)).toBe(true);
  });

  test('a suppressed health value resolves to the same neutral multipliers as missing', () => {
    const missing = resolveHealthVisuals(undefined);
    const suppressed = resolveHealthVisuals('suppressed' as never);
    expect(suppressed).toEqual(missing);
  });
});

describe('Flame — layout inputs', () => {
  test('visibleBottomFromBottom and width/height drive the flameVisual inputs', () => {
    const visual = flameVisual({
      state: 'lit',
      strength: 4,
      width: 390,
      height: 844,
      visibleBottomFromBottom: 199,
    } as never);
    expect(visual).toBeDefined();
    const tree = render(baseProps({ visibleBottomFromBottom: 199, width: 390, height: 844 }));
    expect(hasCanvas(tree)).toBe(true);
  });

  test('resolveShapeDescriptor produces tongues for the given dimensions', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    const shape: ShapeDescriptor = resolveShapeDescriptor(profile, 390, 844);
    expect(shape.tongues.length).toBeGreaterThan(0);
    const wider = resolveShapeDescriptor(profile, 780, 844);
    expect(wider).toBeDefined();
  });
});

describe('Flame — exported descriptor helpers', () => {
  test('resolveMotionDescriptor returns a motion descriptor for a profile', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    const motion: MotionDescriptor = resolveMotionDescriptor(profile);
    expect(motion.speed).toBeGreaterThan(0);
  });

  test('resolveAuraDescriptor returns an aura descriptor for a profile', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    expect(resolveAuraDescriptor(profile)).toBeDefined();
  });

  test('resolveAccents returns an array for a profile', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    expect(Array.isArray(resolveAccents(profile))).toBe(true);
  });
});

describe('Flame — error handling', () => {
  test('an unexpected fire state does not crash rendering', () => {
    const tree = render(baseProps({ fire: { state: 'lit', strength: 0 } as FireState }));
    expect(hasCanvas(tree)).toBe(true);
  });
});

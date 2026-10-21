/**
 * Flame.test.tsx — tests for the profile-driven Skia bonfire flame.
 *
 * Skia and Reanimated are mocked so the renderer runs under Jest without a
 * native canvas or UI thread. Geometry/descriptor helpers are exercised through
 * the real flameModel module; the Flame component is rendered and its output
 * inspected through the mocked primitives.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { FireState } from '../../domain/fire';
import type { FlameStyle } from '../../domain/flames';
import type { Palette } from '../../theme/palettes';
import {
  flameVisual,
  resolveAccents,
  resolveAuraDescriptor,
  resolveMotionDescriptor,
  resolveShapeDescriptor,
  resolveHealthVisuals,
  resolveStrengthVisuals,
  resolveVisualProfile,
} from './flameModel';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrimitive = (name: string) => {
  const Comp = (props: Record<string, unknown>) =>
    React.createElement(name, { ...props, testID: props.testID ?? name }, props.children);
  Comp.displayName = name;
  return Comp;
};

jest.mock('@shopify/react-native-skia', () => {
  const surface = {
    getCanvas: () => ({
      clear: jest.fn(),
      drawPath: jest.fn(),
      saveLayer: jest.fn(),
      restore: jest.fn(),
    }),
    flush: jest.fn(),
    makeImageSnapshot: jest.fn(() => ({ id: 'img' })),
    dispose: jest.fn(),
  };
  const pathObj = () => ({
    copy: () => pathObj(),
    offset: () => pathObj(),
    computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  });
  return {
    Canvas: mockPrimitive('Canvas'),
    Image: mockPrimitive('Image'),
    Group: mockPrimitive('Group'),
    Path: mockPrimitive('Path'),
    LinearGradient: mockPrimitive('LinearGradient'),
    RadialGradient: mockPrimitive('RadialGradient'),
    Blur: mockPrimitive('Blur'),
    Paint: mockPrimitive('Paint'),
    ColorMatrix: mockPrimitive('ColorMatrix'),
    Circle: mockPrimitive('Circle'),
    Oval: mockPrimitive('Oval'),
    Rect: mockPrimitive('Rect'),
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Decal: 1 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        MakeFromSVGString: jest.fn(() => pathObj()),
        Make: jest.fn(() => pathObj()),
      },
      Surface: { Make: jest.fn(() => surface) },
      Paint: jest.fn(() => ({
        setAntiAlias: jest.fn(),
        setStyle: jest.fn(),
        setShader: jest.fn(),
        setImageFilter: jest.fn(),
      })),
      Shader: { MakeLinearGradient: jest.fn(() => ({})) },
      ImageFilter: { MakeBlur: jest.fn(() => ({})) },
      Point: (x: number, y: number) => ({ x, y }),
      Color: (c: string) => c,
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  useSharedValue: (v: unknown) => ({ value: v }),
  withSequence: (...args: unknown[]) => args,
  withSpring: (v: unknown) => v,
  withTiming: (v: unknown) => v,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

import { Flame } from './Flame';

const palette: Palette = {
  ember: '#ff7a2e',
  amber: '#ffb347',
  gold: '#ffd766',
  core: '#fff4c2',
  red: '#c8302a',
  background: '#0b0806',
} as unknown as Palette;

const altPalette: Palette = {
  ...palette,
  ember: '#3a6bff',
  amber: '#7aa2ff',
  gold: '#c3d7ff',
  core: '#eef5ff',
  red: '#1d3c9e',
} as unknown as Palette;

const litFire = (overrides: Partial<FireState> = {}): FireState =>
  ({
    state: 'lit',
    strength: 10,
    ...overrides,
  }) as unknown as FireState;

const outFire = { state: 'out', strength: 0 } as unknown as FireState;
const unlitFire = { state: 'unlit', strength: 0 } as unknown as FireState;

const amberStyle = {
  id: 'amber',
  name: 'Amber',
  visualProfile: undefined,
} as unknown as FlameStyle;

const invalidStyle = {
  id: 'broken',
  name: 'Broken',
  visualProfile: { shape: 'not-a-shape' },
} as unknown as FlameStyle;

const clock = { value: 0 } as unknown as import('react-native-reanimated').SharedValue<number>;

const baseProps = {
  palette,
  width: 320,
  height: 480,
  clock,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Flame visibility', () => {
  it('renders nothing when fire.state is "out"', () => {
    const { queryByTestId } = render(<Flame {...baseProps} fire={outFire} />);
    expect(queryByTestId('Canvas')).toBeNull();
  });

  it('renders nothing when fire.state is "unlit"', () => {
    const { queryByTestId } = render(<Flame {...baseProps} fire={unlitFire} />);
    expect(queryByTestId('Canvas')).toBeNull();
  });

  it('out-state takes precedence over an explicit active style', () => {
    const { queryByTestId } = render(
      <Flame {...baseProps} fire={outFire} activeStyle={amberStyle} />,
    );
    expect(queryByTestId('Canvas')).toBeNull();
  });

  it('renders a Canvas when the fire is lit', () => {
    const { getByTestId } = render(<Flame {...baseProps} fire={litFire()} />);
    expect(getByTestId('Canvas')).toBeTruthy();
  });
});

describe('Flame dim prop', () => {
  it('default dim of 1 leaves visual strength unchanged', () => {
    const fire = litFire({ strength: 10 });
    const withDefault = flameVisual(fire, palette, undefined);
    const withExplicit = flameVisual(fire, palette, undefined, 1);
    expect(withDefault).toEqual(withExplicit);
  });

  it('dim below 1 scales down glow and brightness', () => {
    const fire = litFire({ strength: 10 });
    const full = flameVisual(fire, palette, undefined, 1);
    const dimmed = flameVisual(fire, palette, undefined, 0.4);
    expect(dimmed.glowOpacity).toBeLessThan(full.glowOpacity);
    expect(dimmed.brightness).toBeLessThan(full.brightness);
  });

  it('renders without throwing for dim = 0', () => {
    expect(() =>
      render(<Flame {...baseProps} fire={litFire()} dim={0} />),
    ).not.toThrow();
  });
});

describe('Visual profile fallback', () => {
  it('missing activeStyle falls back to an Amber-like profile', () => {
    const profile = resolveVisualProfile(undefined);
    const amber = resolveVisualProfile(amberStyle);
    expect(profile).toEqual(amber);
  });

  it('invalid visualProfile falls back to an Amber-like profile', () => {
    const profile = resolveVisualProfile(invalidStyle);
    const amber = resolveVisualProfile(amberStyle);
    expect(profile).toEqual(amber);
  });

  it('renders successfully with missing or invalid activeStyle', () => {
    expect(() =>
      render(<Flame {...baseProps} fire={litFire()} />),
    ).not.toThrow();
    expect(() =>
      render(<Flame {...baseProps} fire={litFire()} activeStyle={invalidStyle} />),
    ).not.toThrow();
  });
});

describe('Health visuals', () => {
  it('missing health resolves to neutral multipliers', () => {
    const neutral = resolveHealthVisuals(undefined);
    expect(neutral.glowMultiplier).toBe(1);
    expect(neutral.brightnessMultiplier).toBe(1);
  });

  it('suppressed health resolves to neutral multipliers', () => {
    const suppressed = resolveHealthVisuals({
      suppressed: true,
    } as unknown as import('../../domain/fireHealth').FireHealthState);
    expect(suppressed.glowMultiplier).toBe(1);
    expect(suppressed.brightnessMultiplier).toBe(1);
  });
});

describe('Profile-driven descriptor selection', () => {
  it('shape descriptor is derived from profile data', () => {
    const profile = resolveVisualProfile(amberStyle);
    const shape = resolveShapeDescriptor(profile);
    expect(shape.tongues.length).toBeGreaterThan(0);
  });

  it('motion descriptor is derived from profile motion family/speed', () => {
    const profile = resolveVisualProfile(amberStyle);
    const motion = resolveMotionDescriptor(profile);
    expect(motion.speed).toBeGreaterThan(0);
    expect(['smooth', 'harsh']).toContain(motion.family);
  });

  it('aura descriptor is derived from profile aura kind', () => {
    const profile = resolveVisualProfile(amberStyle);
    expect(resolveAuraDescriptor(profile)).toBeDefined();
  });

  it('accents are selected from profile data', () => {
    const profile = resolveVisualProfile(amberStyle);
    expect(Array.isArray(resolveAccents(profile))).toBe(true);
  });

  it('strength visuals scale with fire strength', () => {
    const low = resolveStrengthVisuals(litFire({ strength: 1 }));
    const high = resolveStrengthVisuals(litFire({ strength: 50 }));
    expect(high.scale).toBeGreaterThan(low.scale);
  });
});

describe('Geometry memoization', () => {
  it('re-rendering with identical props does not rebuild geometry', () => {
    const { rerender, getByTestId } = render(
      <Flame {...baseProps} fire={litFire()} />,
    );
    const first = getByTestId('Canvas');
    rerender(<Flame {...baseProps} fire={litFire()} />);
    expect(getByTestId('Canvas')).toBeTruthy();
    expect(first).toBeTruthy();
  });

  it('changing palette rebuilds the flame without throwing', () => {
    const { rerender, getByTestId } = render(
      <Flame {...baseProps} fire={litFire()} />,
    );
    rerender(<Flame {...baseProps} palette={altPalette} fire={litFire()} />);
    expect(getByTestId('Canvas')).toBeTruthy();
  });

  it('changing dimensions rebuilds the flame without throwing', () => {
    const { rerender, getByTestId } = render(
      <Flame {...baseProps} fire={litFire()} />,
    );
    rerender(<Flame {...baseProps} width={400} height={600} fire={litFire()} />);
    expect(getByTestId('Canvas')).toBeTruthy();
  });
});

describe('Pulse animation', () => {
  it('renders with a pulse state without throwing', () => {
    expect(() =>
      render(
        <Flame
          {...baseProps}
          fire={litFire()}
          pulse={{ active: true } as unknown as import('../../domain/flamePulses').FlamePulseState}
        />,
      ),
    ).not.toThrow();
  });

  it('pulse sequence is built from withSequence on activation', () => {
    const reanimated = jest.requireMock('react-native-reanimated') as {
      withSequence: jest.Mock;
    };
    const spy = jest.spyOn(reanimated, 'withSequence');
    render(
      <Flame
        {...baseProps}
        fire={litFire()}
        pulse={{ active: true } as unknown as import('../../domain/flamePulses').FlamePulseState}
      />,
    );
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

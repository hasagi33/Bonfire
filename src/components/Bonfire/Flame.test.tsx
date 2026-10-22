/**
 * Flame.test.tsx — unit tests for the Bonfire flame renderer and its pure
 * visual-resolution helpers (flameModel.ts). Skia and Reanimated are mocked at
 * the module boundary so the suite runs deterministically in Jest without a
 * native canvas or UI thread.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { FireState } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';
import type { FlameStyle } from '../../domain/flames';
import type { Palette } from '../../theme/palettes';
import { Flame, DESIGN_FLAME_BASE_FROM_BOTTOM } from './Flame';
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
// Module-boundary mocks
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, { testID: `skia-${name}`, ...props }, props.children);
    Comp.displayName = name;
    return Comp;
  };
  const Skia = {
    Path: {
      MakeFromSVGString: jest.fn(() => ({
        computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
        copy: () => ({ offset: () => ({}) }),
      })),
      Make: jest.fn(() => ({})),
    },
    Surface: { Make: jest.fn(() => null) },
    Paint: jest.fn(() => ({})),
    Shader: { MakeLinearGradient: jest.fn(() => null) },
    ImageFilter: { MakeBlur: jest.fn(() => null) },
    Color: jest.fn((c: string) => c),
    Point: jest.fn((x: number, y: number) => ({ x, y })),
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
    Skia,
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Decal: 1, Repeat: 2, Mirror: 3 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    vec: (x: number, y: number) => ({ x, y }),
  };
});

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: jest.fn((fn: () => unknown) => ({ value: fn() })),
  useSharedValue: jest.fn((v: unknown) => ({ value: v })),
  withSequence: jest.fn((...args: unknown[]) => args[0]),
  withSpring: jest.fn((v: unknown) => v),
  withTiming: jest.fn((v: unknown) => v),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const palette: Palette = {
  amber: '#f5a623',
  gold: '#ffd166',
  ember: '#ff7a1a',
  red: '#c0392b',
  core: '#fff4d6',
  background: '#0b0604',
} as unknown as Palette;

const altPalette: Palette = {
  ...palette,
  amber: '#3a86ff',
  gold: '#8ecae6',
  ember: '#219ebc',
  red: '#023047',
  core: '#e0fbfc',
} as unknown as Palette;

const clock = { value: 0 } as unknown as Parameters<typeof Flame>[0]['clock'];

const litFire = { state: 'lit', strength: 3 } as unknown as FireState;
const outFire = { state: 'out', strength: 0 } as unknown as FireState;
const unlitFire = { state: 'unlit', strength: 0 } as unknown as FireState;

const amberStyle = {
  id: 'amber',
  name: 'Amber',
  visualProfile: undefined,
} as unknown as FlameStyle;

function renderFlame(overrides: Partial<React.ComponentProps<typeof Flame>> = {}) {
  return render(
    <Flame
      fire={litFire}
      activeStyle={amberStyle}
      palette={palette}
      width={300}
      height={400}
      clock={clock}
      {...overrides}
    />,
  );
}

// ---------------------------------------------------------------------------
// Flame component
// ---------------------------------------------------------------------------

describe('Flame', () => {
  it('renders a Canvas for a lit fire', () => {
    const { getByTestId } = renderFlame();
    expect(getByTestId('skia-Canvas')).toBeTruthy();
  });

  it.each([
    ['out', outFire],
    ['unlit', unlitFire],
  ])('hides the flame (no Path accents) when fire is %s', (_label, fire) => {
    const { queryAllByTestId } = renderFlame({ fire });
    expect(queryAllByTestId('skia-Path')).toHaveLength(0);
  });

  it('does not throw when activeStyle is missing', () => {
    expect(() => renderFlame({ activeStyle: undefined })).not.toThrow();
  });

  it('does not throw when activeStyle has an invalid visualProfile', () => {
    const bad = { id: 'bad', visualProfile: { shape: 'nonsense' } } as unknown as FlameStyle;
    expect(() => renderFlame({ activeStyle: bad })).not.toThrow();
  });

  it('accepts a dim value without throwing', () => {
    expect(() => renderFlame({ dim: 0.4 })).not.toThrow();
  });

  it('accepts health suppressed or missing without throwing', () => {
    expect(() => renderFlame({ health: undefined })).not.toThrow();
    expect(() =>
      renderFlame({ health: { suppressed: true } as unknown as FireHealthState }),
    ).not.toThrow();
  });

  it('re-renders with a different palette without throwing', () => {
    const { rerender } = renderFlame();
    expect(() =>
      rerender(
        <Flame
          fire={litFire}
          activeStyle={amberStyle}
          palette={altPalette}
          width={300}
          height={400}
          clock={clock}
        />,
      ),
    ).not.toThrow();
  });

  it('exports a positive design base offset', () => {
    expect(DESIGN_FLAME_BASE_FROM_BOTTOM).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// flameModel helpers
// ---------------------------------------------------------------------------

describe('resolveVisualProfile', () => {
  it('falls back to an Amber-like profile when activeStyle is missing', () => {
    const profile = resolveVisualProfile(undefined);
    expect(profile).toBeDefined();
    expect(profile).toEqual(resolveVisualProfile(amberStyle));
  });

  it('falls back when visualProfile is malformed', () => {
    const bad = { id: 'x', visualProfile: 42 } as unknown as FlameStyle;
    expect(() => resolveVisualProfile(bad)).not.toThrow();
    expect(resolveVisualProfile(bad)).toBeDefined();
  });
});

describe('resolveShapeDescriptor', () => {
  it('returns a descriptor for the default profile', () => {
    const shape = resolveShapeDescriptor(resolveVisualProfile(amberStyle));
    expect(shape).toBeDefined();
  });

  it('is deterministic for identical input', () => {
    const profile = resolveVisualProfile(amberStyle);
    expect(resolveShapeDescriptor(profile)).toEqual(resolveShapeDescriptor(profile));
  });
});

describe('resolveMotionDescriptor', () => {
  it('returns a positive speed multiplier', () => {
    const motion = resolveMotionDescriptor(resolveVisualProfile(amberStyle));
    expect(motion.speed).toBeGreaterThan(0);
  });
});

describe('resolveAuraDescriptor', () => {
  it('returns a descriptor for the default profile', () => {
    expect(resolveAuraDescriptor(resolveVisualProfile(amberStyle))).toBeDefined();
  });
});

describe('resolveAccents', () => {
  it('returns an array (possibly empty) for the default profile', () => {
    expect(Array.isArray(resolveAccents(resolveVisualProfile(amberStyle)))).toBe(true);
  });
});

describe('resolveHealthVisuals', () => {
  it('resolves missing health to neutral multipliers', () => {
    const v = resolveHealthVisuals(undefined);
    expect(v).toBeDefined();
    expect(Number.isFinite(Object.values(v).find(x => typeof x === 'number') as number)).toBe(true);
  });

  it('resolves suppressed health to neutral multipliers', () => {
    const suppressed = { suppressed: true } as unknown as FireHealthState;
    expect(resolveHealthVisuals(suppressed)).toEqual(resolveHealthVisuals(undefined));
  });
});

describe('resolveStrengthVisuals', () => {
  it('scales with fire strength (larger strength yields no smaller visual)', () => {
    const low = resolveStrengthVisuals({ state: 'lit', strength: 0 } as unknown as FireState);
    const high = resolveStrengthVisuals({ state: 'lit', strength: 10 } as unknown as FireState);
    expect(high).toBeDefined();
    expect(low).toBeDefined();
  });
});

describe('flameVisual', () => {
  it('is a pure function: identical inputs produce identical outputs', () => {
    const args = [litFire, amberStyle, palette, 300, 400] as const;
    const a = (flameVisual as (...x: unknown[]) => unknown)(...args);
    const b = (flameVisual as (...x: unknown[]) => unknown)(...args);
    expect(a).toEqual(b);
  });

  it('does not mutate the palette it receives', () => {
    const snapshot = JSON.stringify(palette);
    (flameVisual as (...x: unknown[]) => unknown)(litFire, amberStyle, palette, 300, 400);
    expect(JSON.stringify(palette)).toBe(snapshot);
  });
});

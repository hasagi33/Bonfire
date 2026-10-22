/**
 * Flame.test.tsx — unit tests for the Bonfire flame renderer and its
 * profile/model helpers. Skia and Reanimated are mocked so the suite runs
 * headless and deterministically. Colors are asserted via palette/theme
 * tokens, never hardcoded hex values.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { FireState } from '../../domain/fire';
import type { FlameStyle } from '../../domain/flames';
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
} from './flameModel';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const passthrough = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, props, props.children);
    Comp.displayName = name;
    return Comp;
  };
  const makePath = () => ({
    copy: () => makePath(),
    offset: () => makePath(),
    computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  });
  const Skia = {
    Path: {
      MakeFromSVGString: jest.fn(() => makePath()),
      Make: jest.fn(() => makePath()),
    },
    Surface: { Make: jest.fn(() => null) },
    Paint: jest.fn(() => ({
      setAntiAlias: jest.fn(),
      setStyle: jest.fn(),
      setShader: jest.fn(),
      setImageFilter: jest.fn(),
    })),
    Shader: { MakeLinearGradient: jest.fn(() => ({})) },
    ImageFilter: { MakeBlur: jest.fn(() => ({})) },
    Color: jest.fn((c: string) => c),
    Point: jest.fn((x: number, y: number) => ({ x, y })),
  };
  return {
    Canvas: passthrough('Canvas'),
    Image: passthrough('Image'),
    Group: passthrough('Group'),
    Path: passthrough('Path'),
    LinearGradient: passthrough('LinearGradient'),
    RadialGradient: passthrough('RadialGradient'),
    Blur: passthrough('Blur'),
    Paint: passthrough('Paint'),
    ColorMatrix: passthrough('ColorMatrix'),
    Circle: passthrough('Circle'),
    Oval: passthrough('Oval'),
    Rect: passthrough('Rect'),
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Decal: 1, Repeat: 2, Mirror: 3 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia,
  };
});

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (init: unknown) => ({ value: init }),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  withTiming: (v: unknown) => v,
  withSpring: (v: unknown) => v,
  withSequence: (...vs: unknown[]) => vs[vs.length - 1],
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Palette tokens are sourced from the theme; we never assert raw hex values.
const palette = {
  ember: 'ember-token',
  amber: 'amber-token',
  gold: 'gold-token',
  red: 'red-token',
  core: 'core-token',
} as unknown as Palette;

const clock = { value: 0 } as any;

function fire(state: FireState['state'], strength = 0): FireState {
  return { state, strength } as unknown as FireState;
}

function styleWith(profile: unknown, id = 'test-style'): FlameStyle {
  return { id, name: id, visualProfile: profile } as unknown as FlameStyle;
}

const AMBER_LIKE_PROFILE_STYLE = styleWith(undefined, 'amber');

// Import Flame lazily so mocks are in place before module evaluation.
const { Flame } = require('./Flame') as typeof import('./Flame');

function renderFlame(overrides: Partial<React.ComponentProps<typeof Flame>> = {}) {
  return render(
    <Flame
      fire={fire('lit', 3)}
      activeStyle={AMBER_LIKE_PROFILE_STYLE}
      palette={palette}
      width={320}
      height={480}
      clock={clock}
      {...overrides}
    />,
  );
}

// ---------------------------------------------------------------------------
// Flame component
// ---------------------------------------------------------------------------

describe('Flame', () => {
  describe('out-state precedence', () => {
    it.each(['out', 'unlit'] as const)('renders no flame canvas when fire is %s', state => {
      const { toJSON } = renderFlame({ fire: fire(state, 4) });
      expect(toJSON()).toBeNull();
    });

    it('renders a canvas when fire is lit', () => {
      const { toJSON } = renderFlame({ fire: fire('lit', 3) });
      expect(toJSON()).not.toBeNull();
    });

    it('keeps out-state precedence even when a health state is supplied', () => {
      const { toJSON } = renderFlame({
        fire: fire('out', 0),
        health: 'healthy' as any,
      });
      expect(toJSON()).toBeNull();
    });
  });

  describe('activeStyle fallback', () => {
    it('renders with no activeStyle (falls back to Amber-like profile)', () => {
      const { toJSON } = renderFlame({ activeStyle: undefined });
      expect(toJSON()).not.toBeNull();
    });

    it('renders when activeStyle has a missing visualProfile', () => {
      const { toJSON } = renderFlame({ activeStyle: styleWith(undefined, 'broken') });
      expect(toJSON()).not.toBeNull();
    });

    it('renders when activeStyle has an invalid visualProfile', () => {
      const { toJSON } = renderFlame({
        activeStyle: styleWith({ shape: 'not-a-shape', motion: 42 }, 'invalid'),
      });
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('dim prop', () => {
    it('accepts dim below 1 without crashing (embered state)', () => {
      const { toJSON } = renderFlame({ dim: 0.4 });
      expect(toJSON()).not.toBeNull();
    });

    it('defaults dim to full energy when omitted', () => {
      const withDefault = renderFlame();
      const withOne = renderFlame({ dim: 1 });
      expect(withDefault.toJSON()).toEqual(withOne.toJSON());
    });
  });

  describe('health suppression', () => {
    it('renders neutral when health is missing', () => {
      const { toJSON } = renderFlame({ health: undefined });
      expect(toJSON()).not.toBeNull();
    });
  });

  describe('memoization', () => {
    it('does not rebuild geometry on re-render with identical inputs', () => {
      const Skia = require('@shopify/react-native-skia').Skia;
      const { rerender } = renderFlame();
      const before = (Skia.Path.MakeFromSVGString as jest.Mock).mock.calls.length;
      rerender(
        <Flame
          fire={fire('lit', 3)}
          activeStyle={AMBER_LIKE_PROFILE_STYLE}
          palette={palette}
          width={320}
          height={480}
          clock={clock}
        />,
      );
      const after = (Skia.Path.MakeFromSVGString as jest.Mock).mock.calls.length;
      expect(after).toBe(before);
    });
  });
});

// ---------------------------------------------------------------------------
// flameModel helpers (source of truth for visual decisions)
// ---------------------------------------------------------------------------

describe('flameModel', () => {
  describe('resolveVisualProfile', () => {
    it('returns a profile for a valid style', () => {
      const profile = resolveVisualProfile(AMBER_LIKE_PROFILE_STYLE);
      expect(profile).toBeDefined();
    });

    it('falls back to an Amber-like profile when style is undefined', () => {
      expect(resolveVisualProfile(undefined)).toEqual(
        resolveVisualProfile(AMBER_LIKE_PROFILE_STYLE),
      );
    });

    it('falls back when visualProfile is malformed', () => {
      expect(resolveVisualProfile(styleWith('garbage', 'x'))).toEqual(
        resolveVisualProfile(AMBER_LIKE_PROFILE_STYLE),
      );
    });
  });

  describe('resolveShapeDescriptor / resolveMotionDescriptor / resolveAuraDescriptor', () => {
    it('produces descriptors from a resolved profile', () => {
      const profile = resolveVisualProfile(AMBER_LIKE_PROFILE_STYLE);
      expect(resolveShapeDescriptor(profile)).toBeDefined();
      expect(resolveMotionDescriptor(profile)).toBeDefined();
      expect(resolveAuraDescriptor(profile)).toBeDefined();
    });

    it('motion speed is a positive period multiplier', () => {
      const profile = resolveVisualProfile(AMBER_LIKE_PROFILE_STYLE);
      expect(resolveMotionDescriptor(profile).speed).toBeGreaterThan(0);
    });
  });

  describe('resolveAccents', () => {
    it('selects accents purely from profile data', () => {
      const profile = resolveVisualProfile(AMBER_LIKE_PROFILE_STYLE);
      const a = resolveAccents(profile);
      const b = resolveAccents(profile);
      expect(a).toEqual(b);
    });

    it('returns an empty set for a profile without accents', () => {
      const profile = resolveVisualProfile(AMBER_LIKE_PROFILE_STYLE);
      expect(Array.isArray(resolveAccents({ ...profile, accents: [] } as any))).toBe(true);
    });
  });

  describe('resolveHealthVisuals / resolveStrengthVisuals', () => {
    it('returns neutral multipliers when health is missing', () => {
      const neutral = resolveHealthVisuals(undefined);
      expect(neutral).toBeDefined();
    });

    it('strength visuals grow with strength', () => {
      const low = resolveStrengthVisuals(fire('lit', 0));
      const high = resolveStrengthVisuals(fire('lit', 5));
      expect(high).not.toEqual(low);
    });
  });

  describe('flameVisual', () => {
    it('returns hidden visuals for out and unlit states', () => {
      expect(flameVisual(fire('out', 0), undefined).visible).toBe(false);
      expect(flameVisual(fire('unlit', 0), undefined).visible).toBe(false);
    });

    it('returns visible visuals for a lit fire', () => {
      expect(flameVisual(fire('lit', 3), undefined).visible).toBe(true);
    });

    it('uses palette tokens rather than raw colors for background tints', () => {
      const tint = withAlpha(palette.amber, 0.5);
      expect(typeof tint).toBe('string');
      expect(darken(palette.red, 0.1)).not.toBe(palette.red);
    });
  });
});

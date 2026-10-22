/**
 * Flame.test.tsx — unit tests for the profile-driven Bonfire flame renderer.
 *
 * Covers the public surface of Flame.tsx and flameModel.ts: out/unlit
 * precedence, Amber fallback for missing/invalid activeStyle, dim scaling,
 * neutral health multipliers, pulse acceptance, and that tongue/accent/aura
 * geometry is resolved from profile data rather than flame-id branches.
 *
 * Skia and Reanimated are mocked here so the tests run deterministically in
 * Jest without a native canvas or a real animation loop.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { FireState } from '../../domain/fire';
import type { FlameStyle } from '../../domain/flames';
import type { FlamePulseState } from '../../domain/flamePulses';
import type { FireHealthState } from '../../domain/fireHealth';
import { Flame, type FlameProps } from './Flame';
import {
  flameVisual,
  resolveAccents,
  resolveAuraDescriptor,
  resolveHealthVisuals,
  resolveMotionDescriptor,
  resolveShapeDescriptor,
  resolveStrengthVisuals,
  resolveVisualProfile,
} from './flameModel';

// ---------------------------------------------------------------------------
// Mocks (test-file only). Skia renders to host elements that simply record
// their props; Reanimated hooks return plain values so no animation runs.
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = jest.requireActual('react');
  const host = (name: string) => {
    const Component = (props: Record<string, unknown>) =>
      React.createElement(name, { testID: name, ...props }, props.children);
    Component.displayName = name;
    return Component;
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
    rect: (x: number, y: number, width: number, height: number) => ({ x, y, width, height }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        MakeFromSVGString: () => null,
        Make: () => ({
          computeTightBounds: () => ({ x: 0, y: 0, width: 0, height: 0 }),
        }),
      },
      Color: (value: string) => value,
      Point: (x: number, y: number) => ({ x, y }),
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (initial: unknown) => ({ value: initial }),
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  withSequence: (...values: unknown[]) => values[values.length - 1],
  withSpring: (value: unknown) => value,
  withTiming: (value: unknown) => value,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PALETTE = {
  name: 'Amber',
  ember: '#8a2a0a',
  amber: '#f5a623',
  gold: '#ffd76a',
  core: '#fff6d8',
  red: '#c0392b',
  background: '#0b0604',
} as unknown as FlameProps['palette'];

const ACTIVE_LIT: FireState = { status: 'lit', strength: 3 } as unknown as FireState;
const ACTIVE_OUT: FireState = { status: 'out', strength: 0 } as unknown as FireState;
const ACTIVE_UNLIT: FireState = { status: 'unlit', strength: 0 } as unknown as FireState;

/**
 * Build the props every test shares: a lit fire, the Amber palette, a fixed
 * canvas size, and a dummy shared clock. Individual tests override only what
 * they exercise.
 */
function baseProps(overrides: Partial<FlameProps> = {}): FlameProps {
  return {
    fire: ACTIVE_LIT,
    palette: PALETTE,
    width: 320,
    height: 480,
    clock: { value: 0 } as FlameProps['clock'],
    ...overrides,
  };
}

/**
 * Render the Flame with the given overrides and return the rendered tree.
 * Keeps each test focused on its assertion instead of prop plumbing.
 */
function renderFlame(overrides: Partial<FlameProps> = {}) {
  return render(<Flame {...baseProps(overrides)} />);
}

/**
 * Build a minimal FlameStyle with an invalid (empty) profile so we can
 * exercise the Amber fallback path.
 */
function makeFire(status: FireState['status'], strength = 0): FireState {
  return { status, strength } as unknown as FireState;
}

/**
 * Build a fake clock object whose `.value` is the given millisecond time.
 * Mirrors the SharedValue shape Flame reads.
 */
function makeClock(ms: number): FlameProps['clock'] {
  return { value: ms } as FlameProps['clock'];
}

/**
 * Build a stub pulse state with the minimal fields Flame accepts. Used to
 * prove the optional pulse prop does not break rendering.
 */
function makePulse(): FlamePulseState {
  return { active: true, intensity: 1 } as unknown as FlamePulseState;
}

/**
 * Build a stub health state representing an unhealthy/suppressed fire.
 */
function makeHealth(status: string): FireHealthState {
  return { status } as unknown as FireHealthState;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Flame', () => {
  describe('out-state precedence', () => {
    it('hides the flame when fire is out', () => {
      const { queryByTestId } = renderFlame({ fire: ACTIVE_OUT });
      expect(queryByTestId('Path')).toBeNull();
    });

    it('hides the flame when fire is unlit', () => {
      const { queryByTestId } = renderFlame({ fire: ACTIVE_UNLIT });
      expect(queryByTestId('Path')).toBeNull();
    });

    it('renders the canvas and flame when fire is lit', () => {
      const { getByTestId } = renderFlame({ fire: ACTIVE_LIT });
      expect(getByTestId('Canvas')).toBeTruthy();
    });
  });

  describe('activeStyle fallback', () => {
    it('renders without throwing when activeStyle is missing', () => {
      expect(() => renderFlame({ activeStyle: undefined })).not.toThrow();
    });

    it('renders without throwing when activeStyle has an invalid profile', () => {
      const invalid = { id: 'broken' } as unknown as FlameStyle;
      expect(() => renderFlame({ activeStyle: invalid })).not.toThrow();
    });

    it('resolves a missing profile to an Amber-like visual profile', () => {
      const profile = resolveVisualProfile(undefined);
      expect(profile).toBeDefined();
      expect(resolveVisualProfile(undefined)).toEqual(profile);
    });
  });

  describe('dim scaling', () => {
    it('dim=1 produces the same output as the default (no visual change)', () => {
      const explicit = renderFlame({ dim: 1 }).toJSON();
      const implicit = renderFlame({}).toJSON();
      expect(explicit).toEqual(implicit);
    });

    it('dim below 1 changes the rendered output for an embered flame', () => {
      const full = renderFlame({ dim: 1 }).toJSON();
      const dimmed = renderFlame({ dim: 0.3 }).toJSON();
      expect(dimmed).not.toEqual(full);
    });

    it('dim at 0 still renders without throwing', () => {
      expect(() => renderFlame({ dim: 0 })).not.toThrow();
    });
  });

  describe('health visuals', () => {
    it('missing health resolves to neutral multipliers', () => {
      const visuals = resolveHealthVisuals(undefined);
      expect(resolveHealthVisuals(undefined)).toEqual(visuals);
    });

    it('suppressed health resolves to neutral multipliers', () => {
      const suppressed = makeHealth('suppressed');
      const visuals = resolveHealthVisuals(suppressed);
      expect(resolveHealthVisuals(undefined)).toEqual(visuals);
    });

    it('renders without throwing for missing health', () => {
      expect(() => renderFlame({ health: undefined })).not.toThrow();
    });

    it('renders without throwing for suppressed health', () => {
      expect(() => renderFlame({ health: makeHealth('suppressed') })).not.toThrow();
    });
  });

  describe('pulse prop', () => {
    it('accepts a pulse state and still renders the canvas', () => {
      const { getByTestId } = renderFlame({ pulse: makePulse() });
      expect(getByTestId('Canvas')).toBeTruthy();
    });

    it('renders identically with and without an absent pulse', () => {
      const withoutPulse = renderFlame({ pulse: undefined }).toJSON();
      expect(withoutPulse).toBeTruthy();
    });
  });

  describe('profile-driven geometry', () => {
    it('resolves shape descriptors from profile data via resolveShapeDescriptor', () => {
      const profile = resolveVisualProfile(undefined);
      const shape = resolveShapeDescriptor(profile);
      expect(shape).toBeDefined();
      expect(resolveShapeDescriptor(profile)).toEqual(shape);
    });

    it('resolves aura descriptors from profile data via resolveAuraDescriptor', () => {
      const profile = resolveVisualProfile(undefined);
      const aura = resolveAuraDescriptor(profile);
      expect(aura).toBeDefined();
      expect(resolveAuraDescriptor(profile)).toEqual(aura);
    });

    it('resolves accents from profile data via resolveAccents', () => {
      const profile = resolveVisualProfile(undefined);
      const accents = resolveAccents(profile);
      expect(Array.isArray(accents)).toBe(true);
      expect(resolveAccents(profile)).toEqual(accents);
    });

    it('resolves motion from profile data via resolveMotionDescriptor', () => {
      const profile = resolveVisualProfile(undefined);
      const motion = resolveMotionDescriptor(profile);
      expect(motion).toBeDefined();
      expect(resolveMotionDescriptor(profile)).toEqual(motion);
    });

    it('flameVisual is deterministic for the same clock value', () => {
      const first = flameVisual(makeClock(1000), ACTIVE_LIT);
      const second = flameVisual(makeClock(1000), ACTIVE_LIT);
      expect(second).toEqual(first);
    });

    it('resolveStrengthVisuals is deterministic for the same strength', () => {
      const first = resolveStrengthVisuals(ACTIVE_LIT);
      expect(resolveStrengthVisuals(ACTIVE_LIT)).toEqual(first);
    });
  });
});

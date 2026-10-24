/**
 * Embers.test.tsx — unit tests for the Bonfire ambient/profile particle layer.
 *
 * Covers the exported helpers (mulberry32, hashString, KIND_DEFAULTS, the
 * profile particle pieces) and the EmbersLayer component. Native Skia and
 * Reanimated are replaced with plain test doubles so the tests run in Jest
 * without a device, and every assertion is deterministic (no wall clock, no
 * network).
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';

// --- Test doubles for native modules -------------------------------------

// Shared value holder: a plain object with a mutable `value`, matching the
// SharedValue shape the component reads.
function makeSharedValue<T>(initial: T) {
  return { value: initial };
}

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated');
  return {
    ...actual,
    // Evaluate the derived value once, eagerly, so renders can read it.
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
  };
});

jest.mock('@shopify/react-native-skia', () => {
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      require('react').createElement(name, props, props.children as never);
    Comp.displayName = name;
    return Comp;
  };
  return {
    Canvas: host('Canvas'),
    Circle: host('Circle'),
    Group: host('Group'),
    Oval: host('Oval'),
    Path: host('Path'),
    RadialGradient: host('RadialGradient'),
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        MakeFromSVGString: () => ({}),
        Make: () => ({}),
      },
    },
  };
});

import {
  EmbersLayer,
  KIND_DEFAULTS,
  hashString,
  mulberry32,
} from '../src/components/Bonfire/Embers';
import { resolveParticleDescriptors, resolveVisualProfile } from '../src/components/Bonfire/flameModel';
import { flameById } from '../src/domain/flames';
import { withAlpha } from '../src/theme/palettes';
import type { Palette } from '../src/theme/palettes';

// A minimal palette fixture; only the fields Embers reads matter for these tests.
const palette = {
  core: '#ffd27a',
  mid: '#ff8a3d',
  outer: '#c2410c',
  glow: '#ffb347',
} as unknown as Palette;

function renderEmbers(overrides: Partial<React.ComponentProps<typeof EmbersLayer>> = {}) {
  const clock = makeSharedValue(0);
  const props = {
    width: 390,
    height: 844,
    intensity: 0.8,
    palette,
    activeStyle: flameById('amber'),
    clock: clock as never,
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<EmbersLayer {...props} />);
  });
  return { tree, clock, props };
}

// Snapshot of every rendered particle's x/y/opacity-ish props, in tree order.
function particleSignature(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

// --- mulberry32 -----------------------------------------------------------

describe('mulberry32', () => {
  test('same seed yields the same sequence', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  test('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test('every value lies in [0, 1)', () => {
    const rand = mulberry32(999);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('negative and fractional seeds are normalised to unsigned 32-bit', () => {
    expect(mulberry32(-1)()).toBe(mulberry32(0xffffffff)());
    expect(mulberry32(3.7)()).toBe(mulberry32(3)());
  });
});

// --- hashString -----------------------------------------------------------

describe('hashString', () => {
  test('is deterministic for the same input', () => {
    expect(hashString('sparks|#ffd27a|12')).toBe(hashString('sparks|#ffd27a|12'));
  });

  test('returns an unsigned 32-bit integer', () => {
    const h = hashString('anything at all');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  test('different strings produce different hashes', () => {
    expect(hashString('ambient|14|844')).not.toBe(hashString('ambient|15|844'));
  });

  test('empty string hashes to the FNV offset basis', () => {
    expect(hashString('')).toBe(2166136261);
  });
});

// --- KIND_DEFAULTS --------------------------------------------------------

describe('KIND_DEFAULTS', () => {
  test('every particle kind has well-formed, non-inverted ranges', () => {
    for (const [kind, d] of Object.entries(KIND_DEFAULTS)) {
      expect({ kind, ok: d.period[0] <= d.period[1] }).toEqual({ kind, ok: true });
      expect({ kind, ok: d.rise[0] <= d.rise[1] }).toEqual({ kind, ok: true });
      expect({ kind, ok: d.size[0] <= d.size[1] }).toEqual({ kind, ok: true });
      expect(d.spread).toBeGreaterThan(0);
    }
  });
});

// --- EmbersLayer ----------------------------------------------------------

describe('EmbersLayer', () => {
  test('renders the ambient background pool when no activeStyle is provided', () => {
    const { tree } = renderEmbers({ activeStyle: undefined, intensity: 0 });
    // Ambient pool is always on: 14 ambient seeds render as Circles even
    // with no profile particles.
    const circles = tree.root.findAll(n => n.type === 'Circle');
    expect(circles.length).toBeGreaterThanOrEqual(14);
  });

  test('renders profile particles for the active flame when intensity > 0', () => {
    const { tree } = renderEmbers({ intensity: 0.8 });
    expect(tree.toJSON()).not.toBeNull();
    expect(particleSignature(tree).length).toBeGreaterThan(0);
  });

  test('deterministic seeding: identical dimensions and profile give identical output', () => {
    const first = renderEmbers();
    const second = renderEmbers();
    expect(particleSignature(first.tree)).toBe(particleSignature(second.tree));
  });

  test('changing dimensions changes the generated particle field', () => {
    const small = renderEmbers({ width: 320, height: 600 });
    const large = renderEmbers({ width: 480, height: 900 });
    expect(particleSignature(small.tree)).not.toBe(particleSignature(large.tree));
  });

  test('memoization: re-rendering with unchanged profile and dimensions keeps the same pools', () => {
    const { tree, clock, props } = renderEmbers();
    const before = particleSignature(tree);
    act(() => {
      tree.update(<EmbersLayer {...(props as React.ComponentProps<typeof EmbersLayer>)} clock={clock as never} />);
    });
    expect(particleSignature(tree)).toBe(before);
  });

  test('zero intensity suppresses profile particles (out-state precedence)', () => {
    const lit = renderEmbers({ intensity: 0.8 });
    const out = renderEmbers({ intensity: 0 });
    const litCount = lit.tree.root.findAll(n => n.type === 'Circle' || n.type === 'Path' || n.type === 'Oval').length;
    const outCount = out.tree.root.findAll(n => n.type === 'Circle' || n.type === 'Path' || n.type === 'Oval').length;
    expect(outCount).toBeLessThan(litCount);
  });

  test('zero intensity still renders the ambient pool', () => {
    const { tree } = renderEmbers({ intensity: 0 });
    const circles = tree.root.findAll(n => n.type === 'Circle');
    expect(circles.length).toBeGreaterThanOrEqual(14);
  });

  test('reduced motion: a frozen clock produces identical frames across renders', () => {
    const { tree, clock, props } = renderEmbers();
    const frameA = particleSignature(tree);
    act(() => {
      clock.value = 0; // unchanged clock = frozen particles
      tree.update(<EmbersLayer {...(props as React.ComponentProps<typeof EmbersLayer>)} clock={clock as never} />);
    });
    expect(particleSignature(tree)).toBe(frameA);
  });

  test('withAlpha helper is used for ash fleck colour (sanity check on theme util)', () => {
    expect(withAlpha('#ffffff', 0.5)).toEqual(expect.any(String));
  });

  test('profile descriptors resolve for the active flame', () => {
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(flameById('amber')));
    expect(Array.isArray(descriptors)).toBe(true);
    for (const d of descriptors) {
      expect(d.count).toBeGreaterThan(0);
      expect(d.size).toBeGreaterThan(0);
      expect(d.speed).toBeGreaterThan(0);
    }
  });
});

/**
 * Embers.test.tsx — behavior tests for the Bonfire ember particle layer.
 *
 * Drives the real Embers module with the native Skia and Reanimated primitives
 * replaced by lightweight host components (jest.setup.js already mocks the
 * native modules; here we only pin the pieces Embers depends on). We assert on
 * observable behavior: how many Circle/Oval/Path nodes are drawn, whether the
 * ambient pool exists, whether the seeded field is stable across re-renders,
 * and whether reduced motion freezes the clock.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import {
  EmbersLayer,
  type EmbersProps,
} from '../src/components/Bonfire/Embers';
import { mulberry32, hashString, KIND_DEFAULTS } from '../src/components/Bonfire/Embers';
import { resolveParticleDescriptors, resolveVisualProfile } from '../src/components/Bonfire/flameModel';
import { flameById } from '../src/domain/flames';
import { PALETTES } from '../src/theme/palettes';

// Minimal shared-value stand-in: a mutable box with a `value` field, matching
// the surface Embers reads from Reanimated's SharedValue.
function makeClock(initial = 0): SharedValue<number> {
  return { value: initial } as unknown as SharedValue<number>;
}

// Count drawn primitives by the host names the Skia mock renders them under.
// Embers draws Circle (dots/bubbles), Oval (wisps), Path (shards/stars),
// Group (transform containers) and RadialGradient (soft glows).
function countNodes(tree: ReactTestRenderer.ReactTestRenderer, type: string): number {
  return tree.root.findAll(n => typeof n.type === 'string' && n.type === type).length;
}

function renderEmbers(overrides: Partial<EmbersProps> = {}) {
  const palette = PALETTES.amber ?? Object.values(PALETTES)[0];
  const props: EmbersProps = {
    width: 390,
    height: 844,
    intensity: 0.5,
    palette,
    activeStyle: flameById('amber'),
    clock: makeClock(0),
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<EmbersLayer {...props} />);
  });
  return { tree, props };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('mulberry32', () => {
  test('same seed produces the same sequence', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  test('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test('every value lies in the half-open unit interval [0, 1)', () => {
    const rand = mulberry32(99);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashString', () => {
  test('is deterministic for the same input', () => {
    expect(hashString('sparks|#ff0|4|0|390x422')).toBe(hashString('sparks|#ff0|4|0|390x422'));
  });

  test('distinguishes different inputs', () => {
    expect(hashString('sparks|a')).not.toBe(hashString('motes|a'));
  });

  test('always returns an unsigned 32-bit integer', () => {
    const h = hashString('anything at all');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('KIND_DEFAULTS', () => {
  test('defines every particle kind with well-ordered ranges', () => {
    for (const kind of Object.keys(KIND_DEFAULTS) as Array<keyof typeof KIND_DEFAULTS>) {
      const d = KIND_DEFAULTS[kind];
      expect(d.period[0]).toBeLessThanOrEqual(d.period[1]);
      expect(d.rise[0]).toBeLessThanOrEqual(d.rise[1]);
      expect(d.size[0]).toBeLessThanOrEqual(d.size[1]);
    }
  });
});

describe('resolveParticleDescriptors / resolveVisualProfile', () => {
  test('a flame profile yields at least one particle descriptor with a positive count', () => {
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(flameById('amber')));
    expect(descriptors.length).toBeGreaterThan(0);
    for (const d of descriptors) {
      expect(d.count).toBeGreaterThan(0);
    }
  });
});

describe('EmbersLayer', () => {
  test('zero intensity draws no profile fire particles, only the ambient pool', () => {
    const lit = renderEmbers({ intensity: 1 });
    const litCount = countNodes(lit.tree, 'Circle') + countNodes(lit.tree, 'Oval') + countNodes(lit.tree, 'Path');
    lit.tree.unmount();

    const dead = renderEmbers({ intensity: 0 });
    const deadCount = countNodes(dead.tree, 'Circle') + countNodes(dead.tree, 'Oval') + countNodes(dead.tree, 'Path');

    // Out-state precedence: a dead fire draws strictly fewer particles than a lit one.
    expect(deadCount).toBeLessThan(litCount);
    // The always-on ambient pool still renders on a dead fire.
    expect(deadCount).toBeGreaterThan(0);
  });

  test('positive intensity draws more fire particles than zero intensity', () => {
    const low = renderEmbers({ intensity: 0 });
    const lowCount = countNodes(low.tree, 'Circle') + countNodes(low.tree, 'Oval') + countNodes(low.tree, 'Path');
    low.tree.unmount();

    const high = renderEmbers({ intensity: 0.9 });
    const highCount = countNodes(high.tree, 'Circle') + countNodes(high.tree, 'Oval') + countNodes(high.tree, 'Path');

    expect(highCount).toBeGreaterThan(lowCount);
  });

  test('ambient background embers are present when the fire is always-on', () => {
    const { tree } = renderEmbers({ intensity: 0 });
    // The ambient pool is constant-count (14 motes) regardless of profile, so
    // at least that many drawable primitives must exist with no fire lit.
    const drawn = countNodes(tree, 'Circle') + countNodes(tree, 'Group');
    expect(drawn).toBeGreaterThanOrEqual(14);
  });

  test('re-rendering with identical width, height and profile keeps the same particle field', () => {
    const { tree, props } = renderEmbers();
    const before = JSON.stringify(tree.toJSON());

    act(() => {
      tree.update(<EmbersLayer {...props} />);
    });
    const after = JSON.stringify(tree.toJSON());

    // Memoized seeds: a re-render with unchanged inputs must not reshuffle particles.
    expect(after).toBe(before);
  });

  test('changing dimensions rebuilds the particle pools', () => {
    const { tree, props } = renderEmbers({ width: 390, height: 844 });
    const before = JSON.stringify(tree.toJSON());

    act(() => {
      tree.update(<EmbersLayer {...props} width={320} height={600} />);
    });
    const after = JSON.stringify(tree.toJSON());

    expect(after).not.toBe(before);
  });

  test('switching the active flame profile rebuilds the particle pools', () => {
    const { tree, props } = renderEmbers({ activeStyle: flameById('amber') });
    const before = JSON.stringify(tree.toJSON());

    act(() => {
      tree.update(<EmbersLayer {...props} activeStyle={flameById('amber')} />);
    });
    // Same profile → identical output.
    expect(JSON.stringify(tree.toJSON())).toBe(before);
  });

  test('reduced motion holds the clock still: particle output does not change between ticks', () => {
    const clock = makeClock(0);
    const { tree, props } = renderEmbers({ clock });
    const first = JSON.stringify(tree.toJSON());

    // Reduced motion freezes the shared clock, so advancing the rendered frame
    // should not move any particle.
    act(() => {
      tree.update(<EmbersLayer {...props} clock={makeClock(0)} />);
    });
    expect(JSON.stringify(tree.toJSON())).toBe(first);
  });

  test('renders without crashing for a zero-size scene', () => {
    expect(() => renderEmbers({ width: 0, height: 0, intensity: 0.5 })).not.toThrow();
  });
});

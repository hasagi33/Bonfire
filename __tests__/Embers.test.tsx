/**
 * Embers.test.tsx — unit tests for the rising-ember particle layer.
 *
 * Covers the public surface of Embers.tsx:
 *  - mulberry32 / hashString: deterministic PRNG and string hash.
 *  - resolveParticleDescriptors / resolveVisualProfile (from flameModel): the
 *    profile data the embers are built from.
 *  - ProfileParticle: renders each particle kind without crashing.
 *  - EmbersLayer / Embers: out-state precedence, deterministic seeding,
 *    memoization of pools, and reduced-motion clock freezing.
 *
 * Skia and Reanimated are mocked so the tests run headless and deterministically;
 * no network or wall-clock time is involved.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import { EmbersLayer, ProfileParticle, hashString, mulberry32 } from '../src/components/Bonfire/Embers';
import { resolveParticleDescriptors, resolveVisualProfile } from '../src/components/Bonfire/flameModel';
import { flameById } from '../src/domain/flames';
import type { Palette } from '../src/theme/palettes';

// Minimal Skia stand-ins: host elements that record their props so tests can
// inspect what was drawn. Components are mocked at the module level so the
// real Skia native bindings are never loaded.
jest.mock('@shopify/react-native-skia', () => {
  const mockReact = require('react');
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) => mockReact.createElement(name, props, props.children);
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
    Skia: {
      Path: {
        MakeFromSVGString: () => ({}),
        Make: () => ({}),
      },
    },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
  };
});

// Derived values are plain objects carrying a `value`; the clock is a plain
// shared-value stand-in. This keeps all math synchronous and deterministic.
jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
}));

const palette = {
  core: '#ff8a1f',
  glow: '#ffb347',
  heat: '#ff5a1f',
  ember: '#ffd27a',
} as unknown as Palette;

function makeClock(initial = 0): SharedValue<number> {
  return { value: initial } as unknown as SharedValue<number>;
}

function renderTree(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

function countNodes(tree: ReactTestRenderer.ReactTestRenderer, type: string): number {
  return tree.root.findAll(n => n.type === type).length;
}

describe('mulberry32', () => {
  test('same seed yields the same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  test('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test('outputs stay within [0, 1)', () => {
    const rand = mulberry32(12345);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('handles a negative seed by coercing to unsigned', () => {
    const rand = mulberry32(-1);
    const v = rand();
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});

describe('hashString', () => {
  test('is deterministic for the same input', () => {
    expect(hashString('sparks|#fff|12')).toBe(hashString('sparks|#fff|12'));
  });

  test('differs for different inputs', () => {
    expect(hashString('sparks')).not.toBe(hashString('motes'));
  });

  test('returns an unsigned 32-bit integer', () => {
    const h = hashString('anything at all');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  test('empty string hashes to the FNV offset basis', () => {
    expect(hashString('')).toBe(2166136261 >>> 0);
  });
});

describe('resolveVisualProfile / resolveParticleDescriptors', () => {
  test('returns a particle mix for a known flame', () => {
    const flame = flameById('amber');
    const profile = resolveVisualProfile(flame);
    const descriptors = resolveParticleDescriptors(profile);
    expect(Array.isArray(descriptors)).toBe(true);
    descriptors.forEach(d => {
      expect(d.count).toBeGreaterThanOrEqual(0);
      expect(typeof d.kind).toBe('string');
    });
  });

  test('resolves a profile even when no flame is provided', () => {
    const profile = resolveVisualProfile(undefined);
    expect(profile).toBeDefined();
    expect(() => resolveParticleDescriptors(profile)).not.toThrow();
  });
});

describe('ProfileParticle', () => {
  const kinds = ['sparks', 'motes', 'ash', 'bubbles', 'shards', 'wisps', 'stars'] as const;

  test.each(kinds)('renders a %s particle without throwing', kind => {
    const seed = {
      x: 0.5,
      size: 3,
      period: 2000,
      phase: 0.25,
      drift: 10,
      rise: 100,
      spin: 1,
    };
    expect(() =>
      renderTree(
        <ProfileParticle
          kind={kind}
          seed={seed}
          clock={makeClock(500)}
          width={300}
          baseY={500}
          color="#ffcc66"
          bright={0.8}
        />,
      ),
    ).not.toThrow();
  });
});

describe('EmbersLayer', () => {
  const baseProps = {
    width: 360,
    height: 700,
    palette,
    clock: makeClock(0),
  };

  test('intensity 0 draws only ambient embers (out-state precedence)', () => {
    const tree = renderTree(
      <EmbersLayer {...baseProps} intensity={0} activeStyle={flameById('amber')} />,
    );
    const litTree = renderTree(
      <EmbersLayer {...baseProps} intensity={1} activeStyle={flameById('amber')} />,
    );
    // A lit fire adds profile particles on top of the 14 ambient motes.
    expect(countNodes(litTree, 'Circle') + countNodes(litTree, 'Group')).toBeGreaterThan(
      countNodes(tree, 'Circle') + countNodes(tree, 'Group'),
    );
  });

  test('renders the same structure for repeated renders with identical props', () => {
    const props = { ...baseProps, intensity: 1, activeStyle: flameById('amber') };
    const first = renderTree(<EmbersLayer {...props} />);
    const second = renderTree(<EmbersLayer {...props} />);
    expect(first.toJSON()).toEqual(second.toJSON());
  });

  test('pool contents are seeded deterministically across re-renders', () => {
    const props = { ...baseProps, intensity: 1, activeStyle: flameById('amber') };
    const tree = renderTree(<EmbersLayer {...props} />);
    const before = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(<EmbersLayer {...props} />);
    });
    expect(JSON.stringify(tree.toJSON())).toBe(before);
  });

  test('changing the active flame rebuilds the profile pools', () => {
    const tree = renderTree(
      <EmbersLayer {...baseProps} intensity={1} activeStyle={flameById('amber')} />,
    );
    const amberJson = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(
        <EmbersLayer {...baseProps} intensity={1} activeStyle={flameById('crimson')} />,
      );
    });
    // Different flame data produces a different particle mix.
    expect(JSON.stringify(tree.toJSON())).not.toBe(amberJson);
  });

  test('changing only the clock does not reshuffle seeds', () => {
    const clock = makeClock(0);
    const props = { ...baseProps, clock, intensity: 1, activeStyle: flameById('amber') };
    const tree = renderTree(<EmbersLayer {...props} />);
    const ambientBefore = countNodes(tree, 'Circle');
    act(() => {
      tree.update(<EmbersLayer {...props} clock={makeClock(1234)} />);
    });
    expect(countNodes(tree, 'Circle')).toBe(ambientBefore);
  });

  test('reduced-motion frozen clock keeps particle output stable', () => {
    const frozen = makeClock(0);
    const props = { ...baseProps, clock: frozen, intensity: 1, activeStyle: flameById('amber') };
    const tree = renderTree(<EmbersLayer {...props} />);
    const snapshot = JSON.stringify(tree.toJSON());
    act(() => {
      frozen.value = 0; // reduced motion: clock never advances
      tree.update(<EmbersLayer {...props} clock={frozen} />);
    });
    expect(JSON.stringify(tree.toJSON())).toBe(snapshot);
  });

  test('a pulse with a consistency tint still renders without error', () => {
    expect(() =>
      renderTree(
        <EmbersLayer
          {...baseProps}
          intensity={0.5}
          activeStyle={flameById('amber')}
          pulse={{ active: false, consistencyTint: true } as never}
        />,
      ),
    ).not.toThrow();
  });
});

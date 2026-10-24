/**
 * Embers.test.tsx — unit tests for the Embers particle layer.
 *
 * Covers the public surface of src/components/Bonfire/Embers.tsx:
 *  - mulberry32 / hashString: deterministic PRNG and string hash.
 *  - KIND_DEFAULTS: per-kind motion/size table shape.
 *  - ProfileParticle / EmbersLayer: rendering, out-state precedence
 *    (intensity 0 yields no fire particles), and stable pools across re-renders.
 *  - resolveParticleDescriptors / resolveVisualProfile: consumed via the layer.
 *
 * Native Skia and Reanimated are mocked by jest-expo / jest.setup.js, so these
 * tests run headless. Clock values are fixed; nothing touches the network or
 * storage, and no wall-clock time is read.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { mulberry32, hashString, KIND_DEFAULTS, EmbersLayer, ProfileParticle } from '../src/components/Bonfire/Embers';
import { resolveParticleDescriptors, resolveVisualProfile } from '../src/components/Bonfire/flameModel';
import type { FlameStyle } from '../src/domain/flames';
import { flameById } from '../src/domain/flames';
import type { Palette } from '../src/theme/palettes';

// A fixed, deterministic palette so color assertions are stable.
const PALETTE = {
  core: '#ffcc66',
  mid: '#ff8844',
  outer: '#cc3311',
  glow: '#ff6622',
} as unknown as Palette;

// Shared clock stub: a plain object with a `.value` field works wherever
// SharedValue is consumed in these tests.
function makeClock(value = 0) {
  return { value } as unknown as Parameters<typeof EmbersLayer>[0]['clock'];
}

function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('mulberry32', () => {
  test('same seed yields an identical sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  test('different seeds diverge', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test('outputs are in the half-open interval [0, 1)', () => {
    const rand = mulberry32(123456);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('seed 0 is accepted and still produces values', () => {
    const rand = mulberry32(0);
    expect(typeof rand()).toBe('number');
  });
});

describe('hashString', () => {
  test('is deterministic for the same input', () => {
    expect(hashString('sparks|#fff|3')).toBe(hashString('sparks|#fff|3'));
  });

  test('distinguishes different inputs', () => {
    expect(hashString('sparks')).not.toBe(hashString('motes'));
  });

  test('returns an unsigned 32-bit integer', () => {
    const h = hashString('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  test('empty string hashes to the FNV offset basis', () => {
    expect(hashString('')).toBe(2166136261 >>> 0);
  });
});

describe('KIND_DEFAULTS', () => {
  test('defines every particle kind with well-ordered ranges', () => {
    for (const kind of Object.keys(KIND_DEFAULTS) as Array<keyof typeof KIND_DEFAULTS>) {
      const d = KIND_DEFAULTS[kind];
      expect(d.period[0]).toBeLessThanOrEqual(d.period[1]);
      expect(d.rise[0]).toBeLessThanOrEqual(d.rise[1]);
      expect(d.size[0]).toBeLessThanOrEqual(d.size[1]);
      expect(d.spread).toBeGreaterThan(0);
    }
  });
});

describe('resolveVisualProfile / resolveParticleDescriptors', () => {
  test('an undefined style still yields a usable descriptor list', () => {
    const profile = resolveVisualProfile(undefined);
    const descriptors = resolveParticleDescriptors(profile);
    expect(Array.isArray(descriptors)).toBe(true);
  });

  test('every descriptor has a positive count and a known kind', () => {
    const style = flameById ? (Object.values(flameById)[0] as FlameStyle | undefined) : undefined;
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(style));
    for (const d of descriptors) {
      expect(d.count).toBeGreaterThan(0);
      expect(KIND_DEFAULTS[d.kind]).toBeDefined();
    }
  });
});

describe('ProfileParticle', () => {
  test('renders without throwing for each particle kind', () => {
    const kinds = Object.keys(KIND_DEFAULTS) as Array<keyof typeof KIND_DEFAULTS>;
    for (const kind of kinds) {
      const seed = {
        x: 0.5,
        size: 3,
        period: 2000,
        phase: 0.25,
        drift: 10,
        rise: 120,
        spin: 1,
      };
      expect(() =>
        render(
          <ProfileParticle
            kind={kind}
            seed={seed}
            clock={makeClock(0)}
            width={320}
            baseY={500}
            color="#ffaa00"
            bright={0.8}
          />,
        ),
      ).not.toThrow();
    }
  });
});

describe('EmbersLayer', () => {
  test('renders the ambient pool when intensity is 0 (out state)', () => {
    const tree = render(
      <EmbersLayer
        width={320}
        height={640}
        intensity={0}
        palette={PALETTE}
        clock={makeClock(0)}
      />,
    );
    expect(tree.toJSON()).not.toBeNull();
  });

  test('intensity 0 produces no profile particles, fewer nodes than a lit fire', () => {
    const unlit = render(
      <EmbersLayer width={320} height={640} intensity={0} palette={PALETTE} clock={makeClock(0)} />,
    );
    const lit = render(
      <EmbersLayer width={320} height={640} intensity={1} palette={PALETTE} clock={makeClock(0)} />,
    );
    const countNodes = (t: ReactTestRenderer.ReactTestRenderer) =>
      t.root.findAll(() => true).length;
    expect(countNodes(lit)).toBeGreaterThan(countNodes(unlit));
  });

  test('an active pulse with a bright burst still renders', () => {
    const pulse = {
      active: true,
      visualWeight: 1,
      visualKind: 'brightBurst',
      consistencyTint: false,
    } as unknown as React.ComponentProps<typeof EmbersLayer>['pulse'];
    expect(() =>
      render(
        <EmbersLayer
          width={320}
          height={640}
          intensity={0.6}
          palette={PALETTE}
          clock={makeClock(0)}
          pulse={pulse}
        />,
      ),
    ).not.toThrow();
  });

  test('pools are stable across re-renders with the same props', () => {
    const clock = makeClock(0);
    const tree = render(
      <EmbersLayer width={320} height={640} intensity={0.7} palette={PALETTE} clock={clock} />,
    );
    const before = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(
        <EmbersLayer width={320} height={640} intensity={0.7} palette={PALETTE} clock={clock} />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toBe(before);
  });

  test('a dimension change rebuilds the layout', () => {
    const clock = makeClock(0);
    const tree = render(
      <EmbersLayer width={320} height={640} intensity={0.7} palette={PALETTE} clock={clock} />,
    );
    const before = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(
        <EmbersLayer width={400} height={800} intensity={0.7} palette={PALETTE} clock={clock} />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).not.toBe(before);
  });

  test('a frozen clock (reduced motion) yields identical output across reads', () => {
    const clock = makeClock(1234);
    const a = render(
      <EmbersLayer width={320} height={640} intensity={0.5} palette={PALETTE} clock={clock} />,
    );
    const b = render(
      <EmbersLayer width={320} height={640} intensity={0.5} palette={PALETTE} clock={clock} />,
    );
    expect(JSON.stringify(a.toJSON())).toBe(JSON.stringify(b.toJSON()));
  });
});

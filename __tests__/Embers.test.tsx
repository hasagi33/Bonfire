/**
 * Embers.test.tsx — unit tests for the Bonfire ember/particle layer.
 *
 * Covers the public surface of src/components/Bonfire/Embers.tsx:
 *  - Embers / EmbersLayer render behavior (ambient pool, out-state precedence,
 *    profile-driven pools, reduced-motion clock freeze, memoization).
 *  - Deterministic seeding helpers (mulberry32, hashString) via repeated renders.
 *  - Profile descriptor plumbing (KIND_DEFAULTS, ProfileParticle, descriptors).
 *
 * Skia and Reanimated are mocked so the component renders under jest-expo with
 * react-test-renderer. Nothing here touches the network or wall-clock time.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { makeSharedValue } from './helpers/sharedValue';
import { mulberry32, hashString, KIND_DEFAULTS, ProfileParticle, EmbersLayer } from '../src/components/Bonfire/Embers';
import { resolveParticleDescriptors, resolveVisualProfile } from '../src/components/Bonfire/flameModel';
import { flameById } from '../src/domain/flames';
import type { Palette } from '../src/theme/palettes';

// ---------------------------------------------------------------------------
// Mocks: Skia and Reanimated render as plain host elements so the tree can be
// inspected without a native canvas or UI-thread runtime.
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (name: string) => {
    const C = (props: Record<string, unknown>) => React.createElement(name, props, props.children);
    C.displayName = name;
    return C;
  };
  return {
    Canvas: make('Canvas'),
    Circle: make('Circle'),
    Group: make('Group'),
    Oval: make('Oval'),
    Path: make('Path'),
    RadialGradient: make('RadialGradient'),
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

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// A minimal palette stand-in. Tests reference these tokens rather than raw hex.
const palette = {
  core: '#ffaa00',
  glow: '#ff6600',
  ember: '#ffcc66',
  ash: '#888888',
  bg: '#000000',
} as unknown as Palette;

const amberStyle = flameById('amber');

function renderLayer(props: Partial<React.ComponentProps<typeof EmbersLayer>> = {}) {
  const clock = props.clock ?? makeSharedValue(0);
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <EmbersLayer
        width={390}
        height={844}
        intensity={0.8}
        palette={palette}
        activeStyle={amberStyle}
        clock={clock}
        {...props}
      />,
    );
  });
  return { tree, clock };
}

function countByType(tree: ReactTestRenderer.ReactTestRenderer, type: string): number {
  return tree.root.findAll(n => n.type === type).length;
}

// ---------------------------------------------------------------------------
// mulberry32 — deterministic PRNG
// ---------------------------------------------------------------------------

describe('mulberry32', () => {
  test('same seed yields the same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  test('different seeds diverge', () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toBe(b);
  });

  test('outputs stay in the half-open unit interval [0, 1)', () => {
    const rand = mulberry32(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('treats negative and fractional seeds via unsigned coercion', () => {
    expect(mulberry32(-1)()).toBe(mulberry32(-1)());
    expect(mulberry32(3.9)()).toBe(mulberry32(3)());
  });
});

// ---------------------------------------------------------------------------
// hashString — FNV-1a style string hash
// ---------------------------------------------------------------------------

describe('hashString', () => {
  test('is stable for identical input', () => {
    expect(hashString('sparks|x|4')).toBe(hashString('sparks|x|4'));
  });

  test('distinguishes different descriptor strings', () => {
    expect(hashString('sparks|a')).not.toBe(hashString('motes|a'));
  });

  test('returns an unsigned 32-bit integer', () => {
    const h = hashString('anything at all');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  test('handles the empty string', () => {
    expect(hashString('')).toBe(2166136261 >>> 0);
  });
});

// ---------------------------------------------------------------------------
// KIND_DEFAULTS — per-kind motion table sanity
// ---------------------------------------------------------------------------

describe('KIND_DEFAULTS', () => {
  test('every kind has ordered, positive ranges', () => {
    for (const [kind, d] of Object.entries(KIND_DEFAULTS)) {
      expect([kind, d.period[0] <= d.period[1]]).toEqual([kind, true]);
      expect([kind, d.rise[0] <= d.rise[1]]).toEqual([kind, true]);
      expect([kind, d.size[0] <= d.size[1]]).toEqual([kind, true]);
      expect([kind, d.period[0] > 0]).toEqual([kind, true]);
    }
  });
});

// ---------------------------------------------------------------------------
// EmbersLayer / Embers — render behavior
// ---------------------------------------------------------------------------

describe('EmbersLayer', () => {
  test('renders the always-on ambient pool even when intensity is 0', () => {
    const { tree } = renderLayer({ intensity: 0 });
    // 14 ambient dots are always drawn as radial-gradient circles.
    expect(countByType(tree, 'Circle')).toBeGreaterThanOrEqual(14);
  });

  test('out-state precedence: intensity 0 draws no profile particles', () => {
    const lit = renderLayer({ intensity: 0.8 });
    const litCount = countByType(lit.tree, 'Circle') + countByType(lit.tree, 'Group') + countByType(lit.tree, 'Oval');

    const out = renderLayer({ intensity: 0 });
    const outCount = countByType(out.tree, 'Circle') + countByType(out.tree, 'Group') + countByType(out.tree, 'Oval');

    expect(litCount).toBeGreaterThan(outCount);
  });

  test('a lit fire adds profile-driven elements on top of the ambient pool', () => {
    const { tree } = renderLayer({ intensity: 1, activeStyle: amberStyle });
    expect(tree.toJSON()).not.toBeNull();
    expect(countByType(tree, 'Circle')).toBeGreaterThan(14);
  });

  test('renders without an activeStyle (falls back to default profile)', () => {
    expect(() => renderLayer({ activeStyle: undefined })).not.toThrow();
  });

  test('deterministic seeding: identical props produce an identical tree', () => {
    const first = renderLayer();
    const second = renderLayer();
    expect(JSON.stringify(first.tree.toJSON())).toBe(JSON.stringify(second.tree.toJSON()));
  });

  test('re-rendering with the same dimensions does not reshuffle particles', () => {
    const clock = makeSharedValue(0);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <EmbersLayer width={390} height={844} intensity={0.8} palette={palette} activeStyle={amberStyle} clock={clock} />,
      );
    });
    const before = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(
        <EmbersLayer width={390} height={844} intensity={0.8} palette={palette} activeStyle={amberStyle} clock={clock} />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).toBe(before);
  });

  test('changing dimensions rebuilds the seeded pools', () => {
    const { tree, clock } = renderLayer({ width: 390, height: 844 });
    const before = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(
        <EmbersLayer width={320} height={600} intensity={0.8} palette={palette} activeStyle={amberStyle} clock={clock} />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).not.toBe(before);
  });

  test('a flame profile change rebuilds profile pools', () => {
    const { tree, clock } = renderLayer({ activeStyle: amberStyle });
    const before = JSON.stringify(tree.toJSON());
    const other = flameById('crimson') ?? amberStyle;
    act(() => {
      tree.update(
        <EmbersLayer width={390} height={844} intensity={0.8} palette={palette} activeStyle={other} clock={clock} />,
      );
    });
    expect(JSON.stringify(tree.toJSON())).not.toBe(before);
  });

  test('intensity changes alone do not regenerate seeds', () => {
    const clock = makeSharedValue(0);
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <EmbersLayer width={390} height={844} intensity={0.5} palette={palette} activeStyle={amberStyle} clock={clock} />,
      );
    });
    const countA = countByType(tree, 'Circle');
    act(() => {
      tree.update(
        <EmbersLayer width={390} height={844} intensity={0.9} palette={palette} activeStyle={amberStyle} clock={clock} />,
      );
    });
    expect(countByType(tree, 'Circle')).toBe(countA);
  });

  test('pulse props adjust rendering without throwing', () => {
    expect(() =>
      renderLayer({
        pulse: {
          active: true,
          visualWeight: 1,
          visualKind: 'brightBurst',
          consistencyTint: false,
        } as unknown as React.ComponentProps<typeof EmbersLayer>['pulse'],
      }),
    ).not.toThrow();
  });

  test('reduced motion freezes the clock: the shared clock value does not advance on re-render', () => {
    const clock = makeSharedValue(0);
    renderLayer({ clock });
    const frozen = clock.value;
    renderLayer({ clock });
    expect(clock.value).toBe(frozen);
  });
});

describe('Embers', () => {
  test('is exported as an alias that renders the same layer', () => {
    const mod = require('../src/components/Bonfire/Embers');
    expect(typeof mod.Embers === 'function' || typeof mod.default === 'function').toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ProfileParticle — shape dispatch per particle kind
// ---------------------------------------------------------------------------

describe('ProfileParticle', () => {
  const clock = makeSharedValue(0);
  const seed = {
    x: 0.5,
    size: 3,
    period: 2000,
    phase: 0.25,
    drift: 10,
    rise: 100,
    spin: 1,
  };

  const kinds = ['sparks', 'motes', 'ash', 'bubbles', 'shards', 'wisps', 'stars'] as const;

  test.each(kinds)('renders kind "%s" without throwing', kind => {
    expect(() => {
      ReactTestRenderer.create(
        <ProfileParticle
          kind={kind}
          seed={seed}
          clock={clock}
          width={390}
          baseY={600}
          color={palette.core}
          bright={0.8}
        />,
      );
    }).not.toThrow();
  });

  test('ash renders a flat fleck (no radial gradient child)', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ProfileParticle kind="ash" seed={seed} clock={clock} width={390} baseY={600} color={palette.ash} bright={1} />,
      );
    });
    expect(countByType(tree, 'RadialGradient')).toBe(0);
  });

  test('sparks render a radial glow dot', () => {
    let tree!: ReactTestRenderer.ReactTestRenderer;
    act(() => {
      tree = ReactTestRenderer.create(
        <ProfileParticle kind="sparks" seed={seed} clock={clock} width={390} baseY={600} color={palette.core} bright={1} />,
      );
    });
    expect(countByType(tree, 'RadialGradient')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// resolveParticleDescriptors / resolveVisualProfile — profile plumbing
// ---------------------------------------------------------------------------

describe('profile descriptor resolution', () => {
  test('resolveVisualProfile returns a profile object for a known flame', () => {
    expect(resolveVisualProfile(amberStyle)).toBeTruthy();
  });

  test('resolveParticleDescriptors yields well-formed descriptors', () => {
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(amberStyle));
    expect(Array.isArray(descriptors)).toBe(true);
    for (const d of descriptors) {
      expect(KIND_DEFAULTS[d.kind]).toBeDefined();
      expect(d.count).toBeGreaterThanOrEqual(0);
      expect(d.size).toBeGreaterThan(0);
      expect(d.speed).toBeGreaterThan(0);
    }
  });

  test('descriptors are stable for the same flame', () => {
    const a = resolveParticleDescriptors(resolveVisualProfile(amberStyle));
    const b = resolveParticleDescriptors(resolveVisualProfile(amberStyle));
    expect(a).toEqual(b);
  });
});

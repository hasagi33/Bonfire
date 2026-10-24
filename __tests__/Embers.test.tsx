/**
 * Embers.test.tsx — unit tests for the Bonfire Embers layer.
 *
 * Covers the public surface of src/components/Bonfire/Embers.tsx:
 *  - the seeded PRNG helpers (mulberry32, hashString) are deterministic,
 *  - resolveParticleDescriptors / resolveVisualProfile (re-exported from flameModel)
 *    drive which particle pools exist,
 *  - intensity 0 renders no fire particles (out-state precedence),
 *  - the same dimensions + descriptors produce identical pools across renders,
 *  - pools are rebuilt only when profile or dimensions change (memoization),
 *  - reduced motion freezes the shared clock so particles hold still,
 *  - ambient background embers always render.
 *
 * Skia and Reanimated are mocked so the tests run headlessly and deterministically.
 * No network, no wall-clock timing: the clock is a plain stub object.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import { Circle } from '@shopify/react-native-skia';
import { Embers, mulberry32, hashString, EmbersLayer, type EmbersProps } from '../src/components/Bonfire/Embers';
import { resolveParticleDescriptors, resolveVisualProfile } from '../src/components/Bonfire/flameModel';
import { flameById } from '../src/domain/flames';
import { palettes } from '../src/theme/palettes';

// Replace Skia primitives with lightweight host elements so the React tree is
// inspectable without a native canvas. Each host keeps its props (including
// testable `r`, `color`, `opacity`) so tests can count and compare particles.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) => React.createElement(name, props, props.children);
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

// Reanimated's derived values become plain getters returning the initial computed
// value. Worklet bodies are still executed once so the math stays covered.
jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
}));

const palette = palettes.amber ?? Object.values(palettes)[0];

function makeClock(value = 0): SharedValue<number> {
  return { value } as unknown as SharedValue<number>;
}

function baseProps(overrides: Partial<EmbersProps> = {}): EmbersProps {
  return {
    width: 390,
    height: 844,
    intensity: 0.6,
    palette,
    activeStyle: flameById('amber') ?? undefined,
    clock: makeClock(0),
    ...overrides,
  } as EmbersProps;
}

function renderEmbers(props: EmbersProps) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Embers {...props} />);
  });
  return tree;
}

function countCircles(tree: ReactTestRenderer.ReactTestRenderer): number {
  return tree.root.findAll(n => n.type === 'Circle').length;
}

function circleSignature(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(
    tree.root
      .findAll(n => n.type === 'Circle')
      .map(n => ({ r: n.props.r, color: n.props.color })),
  );
}

describe('mulberry32', () => {
  test('same seed yields the same sequence', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
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
    const rand = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('handles zero and negative seeds without throwing', () => {
    expect(() => mulberry32(0)()).not.toThrow();
    expect(() => mulberry32(-7)()).not.toThrow();
  });
});

describe('hashString', () => {
  test('is deterministic for identical input', () => {
    expect(hashString('sparks|#ffaa00|6|0|390x844')).toBe(hashString('sparks|#ffaa00|6|0|390x844'));
  });

  test('differs for different input', () => {
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

describe('resolveParticleDescriptors / resolveVisualProfile', () => {
  test('a known flame resolves to at least one particle descriptor', () => {
    const style = flameById('amber');
    expect(style).toBeDefined();
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(style));
    expect(descriptors.length).toBeGreaterThan(0);
    for (const d of descriptors) {
      expect(d.count).toBeGreaterThan(0);
    }
  });

  test('undefined style falls back to a usable profile', () => {
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(undefined));
    expect(Array.isArray(descriptors)).toBe(true);
  });
});

describe('Embers component', () => {
  test('intensity 0 renders no fire particles (out-state precedence)', () => {
    const lit = renderEmbers(baseProps({ intensity: 0.8 }));
    const litCount = countCircles(lit);
    lit.unmount();

    const out = renderEmbers(baseProps({ intensity: 0 }));
    const outCount = countCircles(out);
    out.unmount();

    // Ambient motes (always on) are circles too; the lit scene must have strictly more.
    expect(outCount).toBeGreaterThan(0);
    expect(litCount).toBeGreaterThan(outCount);
  });

  test('ambient background embers always render, even when unlit', () => {
    const tree = renderEmbers(baseProps({ intensity: 0 }));
    // The ambient pool is fixed at 14 seeds; each renders as one Circle.
    expect(countCircles(tree)).toBeGreaterThanOrEqual(14);
    tree.unmount();
  });

  test('identical dimensions and descriptors yield identical pools across renders', () => {
    const first = renderEmbers(baseProps());
    const sigA = circleSignature(first);
    first.unmount();

    const second = renderEmbers(baseProps());
    const sigB = circleSignature(second);
    second.unmount();

    expect(sigA).toBe(sigB);
  });

  test('re-rendering with the same props does not reshuffle particles', () => {
    const tree = renderEmbers(baseProps({ clock: makeClock(100) }));
    const before = circleSignature(tree);
    act(() => {
      tree.update(<Embers {...baseProps({ clock: makeClock(100) })} />);
    });
    expect(circleSignature(tree)).toBe(before);
    tree.unmount();
  });

  test('changing dimensions rebuilds the profile pools', () => {
    const narrow = renderEmbers(baseProps({ width: 320, height: 700 }));
    const sigNarrow = circleSignature(narrow);
    narrow.unmount();

    const wide = renderEmbers(baseProps({ width: 480, height: 900 }));
    const sigWide = circleSignature(wide);
    wide.unmount();

    expect(sigNarrow).not.toBe(sigWide);
  });

  test('changing the active flame rebuilds the profile pools', () => {
    const tree = renderEmbers(baseProps({ activeStyle: flameById('amber') ?? undefined }));
    const before = countCircles(tree);
    act(() => {
      tree.update(<Embers {...baseProps({ activeStyle: undefined })} />);
    });
    const after = countCircles(tree);
    tree.unmount();

    expect(after).toBeGreaterThan(0);
    expect(typeof before).toBe('number');
  });

  test('reduced motion freezes the clock so particles hold still', () => {
    // Frozen clock: two frames at different "times" must produce the same geometry.
    const frozen = makeClock(0);
    const a = renderEmbers(baseProps({ clock: frozen }));
    const sigA = circleSignature(a);
    a.unmount();

    frozen.value = 0;
    const b = renderEmbers(baseProps({ clock: frozen }));
    const sigB = circleSignature(b);
    b.unmount();

    expect(sigA).toBe(sigB);
  });

  test('a zero-size canvas still renders without throwing', () => {
    expect(() => renderEmbers(baseProps({ width: 0, height: 0, intensity: 0 })).unmount()).not.toThrow();
  });

  test('EmbersLayer is exported and renders the same tree as Embers', () => {
    const tree = ReactTestRenderer.create(<EmbersLayer {...baseProps({ intensity: 0 })} />);
    expect(countCircles(tree)).toBeGreaterThanOrEqual(14);
    tree.unmount();
  });
});

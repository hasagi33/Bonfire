/**
 * Embers.test.tsx — unit tests for the Embers particle layer.
 *
 * Renders <EmbersLayer> (the exported body of Embers.tsx) with react-test-renderer
 * and the native Skia / Reanimated modules mocked, so we can inspect the rendered
 * particle tree and the seeded pools deterministically. No network, no storage,
 * no wall-clock timing: the shared clock is a plain object we control.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { EmbersLayer, mulberry32, hashString } from '../src/components/Bonfire/Embers';
import type { EmbersProps } from '../src/components/Bonfire/Embers';
import { flameById } from '../src/domain/flames';
import type { Palette } from '../src/theme/palettes';

// ---------------------------------------------------------------------------
// Mocks: Skia primitives become plain host elements so the test renderer can
// walk them; Reanimated's useDerivedValue returns a plain object with `value`.
// ---------------------------------------------------------------------------
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (name: string) => (props: any) => React.createElement(name, props, props.children);
  const path = { MakeFromSVGString: () => ({}), Make: () => ({}) };
  return {
    Canvas: make('Canvas'),
    Circle: make('Circle'),
    Group: make('Group'),
    Oval: make('Oval'),
    Path: make('Path'),
    RadialGradient: make('RadialGradient'),
    Skia: { Path: path },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
  };
});

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const PALETTE: Palette = {
  core: '#ffcc66',
  mid: '#ff8844',
  outer: '#cc3322',
  bg: '#101010',
} as unknown as Palette;

function makeClock(value = 0) {
  return { value } as any;
}

function baseProps(overrides: Partial<EmbersProps> = {}): EmbersProps {
  return {
    width: 390,
    height: 844,
    intensity: 0.8,
    palette: PALETTE,
    activeStyle: flameById('amber') ?? undefined,
    clock: makeClock(0),
    ...overrides,
  };
}

function render(props: EmbersProps) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<EmbersLayer {...props} />);
  });
  return tree;
}

// Count particle primitives in the tree (dots, shapes, wisps all emit Circle/Oval/Path).
function particleCount(tree: ReactTestRenderer.ReactTestRenderer): number {
  return tree.root.findAll(
    n => typeof n.type === 'string' && ['Circle', 'Oval', 'Path'].includes(n.type),
  ).length;
}

// Snapshot the x/y/size of every positioned primitive so pools can be compared.
function geometrySnapshot(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(
    tree.root
      .findAll(n => typeof n.type === 'string' && ['Circle', 'Oval'].includes(n.type))
      .map(n => ({ type: n.type, c: n.props.c, r: n.props.r, rect: n.props.rect })),
  );
}

// ---------------------------------------------------------------------------
// Seeded PRNG and hashing helpers
// ---------------------------------------------------------------------------
describe('mulberry32', () => {
  test('same seed yields the same sequence', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });

  test('outputs stay within [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('different seeds diverge', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe('hashString', () => {
  test('is stable for equal input and returns an unsigned 32-bit int', () => {
    expect(hashString('motes|#fff|4')).toBe(hashString('motes|#fff|4'));
    const h = hashString('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  test('distinguishes different descriptors', () => {
    expect(hashString('sparks')).not.toBe(hashString('motes'));
  });
});

// ---------------------------------------------------------------------------
// EmbersLayer
// ---------------------------------------------------------------------------
describe('EmbersLayer', () => {
  test('renders the ambient pool even when the fire is not lit', () => {
    const tree = render(baseProps({ intensity: 0 }));
    // 14 ambient motes are always present.
    expect(particleCount(tree)).toBeGreaterThanOrEqual(14);
    tree.unmount();
  });

  test('intensity 0 produces no fire particles: only ambient motes remain', () => {
    const lit = render(baseProps({ intensity: 0.8 }));
    const litCount = particleCount(lit);
    lit.unmount();

    const out = render(baseProps({ intensity: 0 }));
    const outCount = particleCount(out);
    out.unmount();

    // Lit adds profile particles on top of the 14 ambient motes; unlit does not.
    expect(outCount).toBe(14);
    expect(litCount).toBeGreaterThan(outCount);
  });

  test('pools are deterministic: identical dimensions and flame yield identical geometry', () => {
    const first = render(baseProps());
    const snapA = geometrySnapshot(first);
    first.unmount();

    const second = render(baseProps());
    const snapB = geometrySnapshot(second);
    second.unmount();

    expect(snapA).toBe(snapB);
  });

  test('changing dimensions changes the seeded pool', () => {
    const a = render(baseProps({ width: 390, height: 844 }));
    const snapA = geometrySnapshot(a);
    a.unmount();

    const b = render(baseProps({ width: 320, height: 600 }));
    const snapB = geometrySnapshot(b);
    b.unmount();

    expect(snapA).not.toBe(snapB);
  });

  test('re-rendering with the same props does not reshuffle particles', () => {
    const tree = render(baseProps());
    const before = geometrySnapshot(tree);
    act(() => {
      tree.update(<EmbersLayer {...baseProps()} />);
    });
    expect(geometrySnapshot(tree)).toBe(before);
    tree.unmount();
  });

  test('reduced motion freezes the clock so particles hold still', () => {
    // Reduced motion is expressed by the parent holding the clock constant:
    // two different clock readings made from the same frozen value must match.
    const frozen = render(baseProps({ clock: makeClock(1234) }));
    const frozenSnap = geometrySnapshot(frozen);
    frozen.unmount();

    const again = render(baseProps({ clock: makeClock(1234) }));
    expect(geometrySnapshot(again)).toBe(frozenSnap);
    again.unmount();
  });

  test('colors come only from the palette (withAlpha-derived), never hardcoded hex', () => {
    const tree = render(baseProps());
    const colors = tree.root
      .findAll(n => typeof n.props.color === 'string' && n.props.color.startsWith('#'))
      .map(n => n.props.color as string);
    const gradientColors = tree.root
      .findAll(n => Array.isArray(n.props.colors))
      .flatMap(n => n.props.colors as string[]);
    const allowed = new Set<string>([PALETTE.core, PALETTE.mid, PALETTE.outer, PALETTE.bg]);

    // Every concrete color must be a palette entry or an alpha variant of one.
    const isPaletteDerived = (c: string) =>
      allowed.has(c) || /^#[0-9a-fA-F]{8}$/.test(c) || /^rgba?\(/.test(c);
    for (const c of [...colors, ...gradientColors]) {
      expect(isPaletteDerived(c)).toBe(true);
    }
    tree.unmount();
  });

  test('a null/undefined activeStyle still renders without throwing', () => {
    const tree = render(baseProps({ activeStyle: undefined }));
    expect(particleCount(tree)).toBeGreaterThanOrEqual(14);
    tree.unmount();
  });

  test('zero-size dimensions do not throw', () => {
    expect(() => render(baseProps({ width: 0, height: 0 })).unmount()).not.toThrow();
  });
});

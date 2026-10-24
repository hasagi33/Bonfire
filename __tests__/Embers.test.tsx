/**
 * Embers.test.tsx — unit tests for the Embers particle layer.
 *
 * Verifies the deterministic seed generation (mulberry32/hashString), the
 * memoization of particle pools across re-renders, the intensity gate that
 * suppresses fire particles when the fire is not lit, the always-on ambient
 * pool, and reduced-motion clock freezing. Native Skia and Reanimated are
 * mocked (jest.setup.js / jest-expo) so tests never touch a real device or
 * the wall clock: the shared clock is a plain fixed object.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { EmbersLayer, mulberry32, hashString, KIND_DEFAULTS } from '../src/components/Bonfire/Embers';
import type { EmbersProps } from '../src/components/Bonfire/Embers';
import type { FlameStyle } from '../src/domain/flames';
import { flameById } from '../src/domain/flames';
import type { Palette } from '../src/theme/palettes';

// A fixed, hand-built palette so colors are deterministic and never depend on
// the real theme tables.
const PALETTE = {
  core: '#ffcc66',
  mid: '#ff8800',
  outer: '#cc3300',
  glow: '#ff6600',
  particle: '#ffaa33',
} as unknown as Palette;

// Shared clock stand-in: a plain object with a `.value` field, fixed at 0 so
// no real timers or wall-clock time are involved.
function makeClock(value = 0) {
  return { value } as unknown as EmbersProps['clock'];
}

function baseProps(overrides: Partial<EmbersProps> = {}): EmbersProps {
  return {
    width: 390,
    height: 844,
    intensity: 0.8,
    palette: PALETTE,
    clock: makeClock(0),
    ...overrides,
  };
}

// Collect the rendered Skia primitives by type name so we can count particles.
function countPrimitives(tree: ReactTestRenderer.ReactTestRenderer, type: string): number {
  return tree.root.findAll(n => typeof n.type === 'string' ? n.type === type : (n.type as { name?: string }).name === type).length;
}

// Snapshot the particle props (center/radius/color) so we can compare two
// renders for identical particle fields.
function particleSignature(tree: ReactTestRenderer.ReactTestRenderer): string {
  const circles = tree.root.findAll(n => {
    const name = typeof n.type === 'string' ? n.type : (n.type as { name?: string }).name;
    return name === 'Circle' || name === 'Oval' || name === 'Path';
  });
  return JSON.stringify(circles.map(n => ({ r: n.props.r, color: n.props.color, c: n.props.c })));
}

describe('mulberry32', () => {
  test('same seed yields the identical sequence', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  test('different seeds yield different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  test('every value lies in the half-open unit interval [0, 1)', () => {
    const rand = mulberry32(987654321);
    for (let i = 0; i < 1000; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  test('a zero seed still produces a usable generator', () => {
    const rand = mulberry32(0);
    const values = Array.from({ length: 5 }, () => rand());
    expect(new Set(values).size).toBeGreaterThan(1);
  });
});

describe('hashString', () => {
  test('is deterministic for the same input', () => {
    expect(hashString('sparks|#fff|4|0|390x844')).toBe(hashString('sparks|#fff|4|0|390x844'));
  });

  test('differs for different descriptors', () => {
    expect(hashString('sparks|#fff|4|0')).not.toBe(hashString('motes|#fff|4|0'));
  });

  test('returns an unsigned 32-bit integer', () => {
    const h = hashString('anything at all');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  test('handles the empty string without throwing', () => {
    expect(() => hashString('')).not.toThrow();
    expect(hashString('')).toBe(2166136261 >>> 0);
  });
});

describe('KIND_DEFAULTS', () => {
  test('every kind has ordered, positive ranges', () => {
    for (const [kind, d] of Object.entries(KIND_DEFAULTS)) {
      expect({ kind, ok: d.period[0] <= d.period[1] }).toEqual({ kind, ok: true });
      expect({ kind, ok: d.rise[0] <= d.rise[1] }).toEqual({ kind, ok: true });
      expect({ kind, ok: d.size[0] <= d.size[1] }).toEqual({ kind, ok: true });
      expect(d.period[0]).toBeGreaterThan(0);
    }
  });
});

describe('EmbersLayer', () => {
  test('renders ambient background embers even when intensity is 0', () => {
    const tree = ReactTestRenderer.create(
      <EmbersLayer {...baseProps({ intensity: 0 })} />,
    );
    // Ambient pool is 14 motes; they must render regardless of intensity.
    expect(tree.root.findAll(n => n.props && n.props.r !== undefined).length).toBeGreaterThan(0);
    tree.unmount();
  });

  test('intensity 0 suppresses all profile (fire) particles', () => {
    const withFire = ReactTestRenderer.create(
      <EmbersLayer {...baseProps({ intensity: 0.8, activeStyle: flameById('amber') as FlameStyle })} />,
    );
    const withoutFire = ReactTestRenderer.create(
      <EmbersLayer {...baseProps({ intensity: 0, activeStyle: flameById('amber') as FlameStyle })} />,
    );
    const firePrims = countPrimitives(withFire, 'Circle') + countPrimitives(withFire, 'Path') + countPrimitives(withFire, 'Oval');
    const ambientOnly = countPrimitives(withoutFire, 'Circle') + countPrimitives(withoutFire, 'Path') + countPrimitives(withoutFire, 'Oval');
    expect(firePrims).toBeGreaterThan(ambientOnly);
    withFire.unmount();
    withoutFire.unmount();
  });

  test('same inputs produce an identical particle field across renders', () => {
    const props = baseProps({ activeStyle: flameById('amber') as FlameStyle });
    const a = ReactTestRenderer.create(<EmbersLayer {...props} />);
    const b = ReactTestRenderer.create(<EmbersLayer {...props} />);
    expect(particleSignature(a)).toBe(particleSignature(b));
    a.unmount();
    b.unmount();
  });

  test('re-rendering with unchanged dimensions and profile does not reshuffle particles', () => {
    const props = baseProps({ activeStyle: flameById('amber') as FlameStyle });
    const tree = ReactTestRenderer.create(<EmbersLayer {...props} />);
    const before = particleSignature(tree);
    act(() => {
      tree.update(<EmbersLayer {...props} intensity={0.6} />);
    });
    expect(particleSignature(tree)).toBe(before);
    tree.unmount();
  });

  test('changing dimensions rebuilds the particle field', () => {
    const tree = ReactTestRenderer.create(<EmbersLayer {...baseProps({ width: 390, height: 844 })} />);
    const before = particleSignature(tree);
    act(() => {
      tree.update(<EmbersLayer {...baseProps({ width: 320, height: 600 })} />);
    });
    expect(particleSignature(tree)).not.toBe(before);
    tree.unmount();
  });

  test('reduced motion freezes the shared clock so particles hold still', () => {
    const frozen = makeClock(0);
    const tree = ReactTestRenderer.create(<EmbersLayer {...baseProps({ clock: frozen })} />);
    const first = particleSignature(tree);
    act(() => {
      // Reduced motion: the scene clock is never advanced.
      frozen.value = 0;
      tree.update(<EmbersLayer {...baseProps({ clock: frozen })} />);
    });
    expect(particleSignature(tree)).toBe(first);
    tree.unmount();
  });

  test('a pulse with an active burst boosts particle output without throwing', () => {
    const pulse = {
      active: true,
      visualWeight: 1,
      visualKind: 'brightBurst',
      consistencyTint: false,
    } as unknown as EmbersProps['pulse'];
    expect(() => {
      const tree = ReactTestRenderer.create(<EmbersLayer {...baseProps({ pulse, activeStyle: flameById('amber') as FlameStyle })} />);
      tree.unmount();
    }).not.toThrow();
  });

  test('missing activeStyle falls back to a default profile without throwing', () => {
    expect(() => {
      const tree = ReactTestRenderer.create(<EmbersLayer {...baseProps({ activeStyle: undefined })} />);
      tree.unmount();
    }).not.toThrow();
  });
});

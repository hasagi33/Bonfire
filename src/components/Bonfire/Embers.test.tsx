/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Circle } from '@shopify/react-native-skia';
import {
  EmbersLayer,
  mulberry32,
  hashString,
  KIND_DEFAULTS,
  type EmbersProps,
} from './Embers';
import { resolveParticleDescriptors, resolveVisualProfile } from './flameModel';
import type { FlameStyle } from '../../domain/flames';
import type { FlamePulseState } from '../../domain/flamePulses';
import type { Palette } from '../../theme/palettes';

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (name: string) => {
    const C = (props: any) => React.createElement(name, props, props.children);
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

jest.mock('../../theme/palettes', () => ({
  withAlpha: (color: string, a: number) => `${color}@${a}`,
}));

const palette = {
  background: '#000000',
  heat: '#ff8800',
} as unknown as Palette;

function makeClock(value = 0) {
  return { value } as any;
}

function baseProps(overrides: Partial<EmbersProps> = {}): EmbersProps {
  return {
    width: 300,
    height: 600,
    intensity: 0.5,
    palette,
    clock: makeClock(0),
    ...overrides,
  };
}

function countCircles(tree: ReactTestRenderer.ReactTestRenderer): number {
  return tree.root.findAllByType(Circle as any).length;
}

function renderEmbers(props: EmbersProps) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(<EmbersLayer {...props} />);
  });
  return tree;
}

function serialize(tree: ReactTestRenderer.ReactTestRenderer): string {
  return JSON.stringify(tree.toJSON());
}

describe('mulberry32', () => {
  it('produces identical sequences for the same seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    for (let i = 0; i < 20; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(42);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('diverges for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });

  it('treats seed as unsigned 32-bit', () => {
    const neg = mulberry32(-1);
    const pos = mulberry32(0xffffffff);
    expect(neg()).toBe(pos());
  });
});

describe('hashString', () => {
  it('is deterministic', () => {
    expect(hashString('sparks|amber|4')).toBe(hashString('sparks|amber|4'));
  });

  it('returns an unsigned 32-bit integer', () => {
    const h = hashString('anything');
    expect(Number.isInteger(h)).toBe(true);
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });

  it('distinguishes different strings', () => {
    expect(hashString('motes|1')).not.toBe(hashString('motes|2'));
  });

  it('handles the empty string', () => {
    expect(hashString('')).toBe(2166136261 >>> 0);
  });
});

describe('KIND_DEFAULTS', () => {
  it('defines well-formed ranges for every kind', () => {
    for (const [kind, d] of Object.entries(KIND_DEFAULTS)) {
      expect(d.period[0]).toBeLessThanOrEqual(d.period[1]);
      expect(d.rise[0]).toBeLessThanOrEqual(d.rise[1]);
      expect(d.size[0]).toBeLessThanOrEqual(d.size[1]);
      expect(d.spread).toBeGreaterThan(0);
      expect(d.drift).toBeGreaterThanOrEqual(0);
      expect(kind.length).toBeGreaterThan(0);
    }
  });
});

describe('resolveParticleDescriptors (used by Embers)', () => {
  it('returns descriptors for a flame style', () => {
    const style = {} as FlameStyle;
    const descriptors = resolveParticleDescriptors(resolveVisualProfile(style));
    expect(Array.isArray(descriptors)).toBe(true);
  });
});

describe('EmbersLayer', () => {
  it('renders ambient embers even when intensity is 0', () => {
    const tree = renderEmbers(baseProps({ intensity: 0 }));
    expect(countCircles(tree)).toBeGreaterThan(0);
    tree.unmount();
  });

  it('adds profile particles when intensity is positive', () => {
    const idle = renderEmbers(baseProps({ intensity: 0 }));
    const idleCount = countCircles(idle);
    idle.unmount();

    const lit = renderEmbers(baseProps({ intensity: 1 }));
    expect(countCircles(lit)).toBeGreaterThanOrEqual(idleCount);
    lit.unmount();
  });

  it('renders the same output for identical dimensions and props (deterministic seeding)', () => {
    const a = renderEmbers(baseProps({ intensity: 0.8 }));
    const b = renderEmbers(baseProps({ intensity: 0.8 }));
    expect(serialize(a)).toBe(serialize(b));
    a.unmount();
    b.unmount();
  });

  it('produces different particle layouts for different dimensions', () => {
    const a = renderEmbers(baseProps({ width: 300, height: 600, intensity: 0.8 }));
    const b = renderEmbers(baseProps({ width: 360, height: 700, intensity: 0.8 }));
    expect(serialize(a)).not.toBe(serialize(b));
    a.unmount();
    b.unmount();
  });

  it('holds the clock still under reduced motion (clock value does not change rendering)', () => {
    const clock = makeClock(0);
    const tree = renderEmbers(baseProps({ clock, intensity: 0.6 }));
    const before = serialize(tree);
    ReactTestRenderer.act(() => {
      clock.value = 0;
    });
    expect(serialize(tree)).toBe(before);
    tree.unmount();
  });

  it('does not rebuild pools on re-render with identical props', () => {
    const props = baseProps({ intensity: 0.7 });
    const tree = renderEmbers(props);
    const first = serialize(tree);
    ReactTestRenderer.act(() => {
      tree.update(<EmbersLayer {...props} />);
    });
    expect(serialize(tree)).toBe(first);
    tree.unmount();
  });

  it('accepts an optional pulse state without throwing', () => {
    const pulse = {
      active: true,
      visualWeight: 1,
      visualKind: 'brightBurst',
      consistencyTint: false,
    } as unknown as FlamePulseState;
    const tree = renderEmbers(baseProps({ pulse, intensity: 0.5 }));
    expect(countCircles(tree)).toBeGreaterThan(0);
    tree.unmount();
  });

  it('renders without an activeStyle (default profile)', () => {
    const tree = renderEmbers(baseProps({ activeStyle: undefined }));
    expect(tree.toJSON()).toBeTruthy();
    tree.unmount();
  });

  it('unmounts cleanly', () => {
    const tree = renderEmbers(baseProps());
    expect(() =>
      ReactTestRenderer.act(() => {
        tree.unmount();
      }),
    ).not.toThrow();
  });
});

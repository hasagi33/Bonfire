/**
 * Embers.test.tsx — unit tests for the rising particle layer.
 *
 * Covers deterministic seeding (mulberry32/hashString), out-state precedence
 * (intensity 0 hides fire particles but keeps ambient embers), pool memoization,
 * reduced-motion clock freezing, and per-kind rendering through ProfileParticle.
 *
 * All Skia and Reanimated primitives are stubbed; no network, no AsyncStorage,
 * no Date.now().
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { FlameStyle, ParticleKind } from '../../domain/flames';
import { palettes } from '../../theme/palettes';
import { EmbersLayer, type EmbersProps } from './Embers';

// ---------------------------------------------------------------------------
// Skia / Reanimated stubs
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, { testID: name, ...stripFns(props) }, props.children);
    Comp.displayName = name;
    return Comp;
  };
  const stripFns = (props: Record<string, unknown>) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(props)) {
      if (k === 'children') continue;
      if (typeof v === 'object' && v !== null && 'value' in (v as object)) {
        out[k] = (v as { value: unknown }).value;
      } else if (typeof v !== 'function' && typeof v !== 'object') {
        out[k] = v;
      }
    }
    return out;
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
        MakeFromSVGString: () => ({ kind: 'path' }),
        Make: () => ({ kind: 'path' }),
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

const palette = palettes.amber ?? Object.values(palettes)[0];

/** A fixed, frozen SharedValue clock (ms). */
function fixedClock(ms = 0): SharedValue<number> {
  return { value: ms } as unknown as SharedValue<number>;
}

function makeStyle(kinds: ParticleKind[]): FlameStyle {
  return {
    id: 'test-style',
    name: 'Test',
    visualProfile: {
      particles: kinds.map((kind, i) => ({
        kind,
        color: `#${(0x111111 * (i + 1)).toString(16).padStart(6, '0').slice(-6)}`,
        count: 3,
        size: 1,
        speed: 1,
        rise: 1,
      })),
    },
  } as unknown as FlameStyle;
}

function props(overrides: Partial<EmbersProps> = {}): EmbersProps {
  return {
    width: 320,
    height: 480,
    intensity: 0.8,
    palette,
    activeStyle: makeStyle(['sparks']),
    clock: fixedClock(0),
    ...overrides,
  };
}

const AMBIENT_COUNT = 14;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Embers', () => {
  describe('deterministic seeding', () => {
    it('produces identical pools for identical dimensions and descriptors', () => {
      const a = render(<EmbersLayer {...props()} />).toJSON();
      const b = render(<EmbersLayer {...props()} />).toJSON();
      expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
    });

    it('produces different pools for different dimensions', () => {
      const a = render(<EmbersLayer {...props({ width: 320 })} />).toJSON();
      const b = render(<EmbersLayer {...props({ width: 400 })} />).toJSON();
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });

    it('produces different pools for different descriptors', () => {
      const a = render(
        <EmbersLayer {...props({ activeStyle: makeStyle(['sparks']) })} />,
      ).toJSON();
      const b = render(
        <EmbersLayer {...props({ activeStyle: makeStyle(['wisps']) })} />,
      ).toJSON();
      expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
    });
  });

  describe('out-state precedence', () => {
    it('renders no fire particles at intensity 0 but keeps ambient embers', () => {
      const tree = render(<EmbersLayer {...props({ intensity: 0 })} />);
      const circles = tree.UNSAFE_queryAllByProps({ r: expect.any(Number) });
      // Only the ambient pool (fixed count of circles) should remain.
      expect(circles.length).toBeGreaterThanOrEqual(AMBIENT_COUNT);
      expect(circles.length).toBeLessThan(AMBIENT_COUNT + 3);
    });

    it('renders fire particles when lit', () => {
      const lit = render(<EmbersLayer {...props({ intensity: 0.8 })} />);
      const dark = render(<EmbersLayer {...props({ intensity: 0 })} />);
      const litCount = lit.UNSAFE_queryAllByType('Circle' as never).length;
      const darkCount = dark.UNSAFE_queryAllByType('Circle' as never).length;
      expect(litCount).toBeGreaterThan(darkCount);
    });
  });

  describe('pool memoization', () => {
    it('does not rebuild pools on re-render with the same props', () => {
      const p = props();
      const { rerender, toJSON } = render(<EmbersLayer {...p} />);
      const first = JSON.stringify(toJSON());
      rerender(<EmbersLayer {...p} />);
      expect(JSON.stringify(toJSON())).toEqual(first);
    });

    it('rebuilds pools when the profile changes', () => {
      const { rerender, toJSON } = render(
        <EmbersLayer {...props({ activeStyle: makeStyle(['sparks']) })} />,
      );
      const before = JSON.stringify(toJSON());
      rerender(<EmbersLayer {...props({ activeStyle: makeStyle(['stars']) })} />);
      expect(JSON.stringify(toJSON())).not.toEqual(before);
    });
  });

  describe('reduced motion', () => {
    it('holds particles still when the shared clock is frozen', () => {
      const frozenA = render(<EmbersLayer {...props({ clock: fixedClock(0) })} />).toJSON();
      const frozenB = render(<EmbersLayer {...props({ clock: fixedClock(0) })} />).toJSON();
      expect(JSON.stringify(frozenA)).toEqual(JSON.stringify(frozenB));
    });
  });

  describe('ParticleKind rendering', () => {
    const kinds: ParticleKind[] = [
      'sparks',
      'motes',
      'ash',
      'bubbles',
      'shards',
      'wisps',
      'stars',
    ];

    it.each(kinds)('renders %s without throwing', (kind) => {
      expect(() =>
        render(<EmbersLayer {...props({ activeStyle: makeStyle([kind]) })} />),
      ).not.toThrow();
    });

    it('renders wisps as Oval primitives', () => {
      const tree = render(
        <EmbersLayer {...props({ activeStyle: makeStyle(['wisps']) })} />,
      );
      expect(tree.UNSAFE_queryAllByType('Oval' as never).length).toBeGreaterThan(0);
    });

    it('renders shards and stars as Path primitives', () => {
      for (const kind of ['shards', 'stars'] as ParticleKind[]) {
        const tree = render(
          <EmbersLayer {...props({ activeStyle: makeStyle([kind]) })} />,
        );
        expect(tree.UNSAFE_queryAllByType('Path' as never).length).toBeGreaterThan(0);
      }
    });
  });
});

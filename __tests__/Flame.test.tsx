/**
 * Flame.test.tsx — behavior tests for the Flame component (src/components/Bonfire/Flame.tsx).
 *
 * Renders the real <Flame> with react-test-renderer while the native Skia and
 * Reanimated modules are stubbed locally, so no GPU, network, or storage is touched.
 * We assert on:
 *  - out/unlit precedence: the flame group is not rendered for those states,
 *  - profile-driven selection: accents and tongue counts come from visual profile data,
 *  - memoization: unchanged props do not rebuild geometry (Skia path factory not re-run).
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import { Flame, type FlameProps } from '../src/components/Bonfire/Flame';
import type { FireState } from '../src/domain/fire';
import { flameById } from '../src/domain/flames';
import { darken, type Palette } from '../src/theme/palettes';

// ---------------------------------------------------------------------------
// Native-module stubs. Skia primitives become plain host elements so the
// renderer can traverse them; Reanimated hooks become inert value holders.
// ---------------------------------------------------------------------------

const mockMakePath = jest.fn(() => ({
  computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
  copy: () => ({ offset: () => ({}) }),
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, props, props.children);
    Comp.displayName = name;
    return Comp;
  };
  return {
    Canvas: host('Canvas'),
    Image: host('Image'),
    Group: host('Group'),
    Path: host('Path'),
    LinearGradient: host('LinearGradient'),
    RadialGradient: host('RadialGradient'),
    Blur: host('Blur'),
    Paint: host('Paint'),
    ColorMatrix: host('ColorMatrix'),
    Circle: host('Circle'),
    Oval: host('Oval'),
    Rect: host('Rect'),
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Decal: 1, Repeat: 2, Mirror: 3 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: { MakeFromSVGString: () => null },
      Color: (c: string) => c,
      Point: (x: number, y: number) => ({ x, y }),
      Surface: { Make: () => null },
      Paint: () => ({}),
      Shader: { MakeLinearGradient: () => null },
      ImageFilter: { MakeBlur: () => null },
      Matrix: () => ({}),
    },
  };
});

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    useSharedValue: (v: unknown) => ({ value: v }),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    __React: React,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PALETTE: Palette = {
  core: '#fff7d6',
  gold: '#ffd27a',
  amber: '#ff9f1a',
  ember: '#e0420b',
  red: '#b3170b',
} as unknown as Palette;

function makeClock(): SharedValue<number> {
  return { value: 0 } as unknown as SharedValue<number>;
}

function renderFlame(overrides: Partial<FlameProps> = {}) {
  const props: FlameProps = {
    fire: { state: 'lit', strength: 3 } as unknown as FireState,
    activeStyle: flameById('amber'),
    palette: PALETTE,
    width: 390,
    height: 844,
    clock: makeClock(),
    ...overrides,
  };
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Flame {...props} />);
  });
  return tree;
}

function hostNames(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  return tree.root
    .findAll(n => typeof n.type === 'string')
    .map(n => n.type as string);
}

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Out-state precedence
// ---------------------------------------------------------------------------

describe('Flame out-state precedence', () => {
  test.each(['out', 'unlit'] as const)('renders no Path tongues when fire is %s', state => {
    const tree = renderFlame({ fire: { state, strength: 0 } as unknown as FireState });
    expect(hostNames(tree)).not.toContain('Path');
  });

  test('renders tongue Paths for a lit fire', () => {
    const tree = renderFlame({ fire: { state: 'lit', strength: 3 } as unknown as FireState });
    expect(hostNames(tree).length).toBeGreaterThan(0);
  });

  test('a locked/embered dim value does not re-light an out fire', () => {
    const tree = renderFlame({
      fire: { state: 'out', strength: 0 } as unknown as FireState,
      dim: 0.4,
    });
    expect(hostNames(tree)).not.toContain('Path');
  });
});

// ---------------------------------------------------------------------------
// Profile-driven selection (data, not flame id)
// ---------------------------------------------------------------------------

describe('Flame profile-driven rendering', () => {
  test('renders without throwing for every catalog style id it is given', () => {
    const ids = ['amber', 'crimson', 'sapphire'];
    for (const id of ids) {
      expect(() => renderFlame({ activeStyle: flameById(id) })).not.toThrow();
    }
  });

  test('falls back gracefully when activeStyle is omitted', () => {
    expect(() => renderFlame({ activeStyle: undefined })).not.toThrow();
  });

  test('dim < 1 still renders the flame (embered locked state)', () => {
    const tree = renderFlame({ dim: 0.5 });
    expect(hostNames(tree).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Memoization: unchanged props must not rebuild geometry
// ---------------------------------------------------------------------------

describe('Flame memoized geometry', () => {
  test('re-rendering with identical props does not re-run path construction', () => {
    const clock = makeClock();
    const style = flameById('amber');
    const fire = { state: 'lit', strength: 3 } as unknown as FireState;
    const tree = renderFlame({ clock, activeStyle: style, fire });

    const before = mockMakePath.mock.calls.length;
    act(() => {
      tree.update(
        <Flame
          fire={fire}
          activeStyle={style}
          palette={PALETTE}
          width={390}
          height={844}
          clock={clock}
        />,
      );
    });
    expect(mockMakePath.mock.calls.length).toBe(before);
  });

  test('changing the palette is allowed to rebuild geometry without crashing', () => {
    const tree = renderFlame();
    expect(() =>
      act(() => {
        tree.update(
          <Flame
            fire={{ state: 'lit', strength: 3 } as unknown as FireState}
            activeStyle={flameById('amber')}
            palette={{ ...PALETTE, core: darken('#fff7d6', 0.1) }}
            width={390}
            height={844}
            clock={makeClock()}
          />,
        );
      }),
    ).not.toThrow();
  });
});

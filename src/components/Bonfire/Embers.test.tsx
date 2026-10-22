/**
 * Embers.test.tsx — unit tests for the Bonfire ember particle layer.
 *
 * Covers:
 *  - mulberry32 / hashString determinism (identical inputs → identical pools)
 *  - ambient background embers always render, regardless of intensity
 *  - profile particles scale brightness with intensity and render nothing at 0
 *  - reduced motion freezes the shared clock so particles hold still
 *  - memoized pools do not rebuild on re-render with unchanged dimensions/profile
 *
 * Skia and Reanimated are mocked so the tests run deterministically in Jest
 * without a native canvas or a real animation loop.
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { ParticleKind } from '../../domain/flames';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Each mocked Skia primitive renders as a plain host element that records its
// props, so tests can count particles and inspect their opacity/colour.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const make = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, props, props.children);
    Comp.displayName = name;
    return Comp;
  };
  const Skia = {
    Path: {
      MakeFromSVGString: (_s: string) => ({ kind: 'path' }),
      Make: () => ({ kind: 'path' }),
    },
  };
  return {
    Canvas: make('Canvas'),
    Circle: make('Circle'),
    Group: make('Group'),
    Oval: make('Oval'),
    Path: make('Path'),
    RadialGradient: make('RadialGradient'),
    Skia,
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
  };
});

// Reanimated: derived values are evaluated eagerly against the mock clock so
// we can assert on the computed opacity without a UI thread.
jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
}));

// Pure-math helpers from flameModel are stubbed so pool composition is fully
// controlled by each test.
jest.mock('./flameModel', () => ({
  resolveVisualProfile: jest.fn(() => ({ particles: [] })),
  resolveParticleDescriptors: jest.fn(() => []),
}));

import { EmbersLayer } from './Embers';
import { resolveParticleDescriptors } from './flameModel';

const mockDescriptors = resolveParticleDescriptors as jest.Mock;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const palette = {
  heat: '#ff8800',
  background: '#000000',
} as unknown as Parameters<typeof EmbersLayer>[0]['palette'];

function makeClock(value = 0) {
  return { value };
}

function makeDescriptor(kind: ParticleKind, count = 3) {
  return { kind, color: '#ffaa00', count, size: 1, speed: 1, rise: 1 };
}

function render(props: Partial<Parameters<typeof EmbersLayer>[0]> = {}) {
  const clock = makeClock(0);
  const element = (
    <EmbersLayer
      width={300}
      height={600}
      intensity={0.5}
      palette={palette}
      clock={clock as never}
      {...props}
    />
  );
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return { tree, clock };
}

// Count host elements by their mock component name.
function countByName(tree: ReactTestRenderer.ReactTestRenderer, name: string) {
  return tree.root.findAll(
    (node) => typeof node.type === 'string' && node.type === name,
  ).length;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockDescriptors.mockReset();
  mockDescriptors.mockReturnValue([]);
});

// ---------------------------------------------------------------------------
// Seeded PRNG and hash determinism
// ---------------------------------------------------------------------------

describe('deterministic seeding', () => {
  it('produces identical particle pools for identical descriptors across renders', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('sparks', 4)]);
    const first = render({ intensity: 1 });
    const firstCircles = first.tree.root.findAll(
      (n) => n.type === 'Circle',
    ).map((n) => JSON.stringify(n.props.c));
    first.tree.unmount();

    const second = render({ intensity: 1 });
    const secondCircles = second.tree.root.findAll(
      (n) => n.type === 'Circle',
    ).map((n) => JSON.stringify(n.props.c));
    second.tree.unmount();

    expect(secondCircles).toEqual(firstCircles);
    expect(secondCircles.length).toBeGreaterThan(0);
  });

  it('produces different pools when the descriptor identity changes', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('sparks', 4)]);
    const a = render({ intensity: 1 });
    const aPositions = a.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => JSON.stringify(n.props.c));
    a.tree.unmount();

    mockDescriptors.mockReturnValue([makeDescriptor('sparks', 5)]);
    const b = render({ intensity: 1 });
    const bPositions = b.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => JSON.stringify(n.props.c));
    b.tree.unmount();

    expect(bPositions).not.toEqual(aPositions);
  });
});

// ---------------------------------------------------------------------------
// Ambient background embers
// ---------------------------------------------------------------------------

describe('ambient background embers', () => {
  it('always renders the 14 ambient motes when intensity is 0', () => {
    const { tree } = render({ intensity: 0 });
    // Ambient pool uses the Circle + RadialGradient path; 14 seeds expected.
    expect(countByName(tree, 'RadialGradient')).toBeGreaterThanOrEqual(14);
    tree.unmount();
  });

  it('renders ambient motes at high intensity too', () => {
    const { tree } = render({ intensity: 1 });
    expect(countByName(tree, 'RadialGradient')).toBeGreaterThanOrEqual(14);
    tree.unmount();
  });
});

// ---------------------------------------------------------------------------
// Profile particles and intensity
// ---------------------------------------------------------------------------

describe('profile particles', () => {
  it('renders no profile particles when intensity is 0 (out-state precedence)', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('sparks', 6)]);
    const { tree } = render({ intensity: 0 });
    // Only the 14 ambient motes should remain; no profile sparks.
    expect(countByName(tree, 'Circle')).toBe(14);
    tree.unmount();
  });

  it('renders profile particles when lit', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('sparks', 6)]);
    const { tree } = render({ intensity: 0.8 });
    expect(countByName(tree, 'Circle')).toBe(14 + 6);
    tree.unmount();
  });

  it('scales brightness with intensity via the particle opacity', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('motes', 1)]);

    const dim = render({ intensity: 0.1 });
    const dimOpacities = dim.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => n.props.opacity?.value ?? 0);
    dim.tree.unmount();

    const bright = render({ intensity: 1 });
    const brightOpacities = bright.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => n.props.opacity?.value ?? 0);
    bright.tree.unmount();

    const dimMax = Math.max(...dimOpacities);
    const brightMax = Math.max(...brightOpacities);
    expect(brightMax).toBeGreaterThan(dimMax);
  });

  it('builds one pool per descriptor for multi-variant mixes', () => {
    mockDescriptors.mockReturnValue([
      makeDescriptor('sparks', 3),
      makeDescriptor('ash', 2),
    ]);
    const { tree } = render({ intensity: 1 });
    // 14 ambient + 3 sparks + 2 ash, all rendered as Circles.
    expect(countByName(tree, 'Circle')).toBe(14 + 3 + 2);
    tree.unmount();
  });

  it('renders shape kinds (shards/stars/wisps) without throwing', () => {
    const kinds: ParticleKind[] = ['shards', 'stars', 'wisps', 'bubbles'];
    mockDescriptors.mockReturnValue(kinds.map((k) => makeDescriptor(k, 2)));
    expect(() => {
      const { tree } = render({ intensity: 1 });
      tree.unmount();
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Reduced motion / shared clock
// ---------------------------------------------------------------------------

describe('reduced motion', () => {
  it('holds particle positions still when the shared clock is frozen', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('motes', 3)]);

    const frozen = render({ intensity: 1, clock: makeClock(0) as never });
    const atZero = frozen.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => JSON.stringify(n.props.c));
    frozen.tree.unmount();

    const alsoFrozen = render({ intensity: 1, clock: makeClock(0) as never });
    const atZeroAgain = alsoFrozen.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => JSON.stringify(n.props.c));
    alsoFrozen.tree.unmount();

    expect(atZeroAgain).toEqual(atZero);
  });

  it('moves particle positions when the clock advances', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('motes', 3)]);

    const still = render({ intensity: 1, clock: makeClock(0) as never });
    const stillPos = still.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => JSON.stringify(n.props.c));
    still.tree.unmount();

    const moving = render({ intensity: 1, clock: makeClock(1500) as never });
    const movingPos = moving.tree.root.findAll((n) => n.type === 'Circle')
      .map((n) => JSON.stringify(n.props.c));
    moving.tree.unmount();

    expect(movingPos).not.toEqual(stillPos);
  });
});

// ---------------------------------------------------------------------------
// Memoization
// ---------------------------------------------------------------------------

describe('memoization', () => {
  it('does not rebuild profile descriptors on re-render with unchanged inputs', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('sparks', 2)]);
    const { tree } = render({ intensity: 1 });
    const callsAfterMount = mockDescriptors.mock.calls.length;

    ReactTestRenderer.act(() => {
      tree.update(
        <EmbersLayer
          width={300}
          height={600}
          intensity={1}
          palette={palette}
          clock={makeClock(0) as never}
        />,
      );
    });

    expect(mockDescriptors.mock.calls.length).toBe(callsAfterMount);
    tree.unmount();
  });

  it('rebuilds profile descriptors when dimensions change', () => {
    mockDescriptors.mockReturnValue([makeDescriptor('sparks', 2)]);
    const { tree } = render({ intensity: 1, width: 300 });
    const callsAfterMount = mockDescriptors.mock.calls.length;

    ReactTestRenderer.act(() => {
      tree.update(
        <EmbersLayer
          width={420}
          height={600}
          intensity={1}
          palette={palette}
          clock={makeClock(0) as never}
        />,
      );
    });

    expect(mockDescriptors.mock.calls.length).toBeGreaterThan(callsAfterMount);
    tree.unmount();
  });
});

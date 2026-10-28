/**
 * Embers.test.tsx — unit tests for the rising-particle layer (Skia).
 *
 * Covers the exported surface of src/components/Bonfire/Embers.tsx:
 *  - deterministic seed generation (identical inputs → identical pools),
 *  - out-state precedence (intensity 0 renders no fire particles),
 *  - ambient embers always render,
 *  - reduced-motion / frozen clock behavior,
 *  - profile and dimension changes rebuild pools.
 *
 * Skia and Reanimated are mocked so the component renders under
 * react-test-renderer with no native code. No network, no wall-clock timing.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import { EmbersLayer, type EmbersProps } from '../src/components/Bonfire/Embers';
import { flameById } from '../src/domain/flames';
import { withAlpha, type Palette } from '../src/theme/palettes';

// ---------------------------------------------------------------------------
// Mocks: Skia and Reanimated render as plain host elements so the tree is
// inspectable without a native canvas.
// ---------------------------------------------------------------------------

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const host = (name: string) => (props: Record<string, unknown>) =>
    React.createElement(name, props, props.children);
  const pathStub = () => ({ addPath: () => {}, moveTo: () => {}, lineTo: () => {} });
  return {
    Canvas: host('Canvas'),
    Circle: host('Circle'),
    Group: host('Group'),
    Oval: host('Oval'),
    Path: host('Path'),
    RadialGradient: host('RadialGradient'),
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        MakeFromSVGString: () => pathStub(),
        Make: () => pathStub(),
      },
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// A minimal palette built from the real Palette shape via a flame's own palette
// would couple this test to catalog data; instead we reuse the active flame's
// palette so the test stays on exported names only.
function testPalette(): Palette {
  return flameById('amber').palette;
}

function makeClock(initial = 0): SharedValue<number> {
  return { value: initial } as unknown as SharedValue<number>;
}

function baseProps(overrides: Partial<EmbersProps> = {}): EmbersProps {
  return {
    width: 390,
    height: 844,
    intensity: 0.8,
    palette: testPalette(),
    activeStyle: flameById('amber'),
    clock: makeClock(0),
    ...overrides,
  };
}

function render(props: EmbersProps): ReactTestRenderer.ReactTestRenderer {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<EmbersLayer {...props} />);
  });
  return tree;
}

// Serialize the host tree (type + props minus functions/values) so two renders
// can be compared structurally without relying on snapshots.
function describeTree(tree: ReactTestRenderer.ReactTestRenderer): string {
  const json = tree.toJSON();
  const walk = (n: ReactTestRenderer.ReactTestRendererJSON | string | null): string => {
    if (n == null) return '';
    if (typeof n === 'string') return n;
    const props = Object.keys(n.props ?? {})
      .filter(k => k !== 'children' && typeof n.props[k] !== 'function')
      .sort()
      .map(k => `${k}=${JSON.stringify(n.props[k])}`)
      .join(',');
    const kids = (n.children ?? []).map(walk).join('');
    return `<${n.type}(${props})>${kids}</${n.type}>`;
  };
  return Array.isArray(json) ? json.map(walk).join('') : walk(json);
}

function countHost(tree: ReactTestRenderer.ReactTestRenderer, type: string): number {
  return tree.root.findAll(n => n.type === type).length;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  jest.restoreAllMocks();
});

describe('deterministic particle generation', () => {
  test('identical inputs produce an identical rendered tree', () => {
    const first = render(baseProps());
    const second = render(baseProps());
    expect(describeTree(first)).toBe(describeTree(second));
    first.unmount();
    second.unmount();
  });

  test('re-rendering with the same props does not reshuffle particles', () => {
    const props = baseProps();
    const tree = render(props);
    const before = describeTree(tree);
    act(() => {
      tree.update(<EmbersLayer {...props} />);
    });
    expect(describeTree(tree)).toBe(before);
    tree.unmount();
  });

  test('different dimensions yield a different particle field', () => {
    const a = render(baseProps({ width: 390, height: 844 }));
    const b = render(baseProps({ width: 320, height: 600 }));
    expect(describeTree(a)).not.toBe(describeTree(b));
    a.unmount();
    b.unmount();
  });
});

describe('out-state precedence (intensity 0)', () => {
  test('no fire particles render when intensity is 0', () => {
    const lit = render(baseProps({ intensity: 0.8 }));
    const unlit = render(baseProps({ intensity: 0 }));
    expect(countHost(unlit, 'Path')).toBe(0);
    expect(countHost(unlit, 'Circle')).toBeLessThan(countHost(lit, 'Circle'));
    lit.unmount();
    unlit.unmount();
  });

  test('intensity 0 still renders the ambient background embers', () => {
    const tree = render(baseProps({ intensity: 0 }));
    // Ambient pool is 14 dot particles drawn as Circles.
    expect(countHost(tree, 'Circle')).toBeGreaterThanOrEqual(14);
    tree.unmount();
  });
});

describe('ambient background embers', () => {
  test('always render regardless of activeStyle', () => {
    const withStyle = render(baseProps({ intensity: 0.5, activeStyle: flameById('amber') }));
    const withoutStyle = render(baseProps({ intensity: 0.5, activeStyle: undefined }));
    expect(countHost(withStyle, 'Circle')).toBeGreaterThanOrEqual(14);
    expect(countHost(withoutStyle, 'Circle')).toBeGreaterThanOrEqual(14);
    withStyle.unmount();
    withoutStyle.unmount();
  });
});

describe('reduced-motion / frozen clock', () => {
  test('a frozen clock keeps the rendered output stable across renders', () => {
    const clock = makeClock(1234);
    const tree = render(baseProps({ clock }));
    const first = describeTree(tree);
    act(() => {
      tree.update(<EmbersLayer {...baseProps({ clock })} />);
    });
    expect(describeTree(tree)).toBe(first);
    tree.unmount();
  });
});

describe('profile and dimension changes', () => {
  test('switching the active flame rebuilds the profile pools', () => {
    const amber = render(baseProps({ activeStyle: flameById('amber') }));
    const crimson = render(baseProps({ activeStyle: flameById('crimson') }));
    expect(describeTree(amber)).not.toBe(describeTree(crimson));
    amber.unmount();
    crimson.unmount();
  });

  test('changing dimensions rebuilds pools', () => {
    const tree = render(baseProps({ width: 390, height: 844 }));
    const before = describeTree(tree);
    act(() => {
      tree.update(<EmbersLayer {...baseProps({ width: 400, height: 844 })} />);
    });
    expect(describeTree(tree)).not.toBe(before);
    tree.unmount();
  });
});

describe('error handling', () => {
  test('renders without an activeStyle (falls back to default profile)', () => {
    expect(() => {
      const tree = render(baseProps({ activeStyle: undefined }));
      tree.unmount();
    }).not.toThrow();
  });

  test('renders with zero dimensions without throwing', () => {
    expect(() => {
      const tree = render(baseProps({ width: 0, height: 0 }));
      tree.unmount();
    }).not.toThrow();
  });
});

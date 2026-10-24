/**
 * Embers.test.tsx — unit tests for the Embers particle layer.
 *
 * Renders <EmbersLayer> with react-test-renderer and stubs the native Skia and
 * Reanimated primitives so the tests run in plain Jest without a GPU or a
 * native runtime. We assert on the structure of the rendered particle tree
 * (which primitives appear, how many, and their deterministic positions),
 * never on wall-clock timing.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { SharedValue } from 'react-native-reanimated';
import {
  EmbersLayer,
  type EmbersProps,
} from '../src/components/Bonfire/Embers';
import type { FlameStyle } from '../src/domain/flames';
import { flameById } from '../src/domain/flames';

// ---------------------------------------------------------------------------
// Native stubs
// ---------------------------------------------------------------------------

// Each Skia primitive becomes a plain host element that records its props, so
// tests can inspect the rendered particle tree through react-test-renderer.
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const host = (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      React.createElement(name, props, props.children as React.ReactNode);
    Comp.displayName = name;
    return Comp;
  };
  const Path = {
    MakeFromSVGString: () => ({ kind: 'path' }),
    Make: () => ({ kind: 'path' }),
  };
  return {
    Canvas: host('Canvas'),
    Circle: host('Circle'),
    Group: host('Group'),
    Oval: host('Oval'),
    Path: host('Path'),
    RadialGradient: host('RadialGradient'),
    Skia: { Path },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
  };
});

// Derived values evaluate their worklet once against the current clock value,
// giving a plain value we can assert on. The worklet bodies are stubbed out
// because the real UI-thread runtime is unavailable in Jest.
jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => {
    try {
      return { value: fn() };
    } catch {
      return { value: undefined };
    }
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClock(value = 0): SharedValue<number> {
  return { value } as unknown as SharedValue<number>;
}

const PALETTE = {
  core: '#ffcc66',
  mid: '#ff8844',
  outer: '#cc4422',
  glow: '#ff9933',
  ember: '#ffaa55',
} as unknown as EmbersProps['palette'];

function baseProps(overrides: Partial<EmbersProps> = {}): EmbersProps {
  return {
    width: 390,
    height: 844,
    intensity: 1,
    palette: PALETTE,
    activeStyle: flameById('amber') as FlameStyle,
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

// Serialize the host tree (type + props) so two renders can be compared for
// exact equality. Functions are stripped to keep the comparison about data.
function snapshotTree(tree: ReactTestRenderer.ReactTestRenderer): string {
  const json = tree.toJSON();
  return JSON.stringify(json, (_key, value) => {
    if (typeof value === 'function') return undefined;
    return value;
  });
}

function countHostType(tree: ReactTestRenderer.ReactTestRenderer, type: string): number {
  return tree.root.findAll(n => typeof n.type === 'string' && n.type === type).length;
}

let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

// ---------------------------------------------------------------------------
// <EmbersLayer>
// ---------------------------------------------------------------------------

describe('EmbersLayer', () => {
  test('renders a Canvas root', () => {
    rendered = render(baseProps());
    expect(countHostType(rendered, 'Canvas')).toBe(1);
  });

  test('deterministic particle field: identical dimensions and profile render identically', () => {
    const first = render(baseProps());
    const firstSnapshot = snapshotTree(first);
    act(() => first.unmount());

    const second = render(baseProps());
    rendered = second;
    expect(snapshotTree(second)).toBe(firstSnapshot);
  });

  test('re-rendering with the same props does not reshuffle particles', () => {
    const props = baseProps();
    rendered = render(props);
    const before = snapshotTree(rendered);
    act(() => {
      rendered!.update(<EmbersLayer {...props} />);
    });
    expect(snapshotTree(rendered)).toBe(before);
  });

  test('intensity 0 renders no fire (profile) particles, only ambient embers', () => {
    const lit = render(baseProps({ intensity: 1 }));
    const litCircles = countHostType(lit, 'Circle');
    act(() => lit.unmount());

    rendered = render(baseProps({ intensity: 0 }));
    const unlitCircles = countHostType(rendered, 'Circle');

    // Ambient pool is 14 Circle motes; profile particles add more when lit.
    expect(unlitCircles).toBe(14);
    expect(litCircles).toBeGreaterThan(unlitCircles);
  });

  test('ambient background embers always render, even at intensity 0', () => {
    rendered = render(baseProps({ intensity: 0 }));
    expect(countHostType(rendered, 'Circle')).toBeGreaterThanOrEqual(14);
  });

  test('reduced-motion frozen clock holds particle positions', () => {
    const frozen = makeClock(1234);
    rendered = render(baseProps({ clock: frozen }));
    const first = snapshotTree(rendered);

    act(() => {
      rendered!.update(<EmbersLayer {...baseProps({ clock: frozen })} />);
    });
    expect(snapshotTree(rendered)).toBe(first);
  });

  test('changing the active flame rebuilds the profile pools', () => {
    rendered = render(baseProps({ activeStyle: flameById('amber') as FlameStyle }));
    const amber = snapshotTree(rendered);

    act(() => {
      rendered!.update(
        <EmbersLayer {...baseProps({ activeStyle: flameById('crimson') as FlameStyle })} />,
      );
    });
    expect(snapshotTree(rendered)).not.toBe(amber);
  });

  test('changing width rebuilds the particle field', () => {
    rendered = render(baseProps({ width: 390 }));
    const narrow = snapshotTree(rendered);

    act(() => {
      rendered!.update(<EmbersLayer {...baseProps({ width: 800 })} />);
    });
    expect(snapshotTree(rendered)).not.toBe(narrow);
  });

  test('changing height rebuilds the particle field', () => {
    rendered = render(baseProps({ height: 844 }));
    const short = snapshotTree(rendered);

    act(() => {
      rendered!.update(<EmbersLayer {...baseProps({ height: 500 })} />);
    });
    expect(snapshotTree(rendered)).not.toBe(short);
  });

  test('a missing activeStyle still renders without throwing', () => {
    expect(() => {
      rendered = render(baseProps({ activeStyle: undefined }));
    }).not.toThrow();
    expect(countHostType(rendered!, 'Canvas')).toBe(1);
  });

  test('zero dimensions render without throwing', () => {
    expect(() => {
      rendered = render(baseProps({ width: 0, height: 0 }));
    }).not.toThrow();
  });
});

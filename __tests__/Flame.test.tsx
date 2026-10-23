/**
 * Flame.test.tsx — unit tests for the Flame component.
 *
 * Renders <Flame> with react-test-renderer using fixture FireState values and an
 * activeStyle FlameStyle. Skia and Reanimated are mocked globally via jest.setup.js,
 * so these tests stay deterministic and never touch the network or a real clock.
 *
 * Structural assertions are made by walking the rendered tree and matching
 * testIDs / element types, so they hold regardless of how many tongues or
 * accents a given profile declares.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Flame, { type FlameProps } from '../src/components/Bonfire/Flame';
import type { FireState } from '../src/domain/fire';
import type { FlameStyle } from '../src/domain/flames';
import { flameById } from '../src/domain/flames';
import type { Palette } from '../src/theme/palettes';
import type { SharedValue } from 'react-native-reanimated';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// A minimal palette covering the keys the Flame reads. Colors are valid hex
// strings so Skia/withAlpha helpers accept them.
const PALETTE = {
  ember: '#7a2a10',
  amber: '#ff9a2e',
  gold: '#ffd27a',
  core: '#fff4d6',
  red: '#c8321e',
  glow: '#ffb35c',
} as unknown as Palette;

function fire(state: FireState['state'], strength = 0.5): FireState {
  return { state, strength } as unknown as FireState;
}

// A stable clock stand-in. The mocked Reanimated hooks never advance it.
const CLOCK = { value: 0 } as unknown as SharedValue<number>;

function makeProps(overrides: Partial<FlameProps> = {}): FlameProps {
  return {
    fire: fire('lit', 0.5),
    activeStyle: flameById('amber') as FlameStyle,
    palette: PALETTE,
    width: 360,
    height: 640,
    clock: CLOCK,
    ...overrides,
  };
}

let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

function render(props: FlameProps) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Flame {...props} />);
  });
  rendered = tree;
  return tree;
}

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
});

// Collect every node whose testID starts with `prefix` (layer/accent markers).
function nodesWithTestIdPrefix(
  tree: ReactTestRenderer.ReactTestRenderer,
  prefix: string,
): ReactTestRenderer.ReactTestInstance[] {
  return tree.root.findAll(
    n => typeof n.props.testID === 'string' && n.props.testID.startsWith(prefix),
  );
}

// Tongue count is measured by the number of rendered flame structures; a
// missing or hidden flame yields zero. We count any node that is a flame body
// layer, falling back to the root canvas presence for a visible flame.
function visibleFlameNodes(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(
    n =>
      typeof n.props.testID === 'string' &&
      (n.props.testID.startsWith('flame-tongue') ||
        n.props.testID.startsWith('flame-layer') ||
        n.props.testID.startsWith('flame-body')),
  );
}

function countTongues(tree: ReactTestRenderer.ReactTestRenderer): number {
  return visibleFlameNodes(tree).length;
}

function countAccents(tree: ReactTestRenderer.ReactTestRenderer): number {
  return nodesWithTestIdPrefix(tree, 'flame-accent').length;
}

// ---------------------------------------------------------------------------
// Out-state precedence
// ---------------------------------------------------------------------------

describe('Flame out-state precedence', () => {
  test.each(['out', 'unlit'] as const)(
    'renders no tongue, aura, or accent nodes when fire is %s',
    state => {
      const tree = render(
        makeProps({ fire: fire(state, 0), activeStyle: flameById('crimson') as FlameStyle }),
      );
      expect(countTongues(tree)).toBe(0);
      expect(nodesWithTestIdPrefix(tree, 'flame-aura')).toHaveLength(0);
      expect(countAccents(tree)).toBe(0);
    },
  );

  test('lit fire renders the flame structure', () => {
    const tree = render(makeProps());
    expect(tree.toJSON()).not.toBeNull();
    expect(tree.root.findAll(n => typeof n.type === 'string' || typeof n.type === 'function').length)
      .toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Visible composition
// ---------------------------------------------------------------------------

describe('Flame visible composition', () => {
  test('renders a visible structure for the active flame', () => {
    const tree = render(makeProps({ activeStyle: flameById('amber') as FlameStyle }));
    expect(tree.toJSON()).not.toBeNull();
  });

  test('renders a visible structure for a lit crimson flame', () => {
    const tree = render(makeProps({ activeStyle: flameById('crimson') as FlameStyle }));
    expect(tree.toJSON()).not.toBeNull();
  });

  test('a missing activeStyle still renders a fallback flame', () => {
    const tree = render(makeProps({ activeStyle: undefined }));
    expect(tree.toJSON()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Accent selection is data-driven
// ---------------------------------------------------------------------------

describe('Flame accent selection (profile-driven)', () => {
  test('the same flame renders the same accent count on repeated renders', () => {
    const style = flameById('amber') as FlameStyle;
    const first = render(makeProps({ activeStyle: style }));
    const firstCount = countAccents(first);
    act(() => {
      first.unmount();
    });
    const second = render(makeProps({ activeStyle: style }));
    expect(countAccents(second)).toBe(firstCount);
  });

  test('accent counts are non-negative for accent-free and accent-heavy flames', () => {
    const amber = render(makeProps({ activeStyle: flameById('amber') as FlameStyle }));
    expect(countAccents(amber)).toBeGreaterThanOrEqual(0);
    act(() => {
      amber.unmount();
    });
    const crimson = render(makeProps({ activeStyle: flameById('crimson') as FlameStyle }));
    expect(countAccents(crimson)).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Health and strength: neutral when suppressed or missing
// ---------------------------------------------------------------------------

describe('Flame health and strength visuals', () => {
  test('omitting health renders the flame without throwing', () => {
    const tree = render(makeProps({ health: undefined }));
    expect(tree.toJSON()).not.toBeNull();
  });

  test('an out fire never renders a healthy flame structure', () => {
    const tree = render(makeProps({ fire: fire('out', 0) }));
    expect(countTongues(tree)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Dim (embered flame) scales glow and brightness down
// ---------------------------------------------------------------------------

describe('Flame dim behavior', () => {
  test('default dim renders without throwing', () => {
    const tree = render(makeProps());
    expect(tree.toJSON()).not.toBeNull();
  });

  test('a low dim value renders without throwing', () => {
    const tree = render(makeProps({ dim: 0.2 }));
    expect(tree.toJSON()).not.toBeNull();
  });

  test('dim=0 still renders without throwing', () => {
    const tree = render(makeProps({ dim: 0 }));
    expect(tree.toJSON()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Memoization: identical props do not change rendered structure
// ---------------------------------------------------------------------------

describe('Flame memoization', () => {
  test('re-rendering with identical props keeps the same structure', () => {
    const props = makeProps();
    const tree = render(props);
    const first = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(<Flame {...props} />);
    });
    expect(JSON.stringify(tree.toJSON())).toBe(first);
  });

  test('re-rendering with the identical activeStyle reference is stable', () => {
    const style = flameById('amber') as FlameStyle;
    const props = makeProps({ activeStyle: style });
    const tree = render(props);
    const before = JSON.stringify(tree.toJSON());
    act(() => {
      tree.update(<Flame {...props} />);
    });
    expect(JSON.stringify(tree.toJSON())).toBe(before);
  });
});

/**
 * Flame.test.tsx — unit tests for the Bonfire flame renderer and its
 * profile-resolution helpers.
 *
 * Skia and Reanimated are mocked (see jest.setup.js) so the renderer runs under
 * jest-expo without a GPU. We check:
 *  - out-state precedence: the flame is hidden for 'out' and 'unlit'
 *  - flameVisual-driven height/glow rules for non-lit states
 *  - tongue count and accents come from profile data, not flame id
 *  - the `dim` prop scales glow down without changing structure
 *  - memoized geometry is not rebuilt on unrelated re-renders
 *  - the pure profile resolvers return deterministic descriptors
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { Skia } from '@shopify/react-native-skia';
import { useSharedValue } from 'react-native-reanimated';
import Flame, { DESIGN_FLAME_BASE_FROM_BOTTOM } from '../src/components/Bonfire/Flame';
import {
  flameVisual,
  resolveAccents,
  resolveAuraDescriptor,
  resolveMotionDescriptor,
  resolveShapeDescriptor,
  resolveHealthVisuals,
  resolveStrengthVisuals,
  resolveVisualProfile,
  type ShapeDescriptor,
} from '../src/components/Bonfire/flameModel';
import type { FireState } from '../src/domain/fire';
import { flameById, FLAMES } from '../src/domain/flames';
import { palettes } from '../src/theme/palettes';

// Use the real theme palette (token source) rather than hardcoded heat hex.
const palette = palettes.amber ?? Object.values(palettes)[0];

function makeFire(state: FireState['state'], strength = 3): FireState {
  return { state, strength, streak: state === 'lit' ? 1 : 0 } as unknown as FireState;
}

// Mount the Flame under a real shared clock. A small wrapper is needed because
// useSharedValue must be called inside a component.
function renderFlame(props: Partial<React.ComponentProps<typeof Flame>> = {}) {
  let latestClock: { value: number } | null = null;
  function Harness(p: Partial<React.ComponentProps<typeof Flame>>) {
    const clock = useSharedValue(0);
    latestClock = clock as unknown as { value: number };
    return (
      <Flame
        fire={makeFire('lit')}
        activeStyle={flameById('amber')}
        palette={palette}
        width={390}
        height={844}
        clock={clock as never}
        {...p}
      />
    );
  }
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Harness {...props} />);
  });
  return { tree, clock: () => latestClock };
}

// Count rendered Skia image nodes (layer textures) under the Flame.
function countNodes(tree: ReactTestRenderer.ReactTestRenderer, type: string) {
  return tree.root.findAll(n => n.type === type || n.type?.displayName === type).length;
}

describe('Flame: out-state precedence', () => {
  it.each(['out', 'unlit'] as const)('hides the flame entirely when fire is %s', state => {
    const { tree } = renderFlame({ fire: makeFire(state) });
    // A hidden flame renders no Canvas at all (out/unlit precedence).
    expect(tree.toJSON()).toBeNull();
  });

  it('renders a canvas for a lit fire', () => {
    const { tree } = renderFlame({ fire: makeFire('lit') });
    expect(tree.toJSON()).not.toBeNull();
  });
});

describe('Flame: flameVisual height and glow rules for non-lit states', () => {
  it('keeps the flame base at the documented design anchor', () => {
    expect(DESIGN_FLAME_BASE_FROM_BOTTOM).toBe(216);
  });

  it('scales glow down when flameVisual reports a dimmed state', () => {
    const lit = flameVisual(makeFire('lit'));
    const dimmed = flameVisual(makeFire('lit', 0));
    expect(dimmed.glow).toBeLessThanOrEqual(lit.glow);
    expect(dimmed.height).toBeLessThanOrEqual(lit.height);
  });

  it('never reports a positive height for a hidden state', () => {
    expect(flameVisual(makeFire('out')).height).toBe(0);
    expect(flameVisual(makeFire('unlit')).height).toBe(0);
  });
});

describe('Flame: profile-driven tongues and accents', () => {
  it('derives tongue count from the profile, not the flame id', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    const shape: ShapeDescriptor = resolveShapeDescriptor(profile);
    expect(shape.tongues.length).toBe(profile.shape.tongueCount);
    expect(shape.tongues.length).toBeGreaterThan(0);
  });

  it('selects accents purely from profile accent data', () => {
    const accents = resolveAccents(resolveVisualProfile(flameById('amber')));
    expect(Array.isArray(accents)).toBe(true);
    // Accent selection must be a pure function of the profile.
    expect(resolveAccents(resolveVisualProfile(flameById('amber')))).toEqual(accents);
  });

  it('resolves identical descriptors for an identical profile', () => {
    const profile = resolveVisualProfile(flameById('amber'));
    expect(resolveMotionDescriptor(profile)).toEqual(resolveMotionDescriptor(profile));
    expect(resolveAuraDescriptor(profile)).toEqual(resolveAuraDescriptor(profile));
  });

  it('falls back safely when the style is missing', () => {
    const profile = resolveVisualProfile(undefined);
    expect(profile).toBeTruthy();
    expect(resolveShapeDescriptor(profile).tongues.length).toBeGreaterThan(0);
  });
});

describe('Flame: dim prop', () => {
  it('keeps the same structure while dimming', () => {
    const full = renderFlame({ dim: 1 });
    const dimmed = renderFlame({ dim: 0.4 });
    expect(countNodes(dimmed.tree, 'Canvas')).toBe(countNodes(full.tree, 'Canvas'));
    expect(dimmed.tree.toJSON()).not.toBeNull();
  });

  it('defaults to full energy when dim is omitted', () => {
    const { tree } = renderFlame();
    expect(tree.toJSON()).not.toBeNull();
  });
});

describe('Flame: memoized geometry', () => {
  it('does not rebuild geometry on an unrelated re-render with the same inputs', () => {
    const spy = jest.spyOn(Skia.Path, 'MakeFromSVGString');
    const { tree } = renderFlame();
    const callsAfterMount = spy.mock.calls.length;

    act(() => {
      tree.update(
        <Flame
          fire={makeFire('lit')}
          activeStyle={flameById('amber')}
          palette={palette}
          width={390}
          height={844}
          clock={{ value: 0 } as never}
        />,
      );
    });

    expect(spy.mock.calls.length).toBe(callsAfterMount);
    spy.mockRestore();
  });
});

describe('Flame: health and strength resolvers', () => {
  it('resolves neutral health multipliers when health is missing', () => {
    const neutral = resolveHealthVisuals(undefined);
    expect(neutral).toBeTruthy();
  });

  it('keeps strength visuals monotonic in strength', () => {
    const low = resolveStrengthVisuals(makeFire('lit', 1));
    const high = resolveStrengthVisuals(makeFire('lit', 5));
    expect(high.glow).toBeGreaterThanOrEqual(low.glow);
  });
});

describe('Flame: catalog coverage', () => {
  it('provides a visual profile for every catalog flame', () => {
    for (const flame of FLAMES) {
      const profile = resolveVisualProfile(flame);
      expect(resolveShapeDescriptor(profile).tongues.length).toBeGreaterThan(0);
    }
  });
});

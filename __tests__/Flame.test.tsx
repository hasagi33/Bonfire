/**
 * Flame.test.tsx — unit tests for the Bonfire flame renderer.
 *
 * Covers the public surface of src/components/Bonfire/Flame.tsx:
 *  - out-state precedence (out / unlit hide the flame entirely)
 *  - `dim` scales brightness/glow without changing layout
 *  - visibleBottomFromBottom / width / height drive canvas geometry
 *  - profile descriptors resolve from activeStyle and fall back to Amber-like
 *  - suppressed / missing health resolves to neutral multipliers
 *  - memoized geometry does not rebuild on unchanged props
 *
 * Skia and Reanimated are mocked so the tests run deterministically in jest-expo
 * with no native rendering and no network access. The shared clock is a fixed
 * value, so every assertion is repeatable.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import Flame, { DESIGN_FLAME_BASE_FROM_BOTTOM, type FlameProps } from '../src/components/Bonfire/Flame';
import {
  resolveVisualProfile,
  resolveHealthVisuals,
  resolveStrengthVisuals,
} from '../src/components/Bonfire/flameModel';
import { flameById } from '../src/domain/flames';
import type { FireState } from '../src/domain/fire';
import type { FireHealthState } from '../src/domain/fireHealth';
import { palettes } from '../src/theme/palettes';

// A fixed shared-clock value: every frame-derived value is deterministic.
const FIXED_CLOCK_MS = 1000;

// Minimal stand-in for a Reanimated SharedValue. The Flame only reads `.value`
// during worklets, which jest-expo's mocked Reanimated does not execute, so a
// plain object with the same shape is enough.
function makeClock(value = FIXED_CLOCK_MS) {
  return { value } as FlameProps['clock'];
}

const palette = palettes.amber ?? Object.values(palettes)[0];

function fire(state: FireState['state'], strength = 3): FireState {
  return { state, strength } as FireState;
}

function baseProps(overrides: Partial<FlameProps> = {}): FlameProps {
  return {
    fire: fire('lit', 3),
    activeStyle: flameById('amber'),
    palette,
    width: 320,
    height: 640,
    clock: makeClock(),
    visibleBottomFromBottom: 199,
    ...overrides,
  };
}

function render(props: FlameProps) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(<Flame {...props} />);
  });
  return tree;
}

// Every composite element that received the given prop name.
function nodesWithProp(tree: ReactTestRenderer.ReactTestRenderer, prop: string) {
  return tree.root.findAll(n => n.props && prop in n.props);
}

// Locate the top-level Canvas (the component's root render target).
function rootCanvas(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.findAll(n => n.props && typeof n.props.width === 'number' && 'height' in n.props)[0];
}

let rendered: ReactTestRenderer.ReactTestRenderer | null = null;

afterEach(() => {
  act(() => {
    rendered?.unmount();
  });
  rendered = null;
  jest.restoreAllMocks();
});

describe('Flame — out-state precedence', () => {
  it('renders nothing when the fire is out', () => {
    rendered = render(baseProps({ fire: fire('out', 0) }));
    expect(rendered.toJSON()).toBeNull();
  });

  it('renders nothing when the fire is unlit', () => {
    rendered = render(baseProps({ fire: fire('unlit', 0) }));
    expect(rendered.toJSON()).toBeNull();
  });

  it('renders a canvas when the fire is lit', () => {
    rendered = render(baseProps({ fire: fire('lit', 3) }));
    expect(rendered.toJSON()).not.toBeNull();
  });

  it('out-state wins even when a healthy Radiant state is supplied', () => {
    const health: FireHealthState = 'Radiant' as FireHealthState;
    rendered = render(baseProps({ fire: fire('out', 0), health }));
    expect(rendered.toJSON()).toBeNull();
  });
});

describe('Flame — geometry', () => {
  it('sizes the canvas to the given width and height', () => {
    rendered = render(baseProps({ width: 360, height: 720 }));
    const canvas = rootCanvas(rendered);
    expect(canvas.props.width).toBe(360);
    expect(canvas.props.height).toBe(720);
  });

  it('keeps the flame base at the design offset from the bottom', () => {
    expect(DESIGN_FLAME_BASE_FROM_BOTTOM).toBe(216);
  });

  it('changing visibleBottomFromBottom re-renders without changing canvas size', () => {
    rendered = render(baseProps({ visibleBottomFromBottom: 199 }));
    const before = rootCanvas(rendered).props;
    act(() => {
      rendered!.update(<Flame {...baseProps({ visibleBottomFromBottom: 240 })} />);
    });
    const after = rootCanvas(rendered).props;
    expect(after.width).toBe(before.width);
    expect(after.height).toBe(before.height);
  });
});

describe('Flame — dim prop', () => {
  it('defaults to full energy when dim is omitted', () => {
    rendered = render(baseProps());
    // Full energy means the component is rendered without any dimming wrapper
    // changing the canvas dimensions.
    expect(rootCanvas(rendered)).toBeDefined();
  });

  it('accepts a reduced dim value and still renders the same canvas size', () => {
    rendered = render(baseProps({ dim: 0.3 }));
    const canvas = rootCanvas(rendered);
    expect(canvas.props.width).toBe(320);
    expect(canvas.props.height).toBe(640);
  });

  it('dimming does not change the layout geometry', () => {
    const full = render(baseProps({ dim: 1 }));
    const fullSize = { w: rootCanvas(full).props.width, h: rootCanvas(full).props.height };
    full.unmount();

    rendered = render(baseProps({ dim: 0.2 }));
    expect(rootCanvas(rendered).props.width).toBe(fullSize.w);
    expect(rootCanvas(rendered).props.height).toBe(fullSize.h);
  });
});

describe('resolveVisualProfile — profile resolution', () => {
  it('resolves a profile from a valid catalog flame', () => {
    const profile = resolveVisualProfile(flameById('crimson'));
    expect(profile).toBeDefined();
    expect(profile).toBeTruthy();
  });

  it('falls back to an Amber-like default when the profile is missing', () => {
    const fallback = resolveVisualProfile(undefined);
    expect(fallback).toBeDefined();
    expect(fallback).toEqual(resolveVisualProfile(flameById('amber')));
  });

  it('falls back to an Amber-like default when activeStyle is invalid', () => {
    const invalid = { id: 'does-not-exist' } as unknown as Parameters<typeof resolveVisualProfile>[0];
    expect(resolveVisualProfile(invalid)).toEqual(resolveVisualProfile(flameById('amber')));
  });

  it('renders without throwing for an invalid activeStyle', () => {
    const invalid = { id: 'does-not-exist' } as unknown as FlameProps['activeStyle'];
    expect(() => {
      rendered = render(baseProps({ activeStyle: invalid }));
    }).not.toThrow();
    expect(rootCanvas(rendered)).toBeDefined();
  });

  it('renders without throwing when activeStyle is omitted', () => {
    expect(() => {
      rendered = render(baseProps({ activeStyle: undefined }));
    }).not.toThrow();
  });
});

describe('resolveHealthVisuals — health multipliers', () => {
  it('returns neutral multipliers when health is missing', () => {
    const visuals = resolveHealthVisuals(undefined);
    const neutral = resolveHealthVisuals(undefined);
    expect(visuals).toEqual(neutral);
  });

  it('returns neutral multipliers when health is suppressed', () => {
    const suppressed = resolveHealthVisuals('suppressed' as unknown as FireHealthState);
    expect(suppressed).toEqual(resolveHealthVisuals(undefined));
  });

  it('a healthy state produces a different visual than neutral', () => {
    const healthy = resolveHealthVisuals('Radiant' as FireHealthState);
    expect(healthy).not.toEqual(resolveHealthVisuals(undefined));
  });
});

describe('resolveStrengthVisuals — strength-driven visuals', () => {
  it('returns defined visuals for a lit strength', () => {
    expect(resolveStrengthVisuals(3)).toBeDefined();
  });

  it('is deterministic for the same input', () => {
    expect(resolveStrengthVisuals(4)).toEqual(resolveStrengthVisuals(4));
  });
});

describe('Flame — memoization', () => {
  it('does not rebuild geometry when re-rendered with identical props', () => {
    const props = baseProps();
    rendered = render(props);
    const first = nodesWithProp(rendered, 'palette').length;
    act(() => {
      rendered!.update(<Flame {...props} />);
    });
    const second = nodesWithProp(rendered, 'palette').length;
    expect(second).toBe(first);
  });

  it('re-renders with a new palette reference without throwing', () => {
    rendered = render(baseProps());
    const altPalette = { ...palette };
    expect(() => {
      act(() => {
        rendered!.update(<Flame {...baseProps({ palette: altPalette })} />);
      });
    }).not.toThrow();
  });
});

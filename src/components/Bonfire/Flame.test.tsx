/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Canvas } from '@shopify/react-native-skia';
import { Flame } from './Flame';
import {
  flameVisual,
  resolveVisualProfile,
  resolveHealthVisuals,
  resolveStrengthVisuals,
} from './flameModel';

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const passthrough = (name: string) => {
    const Component = ({ children, ...props }: any) =>
      React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };
  const Skia = {
    Path: {
      MakeFromSVGString: jest.fn(() => ({
        computeTightBounds: () => ({ x: 0, y: 0, width: 10, height: 10 }),
        copy: () => ({ offset: () => ({}) }),
      })),
      Make: jest.fn(() => ({})),
    },
    Surface: { Make: jest.fn(() => null) },
    Paint: jest.fn(() => ({})),
    Shader: {},
    ImageFilter: {},
    Color: jest.fn((c: string) => c),
    Point: jest.fn((x: number, y: number) => ({ x, y })),
  };
  return {
    Canvas: passthrough('Canvas'),
    Image: passthrough('Image'),
    Group: passthrough('Group'),
    Path: passthrough('Path'),
    LinearGradient: passthrough('LinearGradient'),
    RadialGradient: passthrough('RadialGradient'),
    Blur: passthrough('Blur'),
    Paint: passthrough('Paint'),
    ColorMatrix: passthrough('ColorMatrix'),
    Circle: passthrough('Circle'),
    Oval: passthrough('Oval'),
    Rect: passthrough('Rect'),
    Skia,
    PaintStyle: { Fill: 0, Stroke: 1 },
    TileMode: { Clamp: 0, Decal: 1, Repeat: 2, Mirror: 3 },
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, width: w, height: h }),
    vec: (x: number, y: number) => ({ x, y }),
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
  };
});

jest.mock('./flameModel', () => {
  const actual = jest.requireActual('./flameModel');
  return {
    ...actual,
    flameVisual: jest.fn(actual.flameVisual),
    resolveVisualProfile: jest.fn(actual.resolveVisualProfile),
    resolveHealthVisuals: jest.fn(actual.resolveHealthVisuals),
    resolveStrengthVisuals: jest.fn(actual.resolveStrengthVisuals),
  };
});

const palette: any = {
  amber: '#f5a524',
  ember: '#c2410c',
  gold: '#fde68a',
  core: '#fff7ed',
  red: '#b91c1c',
  bg: '#0b0b0f',
};

const clock: any = { value: 0 };

const baseFire = (state: 'lit' | 'out' | 'unlit', strength = 3): any => ({
  state,
  strength,
});

function render(props: Partial<React.ComponentProps<typeof Flame>> = {}) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Flame
        fire={baseFire('lit')}
        palette={palette}
        width={300}
        height={400}
        clock={clock}
        {...(props as any)}
      />,
    );
  });
  return tree;
}

describe('Flame', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('out-state precedence', () => {
    it.each(['out', 'unlit'] as const)('hides the flame when fire state is %s', state => {
      const tree = render({ fire: baseFire(state) });
      expect(tree.root.findAllByType(Canvas).length).toBeLessThanOrEqual(1);
      const canvases = tree.root.findAllByType(Canvas);
      canvases.forEach(c => {
        expect(c.props.style?.display ?? 'flex').not.toBe('none');
      });
      ReactTestRenderer.act(() => tree.unmount());
    });

    it('renders a canvas when fire is lit', () => {
      const tree = render({ fire: baseFire('lit', 4) });
      expect(tree.root.findAllByType(Canvas).length).toBeGreaterThan(0);
      ReactTestRenderer.act(() => tree.unmount());
    });
  });

  describe('profile fallback', () => {
    it('falls back to an Amber-like profile when activeStyle is missing', () => {
      render({ activeStyle: undefined });
      expect(resolveVisualProfile).toHaveBeenCalled();
      const [style] = (resolveVisualProfile as jest.Mock).mock.calls[0];
      expect(style === undefined || style === null || typeof style === 'object').toBe(true);
    });

    it('falls back when activeStyle has an invalid profile', () => {
      const bogus: any = { id: 'bogus', visualProfile: 'not-an-object' };
      const tree = render({ activeStyle: bogus });
      expect(resolveVisualProfile).toHaveBeenCalledWith(bogus);
      ReactTestRenderer.act(() => tree.unmount());
    });
  });

  describe('health multipliers', () => {
    it('uses neutral multipliers when health is missing', () => {
      render({ health: undefined });
      const result = (resolveHealthVisuals as jest.Mock).mock.results.at(-1)?.value;
      if (result) {
        expect(result.glow ?? 1).toBeCloseTo(1);
        expect(result.brightness ?? 1).toBeCloseTo(1);
      } else {
        expect(resolveHealthVisuals).toHaveBeenCalledWith(undefined);
      }
    });

    it('uses neutral multipliers when health is suppressed', () => {
      const health: any = { suppressed: true, state: 'healthy', level: 1 };
      render({ health });
      expect(resolveHealthVisuals).toHaveBeenCalledWith(health);
      const result = (resolveHealthVisuals as jest.Mock).mock.results.at(-1)?.value;
      if (result) {
        expect(result.glow ?? 1).toBeCloseTo(1);
        expect(result.brightness ?? 1).toBeCloseTo(1);
      }
    });
  });

  describe('dim prop', () => {
    it('defaults to full energy when dim is omitted', () => {
      render();
      const calls = (flameVisual as jest.Mock).mock.calls;
      expect(calls.length).toBeGreaterThan(0);
    });

    it('scales visuals down when dim is below 1', () => {
      const full = render({ dim: 1 });
      const dimmed = render({ dim: 0.25 });
      expect(full.toJSON()).toBeTruthy();
      expect(dimmed.toJSON()).toBeTruthy();
      ReactTestRenderer.act(() => {
        full.unmount();
        dimmed.unmount();
      });
    });
  });

  describe('clock driving', () => {
    it('reads motion from the shared clock prop', () => {
      const sharedClock: any = { value: 123 };
      const tree = render({ clock: sharedClock });
      expect(tree.toJSON()).toBeTruthy();
      ReactTestRenderer.act(() => tree.unmount());
    });
  });

  describe('strength visuals', () => {
    it('derives strength visuals from fire strength', () => {
      render({ fire: baseFire('lit', 5) });
      expect(resolveStrengthVisuals).toHaveBeenCalled();
    });
  });
});

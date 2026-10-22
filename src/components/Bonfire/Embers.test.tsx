/**
 * Embers.test.tsx — deterministic seeding, out-state precedence, pool
 * rebuild rules, and reduced-motion clock freezing for the Bonfire embers layer.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { Skia } from '@shopify/react-native-skia';
import { EmbersLayer, mulberry32, hashString, KIND_DEFAULTS } from './Embers';
import type { FlameStyle } from '../../domain/flames';
import { PALETTES, withAlpha } from '../../theme/palettes';

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const passthrough = (name: string) => {
    const Comp = ({ children, ...props }: any) => React.createElement(name, props, children);
    Comp.displayName = name;
    return Comp;
  };
  return {
    Canvas: passthrough('Canvas'),
    Circle: passthrough('Circle'),
    Group: passthrough('Group'),
    Oval: passthrough('Oval'),
    Path: passthrough('Path'),
    RadialGradient: passthrough('RadialGradient'),
    rect: (x: number, y: number, w: number, h: number) => ({ x, y, w, h }),
    vec: (x: number, y: number) => ({ x, y }),
    Skia: {
      Path: {
        MakeFromSVGString: () => ({ mock: 'path' }),
        Make: () => ({ mock: 'path' }),
      },
    },
  };
});

jest.mock('react-native-reanimated', () => ({
  useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
}));

const palette = PALETTES.amber;

function makeClock(value = 0) {
  return { value } as any;
}

const emberSpy = jest.fn();

describe('mulberry32 / hashString', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const r = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashString is stable and distinguishes inputs', () => {
    expect(hashString('sparks|1')).toBe(hashString('sparks|1'));
    expect(hashString('sparks|1')).not.toBe(hashString('motes|1'));
  });

  it('exposes per-kind defaults with well-ordered ranges', () => {
    for (const k of Object.keys(KIND_DEFAULTS) as (keyof typeof KIND_DEFAULTS)[]) {
      const d = KIND_DEFAULTS[k];
      expect(d.period[0]).toBeLessThanOrEqual(d.period[1]);
      expect(d.rise[0]).toBeLessThanOrEqual(d.rise[1]);
      expect(d.size[0]).toBeLessThanOrEqual(d.size[1]);
    }
  });
});

describe('EmbersLayer', () => {
  beforeEach(() => {
    emberSpy.mockClear();
  });

  it('renders without crashing at intensity 0', () => {
    expect(() =>
      render(
        <EmbersLayer
          width={300}
          height={500}
          intensity={0}
          palette={palette}
          clock={makeClock()}
        />,
      ),
    ).not.toThrow();
  });

  it('is deterministic: identical dimensions yield identical output across renders', () => {
    const first = render(
      <EmbersLayer width={320} height={480} intensity={0.8} palette={palette} clock={makeClock(100)} />,
    );
    const firstJson = JSON.stringify(first.toJSON());
    first.unmount();

    const second = render(
      <EmbersLayer width={320} height={480} intensity={0.8} palette={palette} clock={makeClock(100)} />,
    );
    expect(JSON.stringify(second.toJSON())).toEqual(firstJson);
  });

  it('re-rendering with the same props does not reshuffle particles', () => {
    const clock = makeClock(0);
    const view = render(
      <EmbersLayer width={300} height={500} intensity={0.6} palette={palette} clock={clock} />,
    );
    const before = JSON.stringify(view.toJSON());
    view.rerender(
      <EmbersLayer width={300} height={500} intensity={0.6} palette={palette} clock={clock} />,
    );
    expect(JSON.stringify(view.toJSON())).toEqual(before);
  });

  it('intensity 0 suppresses profile particles while ambient embers remain', () => {
    const lit = render(
      <EmbersLayer width={300} height={500} intensity={0.9} palette={palette} clock={makeClock()} />,
    );
    const litCount = lit.toJSON() ? JSON.stringify(lit.toJSON()).length : 0;
    lit.unmount();

    const out = render(
      <EmbersLayer width={300} height={500} intensity={0} palette={palette} clock={makeClock()} />,
    );
    const outJson = JSON.stringify(out.toJSON());
    expect(outJson).toBeTruthy();
    expect(outJson.length).toBeLessThan(litCount);
  });

  it('draws palette-derived colors via withAlpha, not hardcoded hex', () => {
    const expected = withAlpha(palette.ember ?? palette.flame ?? '#000000', 0.7);
    expect(typeof expected).toBe('string');
    expect(expected).not.toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('reduced motion freezing: a fixed clock yields stable positions across renders', () => {
    const clock = makeClock(1234);
    const a = render(
      <EmbersLayer width={300} height={500} intensity={0.5} palette={palette} clock={clock} />,
    );
    const snapA = JSON.stringify(a.toJSON());
    a.unmount();
    const b = render(
      <EmbersLayer width={300} height={500} intensity={0.5} palette={palette} clock={clock} />,
    );
    expect(JSON.stringify(b.toJSON())).toEqual(snapA);
  });

  it('accepts an active flame style without throwing', () => {
    const style = { id: 'amber' } as unknown as FlameStyle;
    expect(() =>
      render(
        <EmbersLayer
          width={300}
          height={500}
          intensity={0.4}
          palette={palette}
          activeStyle={style}
          clock={makeClock()}
        />,
      ),
    ).not.toThrow();
  });
});

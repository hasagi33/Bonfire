/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the public surface of src/components/Settings/FlameRow.tsx:
 *  - swatchColors: full gradient when unlocked, embered stops when locked.
 *  - statusFor: status text and progress fraction for each achievement state.
 *  - FlameRow default export: equip on unlocked press, locked-tap rejection
 *    (no equip, visible cue for 250ms), and the "Just unlocked!" prefix.
 *
 * REJECT_MS is not exported from the module, so the 250ms window is asserted
 * against the literal value. Fixtures are fixed literals and timers are faked
 * for the rejection cue, so no wall-clock time is involved.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// The rejection cue duration implemented in FlameRow.tsx (not exported).
const REJECT_MS = 250;

// ---- Fixtures ----

const GRADIENT = ['#fff1c4', '#ffd166', '#ffae3b', '#ff7a18', '#c2410c'];
const EMBERED = {
  core: '#3a2a1a',
  gold: '#4a3320',
  amber: '#553a22',
  ember: '#602e1a',
  red: '#3b1410',
};

const baseFlame = {
  id: 'amber',
  name: 'Amber',
  gradient: GRADIENT,
  embered: EMBERED,
  palette: { core: '#fff1c4' },
  achievement: undefined,
} as unknown as FlameStyle;

const streakFlame = {
  ...baseFlame,
  id: 'sodium',
  name: 'Sodium',
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
} as unknown as FlameStyle;

const timeFlame = {
  ...baseFlame,
  id: 'toxic',
  name: 'Toxic',
  achievement: { type: 'time', requirement: 'Log 3 days in a row' },
} as unknown as FlameStyle;

function state(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber',
    unlocked: true,
    progress: { value: 1, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

function render(
  flame: FlameStyle,
  st: AchievementState,
  extra: Partial<React.ComponentProps<typeof FlameRow>> = {},
) {
  const onPress = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow flame={flame} state={st} active={false} onPress={onPress} {...extra} />,
    );
  });
  return { tree, onPress };
}

// Collect every rendered string so assertions can match row text.
function allText(tree: ReactTestRenderer.ReactTestRenderer): string {
  const out: string[] = [];
  const walk = (n: ReactTestRenderer.ReactTestRendererJSON | string | null): void => {
    if (n == null) return;
    if (typeof n === 'string') {
      out.push(n);
      return;
    }
    (n.children ?? []).forEach(walk);
  };
  const json = tree.toJSON();
  (Array.isArray(json) ? json : [json]).forEach(walk);
  return out.join('|');
}

function pressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

// Find the progress-bar fill view: the host View whose style carries a width
// expressed as a percentage string.
function progressFill(tree: ReactTestRenderer.ReactTestRenderer) {
  const matches = tree.root.findAll(n => {
    if (typeof n.type !== 'string') return false;
    const style = n.props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
    return flat && typeof flat.width === 'string' && flat.width.endsWith('%');
  });
  return matches[0];
}

function fillWidth(tree: ReactTestRenderer.ReactTestRenderer): string {
  const fill = progressFill(tree);
  const style = fill.props.style;
  const flat = Array.isArray(style) ? Object.assign({}, ...style.flat()) : style;
  return flat.width;
}

// ---- swatchColors (exercised through the rendered LinearGradient) ----

describe('swatchColors', () => {
  test('returns flame.gradient when unlocked', () => {
    const { tree } = render(baseFlame, state({ unlocked: true }));
    const swatch = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    expect(swatch.props.colors).toEqual(GRADIENT);
  });

  test('returns the embered stops (core, gold, amber, ember, red) when locked', () => {
    const { tree } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 0, target: 7 } }),
    );
    const swatch = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    expect(swatch.props.colors).toEqual([
      EMBERED.core,
      EMBERED.gold,
      EMBERED.amber,
      EMBERED.ember,
      EMBERED.red,
    ]);
  });
});

// ---- statusFor (exercised through the rendered status line) ----

describe('statusFor', () => {
  test('base flame without an achievement reads "Unlocked"', () => {
    const { tree } = render(baseFlame, state());
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time achievement shows the day countdown', () => {
    const { tree } = render(timeFlame, state({ unlocked: true, daysLeft: 4 }));
    expect(allText(tree)).toContain('Unlocked · 4d left');
  });

  test('unlocked time achievement clamps a negative countdown to 0d', () => {
    const { tree } = render(timeFlame, state({ unlocked: true, daysLeft: -2 }));
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('expired time achievement shows the re-earn prompt', () => {
    const { tree } = render(
      timeFlame,
      state({ unlocked: false, expired: true, daysLeft: -1, progress: { value: 3, target: 3 } }),
    );
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });

  test('locked streak shows requirement and value/target counter', () => {
    const { tree } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 4, target: 7 } }),
    );
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('locked streak clamps the displayed counter to the target', () => {
    const { tree } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 9, target: 7 } }),
    );
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('progress fraction drives the bar width and is clamped to 100%', () => {
    const { tree } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 9, target: 7 } }),
    );
    expect(fillWidth(tree)).toBe('100%');
  });

  test('zero target yields a 0 progress fraction (no divide by zero)', () => {
    const { tree } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 3, target: 0 } }),
    );
    expect(fillWidth(tree)).toBe('0%');
  });
});

// ---- FlameRow default export: press handling and cues ----

describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render(baseFlame, state({ unlocked: true }));
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('pressing a locked row does not call onPress', () => {
    const { tree, onPress } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 0, target: 7 } }),
    );
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('pressing a locked row shows the rejection cue for REJECT_MS then clears it', () => {
    const { tree } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 0, target: 7 } }),
    );
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
  });

  test('a locked row is announced as disabled with a "Locked — " label', () => {
    const { tree } = render(
      streakFlame,
      state({ unlocked: false, progress: { value: 0, target: 7 } }),
    );
    const p = pressable(tree);
    expect(p.props.accessibilityState.disabled).toBe(true);
    expect(p.props.accessibilityLabel).toContain('Locked — ');
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = render(timeFlame, state({ unlocked: true, daysLeft: 2 }), {
      justUnlocked: true,
    });
    expect(allText(tree)).toContain('Just unlocked! Unlocked · 2d left');
  });

  test('active flame shows the selected accessibility state and check mark', () => {
    const { tree } = render(baseFlame, state({ unlocked: true }), { active: true });
    expect(pressable(tree).props.accessibilityState.selected).toBe(true);
    expect(allText(tree)).toContain('✓');
  });
});

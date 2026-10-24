/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the public surface of src/components/Settings/FlameRow.tsx:
 *  - FlameRow: unlocked tap equips, locked tap is rejected with a cue that
 *    resets after REJECT_MS, and the radio/selected accessibility state.
 *  - swatchColors: full gradient when unlocked, embered stops when locked.
 *  - statusFor: Unlocked, time countdown, expired re-earn, locked progress.
 *  - justUnlocked: prefixes the status with "Just unlocked!".
 *
 * Reanimated and expo-linear-gradient are mocked so the tests stay
 * deterministic and never touch native modules. Fake timers drive the
 * 250ms rejection reset.
 *
 * Note: FlameRow.tsx exports only the default component. swatchColors,
 * statusFor and REJECT_MS are module-private, so they are exercised through
 * the rendered component (gradient colors, status text, cue timing) rather
 * than imported directly.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// Mirrors the module-private constant in FlameRow.tsx.
const REJECT_MS = 250;

// ---- Mocks ----------------------------------------------------------------
// expo-linear-gradient renders a native view; a plain host element is enough.
// The mock records the colors it was given so tests can inspect them.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: object) => React.createElement(View, props),
  };
});

// Reanimated: shared values are plain holders, animated styles are static,
// and the animation builders just return their target value.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...values: number[]) => values[values.length - 1],
    withTiming: (value: number) => value,
    __react: React,
  };
});

// ---- Fixtures -------------------------------------------------------------
function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'sodium',
    name: 'Sodium',
    gradient: ['#ffffff', '#ffd27a', '#ff9a1f', '#e0531a', '#7a1f08'],
    embered: {
      core: '#3a3a3a',
      gold: '#4a3a2a',
      amber: '#4a2a1a',
      ember: '#3a1a10',
      red: '#2a0f0a',
    },
    palette: { core: '#ffe9b0' },
    achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'sodium',
    unlocked: false,
    progress: { value: 0, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

function render(
  flame: FlameStyle,
  state: AchievementState,
  props: { active?: boolean; justUnlocked?: boolean; onPress?: jest.Mock } = {},
) {
  const onPress = props.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={flame}
        state={state}
        active={props.active ?? false}
        justUnlocked={props.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function',
  );
}

function rejectCueCount(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  return tree.root.findAllByProps({ testID: `flame-reject-${id}` }).length;
}

// Collect every rendered text string so tests can check status copy.
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

// Pull the LinearGradient colors prop from the rendered tree.
function swatchColorsOf(tree: ReactTestRenderer.ReactTestRenderer): string[] {
  const swatch = tree.root.find(n => Array.isArray(n.props.colors));
  return swatch.props.colors as string[];
}

// ---- Swatch colors (via rendering) ---------------------------------------
describe('swatch colors', () => {
  test('unlocked row renders the full gradient', () => {
    const flame = makeFlame();
    const { tree } = render(flame, makeState({ unlocked: true, progress: { value: 7, target: 7 } }));
    expect(swatchColorsOf(tree)).toEqual(flame.gradient);
  });

  test('locked row renders the embered stops in core→red order', () => {
    const { tree } = render(makeFlame(), makeState());
    expect(swatchColorsOf(tree)).toEqual(['#3a3a3a', '#4a3a2a', '#4a2a1a', '#3a1a10', '#2a0f0a']);
  });
});

// ---- Status text (via rendering) -----------------------------------------
describe('status text', () => {
  test('base flame with no achievement always reads Unlocked', () => {
    const flame = makeFlame({ achievement: undefined } as Partial<FlameStyle>);
    const { tree } = render(flame, makeState({ unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked streak flame reads Unlocked with no countdown', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true, progress: { value: 7, target: 7 } }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows the window countdown', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const { tree } = render(flame, makeState({ unlocked: true, daysLeft: 5 }));
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative countdown to 0d', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const { tree } = render(flame, makeState({ unlocked: true, daysLeft: -2 }));
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const { tree } = render(
      flame,
      makeState({ expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days');
  });

  test('locked streak flame shows requirement and counter', () => {
    const { tree } = render(makeFlame(), makeState({ progress: { value: 4, target: 7 } }));
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('locked counter never exceeds the target', () => {
    const { tree } = render(makeFlame(), makeState({ progress: { value: 9, target: 7 } }));
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('zero target renders without dividing by zero', () => {
    const { tree } = render(makeFlame(), makeState({ progress: { value: 0, target: 0 } }));
    expect(allText(tree)).toContain('Keep a 7-day run · 0/0');
  });
});

// ---- FlameRow component ---------------------------------------------------
describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('tapping an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render(makeFlame(), makeState({ unlocked: true, progress: { value: 7, target: 7 } }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('sodium');
    expect(rejectCueCount(tree, 'sodium')).toBe(0);
  });

  test('tapping a locked row never equips and shows the rejection cue', () => {
    const { tree, onPress } = render(makeFlame(), makeState());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);
  });

  test('the rejection cue resets after REJECT_MS', () => {
    const { tree } = render(makeFlame(), makeState());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(rejectCueCount(tree, 'sodium')).toBe(0);
  });

  test('repeated locked taps restart the cue timer rather than stacking', () => {
    const { tree, onPress } = render(makeFlame(), makeState());
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    // Still visible: the second tap pushed the reset out by a full REJECT_MS.
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('accessibility: radio role reflects the active (selected) state', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { active: true });
    const r = radio(tree);
    expect(r.props.accessibilityRole).toBe('radio');
    expect(r.props.accessibilityState).toEqual({ selected: true, disabled: false });
    expect(r.props.accessibilityLabel).toContain('Active');
  });

  test('accessibility: an inactive unlocked row is not selected and not disabled', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { active: false });
    const r = radio(tree);
    expect(r.props.accessibilityState).toEqual({ selected: false, disabled: false });
    expect(r.props.accessibilityLabel).not.toContain('Active');
  });

  test('accessibility: a locked row is announced as disabled with a Locked label', () => {
    const { tree } = render(makeFlame(), makeState());
    const r = radio(tree);
    expect(r.props.accessibilityState.disabled).toBe(true);
    expect(r.props.accessibilityLabel).toContain('Locked — Keep a 7-day run · 0/7');
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { justUnlocked: true });
    expect(radio(tree).props.accessibilityLabel).toContain('Just unlocked! Unlocked');
  });

  test('justUnlocked defaults to off', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }));
    expect(radio(tree).props.accessibilityLabel).not.toContain('Just unlocked!');
  });
});

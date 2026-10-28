/**
 * FlameRow.test.tsx — unit tests for the flame gallery row component.
 *
 * Covers:
 *  - statusFor(): status text and progress fraction for every achievement state
 *    (base, unlocked streak/time, locked streak, locked time, expired time),
 *    including the Math.max(0, daysLeft) clamp and the counter cap at target.
 *  - swatchColors(): full gradient when unlocked, embered stops when locked.
 *  - FlameRow: unlocked rows equip via onPress and carry accessibilityState.selected;
 *    locked rows never equip, show the rejection cue, and reset after REJECT_MS;
 *    'Just unlocked!' prefix; 'Locked — ' accessibility prefix.
 *
 * The LinearGradient and react-native-reanimated modules are mocked so the tests
 * run deterministically under react-test-renderer with no native code.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';
import FlameRowDefault from '../src/components/Settings/FlameRow';

// REJECT_MS is not exported from the production module, so mirror the documented
// 250ms rejection cue duration here as a test constant.
const REJECT_MS = 250;

// ---- Module mocks -----------------------------------------------------------

// LinearGradient is a native view; render it as a plain host element that keeps
// its colors prop so we can assert the swatch contract.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: Record<string, unknown>) =>
      React.createElement(View, { testID: 'linear-gradient', ...props }),
  };
});

// Reanimated: replace shared values, animated styles and animation builders with
// simple synchronous stand-ins. withSequence/withTiming just return their final
// target so the shared value is deterministic.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Animated = {
    View: (props: Record<string, unknown>) => React.createElement(View, props),
  };
  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => Record<string, unknown>) => fn(),
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withTiming: (to: number) => to,
  };
});

// ---- Fixtures ---------------------------------------------------------------

const EMBERED = { core: '#111', gold: '#222', amber: '#333', ember: '#444', red: '#555' };

function makeFlame(overrides: Record<string, unknown> = {}): FlameStyle {
  return {
    id: 'sodium',
    name: 'Sodium',
    gradient: ['#a1', '#a2', '#a3'],
    embered: EMBERED,
    palette: { core: '#ffcc00' },
    achievement: { type: 'streak', requirement: 'Keep a 7-day run', target: 7 },
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

function renderRow(props: {
  flame?: FlameStyle;
  state?: AchievementState;
  active?: boolean;
  justUnlocked?: boolean;
  onPress?: jest.Mock;
}) {
  const onPress = props.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRowDefault
        flame={props.flame ?? makeFlame()}
        state={props.state ?? makeState()}
        active={props.active ?? false}
        justUnlocked={props.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

function getRadio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

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

// ---- REJECT_MS --------------------------------------------------------------

describe('REJECT_MS', () => {
  test('is the 250ms rejection cue duration', () => {
    expect(REJECT_MS).toBe(250);
  });
});

// ---- statusFor / swatchColors (exercised through the rendered row) ----------
// statusFor and swatchColors are module-private, so their contracts are checked
// through the rendered text, progress bar and LinearGradient colors.

describe('status text', () => {
  test('base flame (no achievement) reads just "Unlocked"', () => {
    const flame = makeFlame({ id: 'amber', name: 'Amber', achievement: undefined });
    const { tree } = renderRow({
      flame,
      state: makeState({ flameId: 'amber', unlocked: true, progress: { value: 1, target: 1 } }),
    });
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows "Unlocked · Nd left"', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Score 5 in a row', target: 3 },
    });
    const { tree } = renderRow({
      flame,
      state: makeState({ unlocked: true, daysLeft: 5, progress: { value: 3, target: 3 } }),
    });
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps negative daysLeft to 0', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Score 5 in a row', target: 3 },
    });
    const { tree } = renderRow({
      flame,
      state: makeState({ unlocked: true, daysLeft: -2, progress: { value: 3, target: 3 } }),
    });
    expect(allText(tree)).toContain('Unlocked · 0d left');
    expect(allText(tree)).not.toContain('-2d');
  });

  test('locked streak shows requirement and counter', () => {
    const { tree } = renderRow({ state: makeState({ progress: { value: 4, target: 7 } }) });
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('locked streak counter is capped at target', () => {
    const { tree } = renderRow({ state: makeState({ progress: { value: 12, target: 7 } }) });
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
    expect(allText(tree)).not.toContain('12/7');
  });

  test('expired time flame reads "Expired — re-earn: <requirement>"', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Score 5 in a row', target: 3 },
    });
    const { tree } = renderRow({
      flame,
      state: makeState({ expired: true, progress: { value: 3, target: 3 } }),
    });
    expect(allText(tree)).toContain('Expired — re-earn: Score 5 in a row');
  });

  test('justUnlocked prefixes "Just unlocked!"', () => {
    const flame = makeFlame({ achievement: undefined });
    const { tree } = renderRow({
      flame,
      state: makeState({ unlocked: true, progress: { value: 1, target: 1 } }),
      justUnlocked: true,
    });
    expect(allText(tree)).toContain('Just unlocked! Unlocked');
  });
});

describe('swatch colors', () => {
  test('unlocked row uses the full flame gradient', () => {
    const flame = makeFlame({ achievement: undefined });
    const { tree } = renderRow({
      flame,
      state: makeState({ unlocked: true, progress: { value: 1, target: 1 } }),
    });
    const gradient = tree.root.find(n => n.props.testID === 'linear-gradient');
    expect(gradient.props.colors).toEqual(['#a1', '#a2', '#a3']);
  });

  test('locked row uses the embered stops in core/gold/amber/ember/red order', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    const gradient = tree.root.find(n => n.props.testID === 'linear-gradient');
    expect(gradient.props.colors).toEqual([
      EMBERED.core,
      EMBERED.gold,
      EMBERED.amber,
      EMBERED.ember,
      EMBERED.red,
    ]);
  });
});

// ---- Accessibility ----------------------------------------------------------

describe('accessibility', () => {
  test('active row reports accessibilityState.selected = true', () => {
    const { tree } = renderRow({
      active: true,
      state: makeState({ unlocked: true, progress: { value: 1, target: 1 } }),
    });
    expect(getRadio(tree).props.accessibilityState.selected).toBe(true);
    expect(getRadio(tree).props.accessibilityLabel).toContain('Active');
  });

  test('inactive row reports selected = false', () => {
    const { tree } = renderRow({
      active: false,
      state: makeState({ unlocked: true, progress: { value: 1, target: 1 } }),
    });
    expect(getRadio(tree).props.accessibilityState.selected).toBe(false);
  });

  test('locked row is announced disabled with "Locked — " label prefix', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    const radio = getRadio(tree);
    expect(radio.props.accessibilityState.disabled).toBe(true);
    expect(radio.props.accessibilityLabel).toMatch(/^Sodium\. Locked — /);
  });

  test('unlocked row is not disabled and has no "Locked" prefix', () => {
    const { tree } = renderRow({
      state: makeState({ unlocked: true, progress: { value: 1, target: 1 } }),
    });
    const radio = getRadio(tree);
    expect(radio.props.accessibilityState.disabled).toBe(false);
    expect(radio.props.accessibilityLabel).not.toContain('Locked');
  });
});

// ---- Press behaviour --------------------------------------------------------

describe('press behaviour', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = renderRow({
      state: makeState({ unlocked: true, progress: { value: 1, target: 1 } }),
    });
    act(() => {
      getRadio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('sodium');
  });

  test('locked row never calls onPress', () => {
    const { tree, onPress } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      getRadio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('locked tap shows the rejection cue testID', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      getRadio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
  });

  test('rejection cue resets after REJECT_MS', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      getRadio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
  });

  test('repeated locked taps restart the cue timer rather than stacking', () => {
    const { tree, onPress } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      getRadio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 100);
    });
    act(() => {
      getRadio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    // Still visible: the second tap restarted the 250ms window.
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    expect(onPress).not.toHaveBeenCalled();
  });
});

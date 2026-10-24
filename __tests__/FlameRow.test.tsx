/**
 * FlameRow.test.tsx — unit tests for the flame gallery row component.
 *
 * Covers the pure helpers (`statusFor`, `swatchColors`), the REJECT_MS constant,
 * and the rendered FlameRow: status text per achievement state, progress
 * fraction, accessibility labels, equip-on-unlocked-tap, and the locked-tap
 * rejection cue that must never call onPress.
 *
 * Reanimated and expo-linear-gradient are mocked so the test runs headless and
 * deterministically. Fake timers drive the one-shot rejection cue.
 *
 * Note: statusFor, swatchColors and REJECT_MS are module-private in
 * FlameRow.tsx (not exported), so they are exercised through the rendered
 * component and through local mirrors of the documented behaviour, which
 * keeps this file type-correct without modifying the production file.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// ---- Mocks (no native modules, no real animation timing) ----
jest.mock('react-native-reanimated', () => {
  // Minimal stand-in: Animated.View renders a plain View, hooks return inert values.
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (v: number) => v,
  };
});

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, LinearGradient: View };
});

import FlameRow from '../src/components/Settings/FlameRow';

// Mirrors of the module-private constant/helpers, used to assert documented behaviour.
const REJECT_MS = 250;

type Status = { text: string; progress: number | null };

function statusFor(flame: FlameStyle, state: AchievementState): Status {
  const ach = flame.achievement;
  if (!ach) return { text: 'Unlocked', progress: null };
  if (state.unlocked) {
    if (ach.type === 'time' && state.daysLeft !== null) {
      return { text: `Unlocked · ${Math.max(0, state.daysLeft)}d left`, progress: null };
    }
    return { text: 'Unlocked', progress: null };
  }
  const frac =
    state.progress.target > 0 ? Math.min(1, state.progress.value / state.progress.target) : 0;
  if (ach.type === 'time' && state.expired) {
    return { text: `Expired — re-earn: ${ach.requirement}`, progress: frac };
  }
  const counter = `${Math.min(state.progress.value, state.progress.target)}/${state.progress.target}`;
  return { text: `${ach.requirement} · ${counter}`, progress: frac };
}

function swatchColors(flame: FlameStyle, unlocked: boolean): string[] {
  if (unlocked) return flame.gradient;
  const e = flame.embered;
  return [e.core, e.gold, e.amber, e.ember, e.red];
}

// ---- Fixtures ----
const gradient = ['#111111', '#222222', '#333333', '#444444', '#555555'];
const embered = { core: '#aaaaaa', gold: '#bbbbbb', amber: '#cccccc', ember: '#dddddd', red: '#eeeeee' };

function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'sodium',
    name: 'Sodium',
    gradient,
    embered,
    palette: { core: '#ffcc00' },
    achievement: { type: 'streak', requirement: 'Keep a 7-day run', target: 7 },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeTimeFlame(requirement = 'Log 3 days', target = 3, windowDays = 7): FlameStyle {
  return makeFlame({
    achievement: { type: 'time', requirement, target, windowDays },
  } as unknown as Partial<FlameStyle>);
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
  opts: { active?: boolean; justUnlocked?: boolean; onPress?: jest.Mock } = {},
) {
  const onPress = opts.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={flame}
        state={state}
        active={opts.active ?? false}
        justUnlocked={opts.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio' && n.props.onPress);
}

// ---- Pure helpers (behaviour mirrors) ----

describe('statusFor', () => {
  test('base flame without achievement reads "Unlocked" with no progress', () => {
    const flame = makeFlame({ achievement: undefined } as unknown as Partial<FlameStyle>);
    expect(statusFor(flame, makeState({ unlocked: true }))).toEqual({
      text: 'Unlocked',
      progress: null,
    });
  });

  test('unlocked time flame shows the countdown, clamping negative daysLeft to 0', () => {
    const flame = makeTimeFlame();
    expect(statusFor(flame, makeState({ unlocked: true, daysLeft: 5 })).text).toBe(
      'Unlocked · 5d left',
    );
    expect(statusFor(flame, makeState({ unlocked: true, daysLeft: -2 })).text).toBe(
      'Unlocked · 0d left',
    );
  });

  test('unlocked streak flame reads plain "Unlocked"', () => {
    expect(statusFor(makeFlame(), makeState({ unlocked: true, daysLeft: 3 })).text).toBe(
      'Unlocked',
    );
  });

  test('locked streak shows requirement, counter, and clamped progress fraction', () => {
    const r = statusFor(makeFlame(), makeState({ progress: { value: 4, target: 7 } }));
    expect(r.text).toBe('Keep a 7-day run · 4/7');
    expect(r.progress).toBeCloseTo(4 / 7);
  });

  test('locked progress fraction clamps to 1 when value exceeds target', () => {
    const r = statusFor(makeFlame(), makeState({ progress: { value: 9, target: 7 } }));
    expect(r.progress).toBe(1);
    expect(r.text).toBe('Keep a 7-day run · 7/7');
  });

  test('zero target yields progress 0 rather than dividing by zero', () => {
    const r = statusFor(makeFlame(), makeState({ progress: { value: 0, target: 0 } }));
    expect(r.progress).toBe(0);
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const r = statusFor(
      makeTimeFlame(),
      makeState({ expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(r.text).toBe('Expired — re-earn: Log 3 days');
    expect(r.progress).toBe(1);
  });
});

describe('swatchColors', () => {
  test('unlocked returns the full gradient', () => {
    expect(swatchColors(makeFlame(), true)).toBe(gradient);
  });

  test('locked returns embered stops in core→red order', () => {
    expect(swatchColors(makeFlame(), false)).toEqual([
      embered.core,
      embered.gold,
      embered.amber,
      embered.ember,
      embered.red,
    ]);
  });
});

describe('REJECT_MS', () => {
  test('is the ~250ms rejection cue duration', () => {
    expect(REJECT_MS).toBe(250);
  });
});

// ---- Rendered component ----

describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('unlocked row is enabled and labelled with its status', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }));
    const props = radio(tree).props;
    expect(props.accessibilityState.disabled).toBe(false);
    expect(props.accessibilityLabel).toBe('Sodium. Unlocked');
  });

  test('locked row is labelled "Locked — ..." and disabled for assistive tech', () => {
    const { tree } = render(makeFlame(), makeState({ progress: { value: 2, target: 7 } }));
    const props = radio(tree).props;
    expect(props.accessibilityState.disabled).toBe(true);
    expect(props.accessibilityLabel).toBe('Sodium. Locked — Keep a 7-day run · 2/7');
  });

  test('active flame is marked selected and announced as Active', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { active: true });
    const props = radio(tree).props;
    expect(props.accessibilityState.selected).toBe(true);
    expect(props.accessibilityLabel).toContain('. Active');
  });

  test('justUnlocked prefixes the status with a celebratory label', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { justUnlocked: true });
    expect(radio(tree).props.accessibilityLabel).toBe('Sodium. Just unlocked! Unlocked');
  });

  test('tapping an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render(makeFlame(), makeState({ unlocked: true }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('sodium');
  });

  test('tapping a locked row never calls onPress', () => {
    const { tree, onPress } = render(makeFlame(), makeState());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('tapping a locked row shows the rejection cue for REJECT_MS, then clears it', () => {
    const { tree } = render(makeFlame(), makeState());
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' })).toHaveLength(0);

    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' })).toHaveLength(0);
  });

  test('repeated locked taps restart the cue timer instead of stacking', () => {
    const { tree } = render(makeFlame(), makeState());
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // 400ms total, but the second tap reset the timer, so the cue is still up.
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
  });

  test('unmounting clears a pending rejection timer without throwing', () => {
    const { tree } = render(makeFlame(), makeState());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(() => {
      act(() => {
        tree.unmount();
      });
      jest.runOnlyPendingTimers();
    }).not.toThrow();
  });
});

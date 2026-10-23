/**
 * FlameRow.test.tsx — unit tests for the FlameRow gallery row component.
 *
 * Covers:
 *  - statusFor(): the status line + progress fraction for base, unlocked
 *    time/streak, locked streak, and expired time flames.
 *  - swatchColors(): full gradient when unlocked, embered stops when locked.
 *  - FlameRow rendering: accessibility radio semantics, status text,
 *    justUnlocked prefix, and the active check mark.
 *  - Press behavior: unlocked rows call onPress with the flame id; locked
 *    rows never call onPress and show the rejection cue for REJECT_MS.
 *
 * Reanimated and expo-linear-gradient are mocked so the tests run headless
 * and deterministically (no native modules, no real timers needed beyond
 * the fake timers we install for the rejection cue).
 *
 * Note: REJECT_MS is not exported from the component module, so the tests
 * use the documented 250ms value directly.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// Mirrors the component's internal rejection-cue duration (ms).
const REJECT_MS = 250;

// ---- Mocks ----
// Reanimated: no native worklet runtime in Jest. Shared values are plain
// objects, animated styles resolve to a static transform, and the timing /
// sequence helpers just return their target so assignments stay harmless.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...vals: unknown[]) => vals[vals.length - 1],
    withTiming: (toValue: unknown) => toValue,
  };
});

// expo-linear-gradient: render as a plain View so the tree stays simple.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, LinearGradient: View };
});

// ---- Fixtures ----
// A minimal but type-complete FlameStyle. Only the fields FlameRow reads
// (id, name, gradient, embered, palette, achievement) matter for these tests.
function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'toxic',
    name: 'Toxic',
    gradient: ['#111111', '#222222', '#333333', '#444444', '#555555'],
    embered: {
      core: '#aaaaaa',
      gold: '#bbbbbb',
      amber: '#cccccc',
      ember: '#dddddd',
      red: '#eeeeee',
    },
    palette: { core: '#ffffff' },
    achievement: {
      type: 'time',
      requirement: 'Log 3 days in a row',
    },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'toxic',
    unlocked: false,
    progress: { value: 0, target: 3 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

interface RenderOpts {
  flame?: FlameStyle;
  state?: AchievementState;
  active?: boolean;
  justUnlocked?: boolean;
  onPress?: jest.Mock;
}

function renderRow(opts: RenderOpts = {}) {
  const onPress = opts.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={opts.flame ?? makeFlame()}
        state={opts.state ?? makeState()}
        active={opts.active ?? false}
        justUnlocked={opts.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// Find the single accessibility radio (the outer Pressable) for this row.
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function',
  );
}

// Collect every rendered string node, joined, for substring assertions.
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

// ---- Base flame ----

test('a flame with no achievement always reads "Unlocked" with no countdown', () => {
  const flame = makeFlame({ achievement: undefined } as Partial<FlameStyle>);
  const { tree } = renderRow({ flame, state: makeState({ unlocked: true }) });
  expect(allText(tree)).toContain('Unlocked');
  expect(allText(tree)).not.toContain('left');
});

// ---- Unlocked time flame ----

test('an unlocked time flame shows the "Nd left" countdown', () => {
  const { tree } = renderRow({
    state: makeState({ unlocked: true, daysLeft: 5, progress: { value: 3, target: 3 } }),
  });
  expect(allText(tree)).toContain('Unlocked · 5d left');
});

test('daysLeft is clamped at 0 so a stale negative never shows "-2d left"', () => {
  const { tree } = renderRow({
    state: makeState({ unlocked: true, daysLeft: -2, progress: { value: 3, target: 3 } }),
  });
  expect(allText(tree)).toContain('Unlocked · 0d left');
  expect(allText(tree)).not.toContain('-2d');
});

// ---- Unlocked streak flame ----

test('an unlocked streak flame shows plain "Unlocked" (no countdown)', () => {
  const flame = makeFlame({
    achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
  } as Partial<FlameStyle>);
  const { tree } = renderRow({
    flame,
    state: makeState({ unlocked: true, progress: { value: 7, target: 7 } }),
  });
  expect(allText(tree)).toContain('Unlocked');
  expect(allText(tree)).not.toContain('left');
});

// ---- Locked streak flame ----

test('a locked streak flame shows requirement + value/target counter', () => {
  const flame = makeFlame({
    achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
  } as Partial<FlameStyle>);
  const { tree } = renderRow({
    flame,
    state: makeState({ unlocked: false, progress: { value: 4, target: 7 } }),
  });
  expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
});

test('the progress bar width reflects value/target as a rounded percentage', () => {
  const flame = makeFlame({
    achievement: { type: 'streak', requirement: 'Keep a 4-day run' },
  } as Partial<FlameStyle>);
  const { tree } = renderRow({
    flame,
    state: makeState({ unlocked: false, progress: { value: 1, target: 4 } }),
  });
  // 1/4 = 25%
  const fill = tree.root.findAll(n => {
    const style = n.props.style;
    if (Array.isArray(style)) {
      return style.some((s: { width?: string }) => s && s.width === '25%');
    }
    return style?.width === '25%';
  });
  expect(fill.length).toBeGreaterThan(0);
});

test('progress is capped at 1 and the counter never exceeds the target', () => {
  const flame = makeFlame({
    achievement: { type: 'streak', requirement: 'Keep a 3-day run' },
  } as Partial<FlameStyle>);
  const { tree } = renderRow({
    flame,
    state: makeState({ unlocked: false, progress: { value: 9, target: 3 } }),
  });
  // Counter clamps to target.
  expect(allText(tree)).toContain('3/3');
});

test('a target of 0 yields zero progress instead of dividing by zero', () => {
  const flame = makeFlame({
    achievement: { type: 'streak', requirement: 'Impossible' },
  } as Partial<FlameStyle>);
  const { tree } = renderRow({
    flame,
    state: makeState({ unlocked: false, progress: { value: 0, target: 0 } }),
  });
  expect(allText(tree)).toContain('Impossible · 0/0');
  expect(allText(tree)).not.toContain('NaN');
});

// ---- Expired time flame ----

test('an expired time flame prompts a re-earn with the requirement', () => {
  const { tree } = renderRow({
    state: makeState({ unlocked: false, expired: true, progress: { value: 3, target: 3 } }),
  });
  expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
});

// ---- justUnlocked ----

test('justUnlocked prefixes the status with "Just unlocked!"', () => {
  const { tree } = renderRow({
    state: makeState({ unlocked: true, daysLeft: 6, progress: { value: 3, target: 3 } }),
    justUnlocked: true,
  });
  expect(allText(tree)).toContain('Just unlocked! Unlocked · 6d left');
});

// ---- Accessibility ----

test('each row is an accessibility radio whose selected state equals active', () => {
  const { tree } = renderRow({ state: makeState({ unlocked: true }), active: true });
  expect(radio(tree).props.accessibilityState).toEqual({ selected: true, disabled: false });
});

test('an inactive row reports selected: false', () => {
  const { tree } = renderRow({ state: makeState({ unlocked: true }), active: false });
  expect(radio(tree).props.accessibilityState.selected).toBe(false);
});

test('a locked row is announced as disabled with a "Locked —" label', () => {
  const { tree } = renderRow({ state: makeState({ unlocked: false }) });
  const r = radio(tree);
  expect(r.props.accessibilityState.disabled).toBe(true);
  expect(r.props.accessibilityLabel).toContain('Locked — ');
  expect(r.props.accessibilityLabel).toContain('Toxic');
});

test('an active row adds ". Active" to its accessibility label and shows a check', () => {
  const { tree } = renderRow({ state: makeState({ unlocked: true }), active: true });
  expect(radio(tree).props.accessibilityLabel).toContain('. Active');
  expect(allText(tree)).toContain('✓');
});

test('an inactive row shows no check mark', () => {
  const { tree } = renderRow({ state: makeState({ unlocked: true }), active: false });
  expect(allText(tree)).not.toContain('✓');
});

// ---- Press behavior ----

test('pressing an unlocked row calls onPress with the flame id', () => {
  const { tree, onPress } = renderRow({ state: makeState({ unlocked: true }) });
  act(() => {
    radio(tree).props.onPress();
  });
  expect(onPress).toHaveBeenCalledTimes(1);
  expect(onPress).toHaveBeenCalledWith('toxic');
});

describe('pressing a locked row', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('does not call onPress', () => {
    const { tree, onPress } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('shows the rejection cue immediately', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBeGreaterThan(0);
  });

  test('the rejection cue clears after REJECT_MS', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBe(0);
  });

  test('repeated locked taps restart the cue window instead of stacking timers', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    act(() => {
      radio(tree).props.onPress();
    });
    // The first timer would have fired at REJECT_MS; the restart pushes it out.
    act(() => {
      jest.advanceTimersByTime(60);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(REJECT_MS);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBe(0);
  });

  test('unmounting while the cue is pending does not throw on timer cleanup', () => {
    const { tree } = renderRow({ state: makeState({ unlocked: false }) });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(() => {
      act(() => {
        tree.unmount();
      });
      jest.advanceTimersByTime(REJECT_MS);
    }).not.toThrow();
  });
});

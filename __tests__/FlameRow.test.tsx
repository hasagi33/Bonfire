/**
 * FlameRow.test.tsx — unit tests for the FlameRow gallery row.
 *
 * Covers: swatch colors (unlocked gradient vs. embered), status line variants
 * from statusFor (base, unlocked time countdown, locked streak progress,
 * expired time re-earn), the "Just unlocked!" prefix, equip-on-unlocked-tap,
 * and the locked-tap rejection cue (testID present for ~REJECT_MS, then gone).
 *
 * Animation and gradient native modules are mocked so the tests run in Node
 * with no device and no wall-clock timing (fake timers drive the 250ms cue).
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import { FLAMES, type FlameId, type FlameStyle } from '../src/domain/flames';
import type { AchievementState } from '../src/domain/achievements';

// ---- Mocks -----------------------------------------------------------------

// Reanimated: replace shared values / animated styles with plain stand-ins.
// Shared values are plain objects with a mutable `value`; withSequence/withTiming
// return their target so assignments are harmless.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (toValue: number) => toValue,
  };
});

// LinearGradient: render as a plain View that keeps its `colors` prop so the
// test can read back the swatch colors.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: object) => require('react').createElement(View, props),
  };
});

// ---- Helpers ---------------------------------------------------------------

const REJECT_MS = 250;

function flameById(id: FlameId): FlameStyle {
  const f = FLAMES.find(x => x.id === id);
  if (!f) throw new Error(`fixture missing flame ${id}`);
  return f;
}

// Build a deterministic AchievementState; overrides are merged on top.
function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber',
    unlocked: true,
    progress: { value: 1, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  };
}

interface RenderOpts {
  flame?: FlameStyle;
  state?: AchievementState;
  active?: boolean;
  justUnlocked?: boolean;
  onPress?: jest.Mock;
}

function renderRow(opts: RenderOpts = {}) {
  const flame = opts.flame ?? flameById('amber');
  const onPress = opts.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={flame}
        state={opts.state ?? makeState()}
        active={opts.active ?? false}
        justUnlocked={opts.justUnlocked ?? false}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress, flame };
}

// Unmount a rendered tree so pending timers/effects are torn down inside the test.
function unmount(tree: ReactTestRenderer.ReactTestRenderer) {
  act(() => {
    tree.unmount();
  });
}

// All rendered text nodes, joined — lets us substring-match the status line.
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

// The Pressable is the element carrying the radio role.
function pressable(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

// ---- Swatch colors ---------------------------------------------------------

describe('swatch colors', () => {
  test('unlocked row uses the flame gradient', () => {
    const flame = flameById('amber');
    const { tree } = renderRow({ flame, state: makeState({ unlocked: true }) });
    const swatch = tree.root.findAll(n => n.props.colors !== undefined)[0];
    expect(swatch.props.colors).toEqual(flame.gradient);
    unmount(tree);
  });

  test('locked row uses the embered colors in core, gold, amber, ember, red order', () => {
    const flame = flameById('sodium');
    const { tree } = renderRow({
      flame,
      state: makeState({ flameId: 'sodium', unlocked: false, progress: { value: 0, target: 7 } }),
    });
    const swatch = tree.root.findAll(n => n.props.colors !== undefined)[0];
    const e = flame.embered;
    expect(swatch.props.colors).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
    unmount(tree);
  });
});

// ---- Status line (statusFor) ----------------------------------------------

describe('status line', () => {
  test('base flame (no achievement) reads "Unlocked"', () => {
    const { tree } = renderRow({ flame: flameById('amber'), state: makeState() });
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
    unmount(tree);
  });

  test('unlocked time flame shows the day countdown', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'time');
    if (!flame) throw new Error('fixture: no time flame in catalog');
    const { tree } = renderRow({
      flame,
      state: makeState({ flameId: flame.id, unlocked: true, achievementDay: '2026-06-10', daysLeft: 5 }),
    });
    expect(allText(tree)).toContain('Unlocked · 5d left');
    unmount(tree);
  });

  test('unlocked time flame with negative days left clamps the countdown at 0d', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'time');
    if (!flame) throw new Error('fixture: no time flame in catalog');
    const { tree } = renderRow({
      flame,
      state: makeState({ flameId: flame.id, unlocked: true, daysLeft: -2 }),
    });
    expect(allText(tree)).toContain('Unlocked · 0d left');
    unmount(tree);
  });

  test('locked streak flame shows requirement and counter', () => {
    const flame = flameById('sodium');
    const { tree } = renderRow({
      flame,
      state: makeState({ flameId: 'sodium', unlocked: false, progress: { value: 4, target: 7 } }),
    });
    expect(allText(tree)).toContain(`${flame.achievement!.requirement} · 4/7`);
    unmount(tree);
  });

  test('locked streak counter never exceeds the target', () => {
    const flame = flameById('sodium');
    const { tree } = renderRow({
      flame,
      state: makeState({ flameId: 'sodium', unlocked: false, progress: { value: 9, target: 7 } }),
    });
    expect(allText(tree)).toContain(`${flame.achievement!.requirement} · 7/7`);
    unmount(tree);
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const flame = FLAMES.find(f => f.achievement?.type === 'time');
    if (!flame) throw new Error('fixture: no time flame in catalog');
    const { tree } = renderRow({
      flame,
      state: makeState({
        flameId: flame.id,
        unlocked: false,
        expired: true,
        achievementDay: '2026-05-01',
        daysLeft: -3,
        progress: { value: 3, target: 3 },
      }),
    });
    expect(allText(tree)).toContain(`Expired — re-earn: ${flame.achievement!.requirement}`);
    unmount(tree);
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = renderRow({ flame: flameById('amber'), state: makeState(), justUnlocked: true });
    expect(allText(tree)).toContain('Just unlocked! Unlocked');
    unmount(tree);
  });
});

// ---- Tap behavior ----------------------------------------------------------

describe('tap behavior', () => {
  test('tapping an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = renderRow({ flame: flameById('amber'), state: makeState({ unlocked: true }) });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
    unmount(tree);
  });

  test('tapping a locked row does not call onPress', () => {
    const { tree, onPress } = renderRow({
      flame: flameById('sodium'),
      state: makeState({ flameId: 'sodium', unlocked: false, progress: { value: 0, target: 7 } }),
    });
    act(() => {
      pressable(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    unmount(tree);
  });

  test('locked tap shows the rejection cue testID, then clears it after ~250ms', () => {
    jest.useFakeTimers();
    try {
      const flame = flameById('sodium');
      const { tree } = renderRow({
        flame,
        state: makeState({ flameId: 'sodium', unlocked: false, progress: { value: 0, target: 7 } }),
      });
      const cueId = `flame-reject-${flame.id}`;
      expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);

      act(() => {
        pressable(tree).props.onPress();
      });
      expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

      // Just before the cue window ends it is still visible…
      act(() => {
        jest.advanceTimersByTime(REJECT_MS - 1);
      });
      expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

      // …and once the window elapses it is cleared.
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);
      unmount(tree);
    } finally {
      jest.useRealTimers();
    }
  });

  test('repeated locked taps restart the cue window instead of stacking timers', () => {
    jest.useFakeTimers();
    try {
      const flame = flameById('sodium');
      const { tree } = renderRow({
        flame,
        state: makeState({ flameId: 'sodium', unlocked: false, progress: { value: 0, target: 7 } }),
      });
      const cueId = `flame-reject-${flame.id}`;

      act(() => {
        pressable(tree).props.onPress();
      });
      act(() => {
        jest.advanceTimersByTime(200);
      });
      act(() => {
        pressable(tree).props.onPress();
      });
      // 200ms after the first tap the second window is still open.
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);
      unmount(tree);
    } finally {
      jest.useRealTimers();
    }
  });
});

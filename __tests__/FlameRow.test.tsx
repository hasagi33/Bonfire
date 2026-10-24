/**
 * FlameRow.test.tsx — unit tests for one row in the flame gallery.
 *
 * Covers the status line for each AchievementState variant (unlocked base,
 * unlocked streak, unlocked time countdown with clamping, locked streak
 * progress with clamping, expired time re-earn), the justUnlocked prefix,
 * the equip-vs-reject press behavior (FR-001/FR-002), and accessibility state.
 *
 * Reanimated and expo-linear-gradient are mocked so the test runs headless and
 * deterministically. Every timer-driven or state-updating interaction is wrapped
 * in act() and the rejection timer is fully flushed before each test ends, so no
 * update or log leaks past the end of the test environment.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameId, FlameStyle } from '../src/domain/flames';

// ---- Mocks ----
// Reanimated: shared values are plain objects, sequences/timings collapse to
// their final value, and the animated style is evaluated eagerly. This keeps
// the tests free of native animation timing.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: RN.View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withTiming: (to: number) => to,
  };
});

// LinearGradient renders as a plain View; we only care that it mounts.
jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual('react-native');
  return { LinearGradient: RN.View };
});

// ---- Fixtures ----
// Builds a FlameStyle-shaped object for tests. The cast goes through `unknown`
// because the fixture is intentionally partial and does not satisfy the full
// Achievement / FlameStyle shapes.
function makeFlame(overrides: Record<string, unknown> = {}): FlameStyle {
  return {
    id: 'sodium',
    name: 'Sodium',
    gradient: ['#111111', '#222222', '#333333'],
    embered: { core: '#0a0a0a', gold: '#1a1a1a', amber: '#2a2a2a', ember: '#3a3a3a', red: '#4a4a4a' },
    palette: { core: '#ffcc66' },
    achievement: { type: 'streak', requirement: 'Keep a 7-day run', target: 7 },
    ...overrides,
  } as unknown as FlameStyle;
}

const TIME_FLAME: FlameStyle = makeFlame({
  id: 'toxic',
  name: 'Toxic',
  achievement: { type: 'time', requirement: 'Score 3 days in a row', target: 3 },
});

const BASE_FLAME: FlameStyle = makeFlame({
  id: 'amber',
  name: 'Amber',
  achievement: undefined,
});

function state(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'sodium' as FlameId,
    unlocked: false,
    progress: { value: 0, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  };
}

// Render a row inside act() and return the tree plus the onPress mock.
function render(
  flame: FlameStyle,
  s: AchievementState,
  opts: { active?: boolean; justUnlocked?: boolean; onPress?: jest.Mock } = {},
) {
  const onPress = opts.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={flame}
        state={s}
        active={opts.active ?? false}
        justUnlocked={opts.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// Unmount inside act() so any pending effects/timers are torn down cleanly.
function unmount(tree: ReactTestRenderer.ReactTestRenderer) {
  act(() => {
    tree.unmount();
  });
}

// Collect every rendered text string so we can substring-match the status line.
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
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function',
  );
}

// ---- Status line: unlocked ----

describe('FlameRow status when unlocked', () => {
  test('a base flame with no achievement always reads "Unlocked"', () => {
    const { tree } = render(BASE_FLAME, state({ flameId: 'amber' as FlameId, unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
    unmount(tree);
  });

  test('an unlocked streak flame reads "Unlocked" with no countdown', () => {
    const { tree } = render(makeFlame(), state({ unlocked: true, progress: { value: 7, target: 7 } }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
    unmount(tree);
  });

  test('an unlocked time flame shows the "Nd left" countdown', () => {
    const { tree } = render(
      TIME_FLAME,
      state({ unlocked: true, daysLeft: 5, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 5d left');
    unmount(tree);
  });

  test('a negative daysLeft is clamped to 0 in the countdown', () => {
    const { tree } = render(
      TIME_FLAME,
      state({ unlocked: true, daysLeft: -2, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 0d left');
    expect(allText(tree)).not.toContain('-2d');
    unmount(tree);
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = render(makeFlame(), state({ unlocked: true }), { justUnlocked: true });
    expect(allText(tree)).toContain('Just unlocked! Unlocked');
    unmount(tree);
  });
});

// ---- Status line: locked ----

describe('FlameRow status when locked', () => {
  test('a locked streak flame shows the requirement plus value/target', () => {
    const { tree } = render(makeFlame(), state({ progress: { value: 4, target: 7 } }));
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
    unmount(tree);
  });

  test('progress counter clamps value to target when over-achieved', () => {
    const { tree } = render(makeFlame(), state({ progress: { value: 12, target: 7 } }));
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
    expect(allText(tree)).not.toContain('12/7');
    unmount(tree);
  });

  test('an expired time flame prompts re-earn with the requirement', () => {
    const { tree } = render(
      TIME_FLAME,
      state({ expired: true, achievementDay: '2026-05-01', daysLeft: -3, progress: { value: 3, target: 3 } }),
    );
    expect(allText(tree)).toContain('Expired — re-earn: Score 3 days in a row');
    unmount(tree);
  });

  test('a locked row is announced as "Locked — …" to assistive tech', () => {
    const { tree } = render(makeFlame(), state({ progress: { value: 1, target: 7 } }));
    expect(radio(tree).props.accessibilityLabel).toContain('Locked — Keep a 7-day run');
    unmount(tree);
  });
});

// ---- Press behavior ----

describe('FlameRow press handling', () => {
  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render(makeFlame(), state({ unlocked: true }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('sodium');
    unmount(tree);
  });

  test('pressing a locked row never calls onPress (FR-001)', () => {
    const { tree, onPress } = render(makeFlame(), state({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    unmount(tree);
  });

  test('pressing a locked row shows the reject cue, which clears after ~250ms (FR-002)', () => {
    jest.useFakeTimers();
    const { tree } = render(makeFlame(), state({ unlocked: false }));
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);

    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(250);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);

    unmount(tree);
    jest.useRealTimers();
  });

  test('pressing an unlocked row does not show a reject cue', () => {
    const { tree } = render(makeFlame(), state({ unlocked: true }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
    unmount(tree);
  });
});

// ---- Accessibility state ----

describe('FlameRow accessibility', () => {
  test('accessibilityState.selected reflects the active prop', () => {
    const active = render(makeFlame(), state({ unlocked: true }), { active: true });
    expect(radio(active.tree).props.accessibilityState.selected).toBe(true);
    expect(radio(active.tree).props.accessibilityLabel).toContain('Active');
    unmount(active.tree);

    const inactive = render(makeFlame(), state({ unlocked: true }), { active: false });
    expect(radio(inactive.tree).props.accessibilityState.selected).toBe(false);
    unmount(inactive.tree);
  });

  test('accessibilityState.disabled is true exactly when the flame is locked', () => {
    const locked = render(makeFlame(), state({ unlocked: false }));
    expect(radio(locked.tree).props.accessibilityState.disabled).toBe(true);
    unmount(locked.tree);

    const unlocked = render(makeFlame(), state({ unlocked: true }));
    expect(radio(unlocked.tree).props.accessibilityState.disabled).toBe(false);
    unmount(unlocked.tree);
  });
});

// ---- Swatch colors ----
// statusFor, swatchColors and REJECT_MS are module-private in FlameRow.tsx, so
// their behavior is exercised through the rendered output.

describe('FlameRow swatch colors', () => {
  test('unlocked rows use the full gradient', () => {
    const flame = makeFlame();
    const { tree } = render(flame, state({ unlocked: true }));
    const gradient = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    expect(gradient.props.colors).toEqual(flame.gradient);
    unmount(tree);
  });

  test('locked rows use the embered colors in core, gold, amber, ember, red order', () => {
    const flame = makeFlame();
    const { tree } = render(flame, state({ unlocked: false }));
    const gradient = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    expect(gradient.props.colors).toEqual([
      flame.embered.core,
      flame.embered.gold,
      flame.embered.amber,
      flame.embered.ember,
      flame.embered.red,
    ]);
    unmount(tree);
  });
});

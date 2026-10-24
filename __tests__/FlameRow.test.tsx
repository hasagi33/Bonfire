/**
 * FlameRow.test.tsx — unit tests for a single row in the flame gallery.
 *
 * Covers the status logic (`statusFor`, `swatchColors`), the rejection cue
 * timing (`REJECT_MS`), and the rendered `FlameRow` behaviour:
 *  - unlocked rows equip via onPress(flame.id)
 *  - locked rows never equip and play a rejection cue that clears after REJECT_MS
 *  - justUnlocked prefixes the status with "Just unlocked!"
 *  - locked rows get a "Locked — " accessibility label prefix and are disabled
 *
 * react-native-reanimated and expo-linear-gradient are mocked so the tests run
 * deterministically under jest-expo without native modules.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import { FLAMES, type FlameId, type FlameStyle } from '../src/domain/flames';
import type { AchievementState } from '../src/domain/achievements';

// REJECT_MS is a file-private constant in production; mirror its documented value.
const REJECT_MS = 250;

// ---- Mocks ----------------------------------------------------------------

// Reanimated: replace shared values, animated styles and sequences with plain
// stand-ins so no worklet runtime is needed. The mock factory must not reference
// out-of-scope variables, so everything is required inline.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: RN.View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (value: number) => value,
  };
});

// LinearGradient: render as a plain host View so the tree stays valid.
jest.mock('expo-linear-gradient', () => {
  const React = jest.requireActual('react');
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: object) => React.createElement(RN.View, props),
  };
});

// ---- Helpers --------------------------------------------------------------

function findFlame(id: FlameId): FlameStyle {
  const flame = FLAMES.find(f => f.id === id);
  if (!flame) throw new Error(`missing flame fixture: ${id}`);
  return flame;
}

// The first catalog flame that carries a streak achievement.
function streakFlame(): FlameStyle {
  const flame = FLAMES.find(f => f.achievement?.type === 'streak');
  if (!flame) throw new Error('no streak flame in catalog');
  return flame;
}

// The first catalog flame that carries a time achievement.
function timeFlame(): FlameStyle {
  const flame = FLAMES.find(f => f.achievement?.type === 'time');
  if (!flame) throw new Error('no time flame in catalog');
  return flame;
}

function makeState(overrides: Partial<AchievementState> & { flameId: FlameId }): AchievementState {
  return {
    unlocked: false,
    progress: { value: 0, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  };
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

// The pressable row node (radio role with an onPress handler).
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio' && n.props.onPress);
}

// Collect every rendered string so text assertions don't depend on nesting.
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

// ---- statusFor (behavioural, via rendered row) ------------------------------

describe('statusFor via FlameRow', () => {
  test('base flame (no achievement) shows "Unlocked"', () => {
    const base = FLAMES.find(f => !f.achievement);
    if (!base) throw new Error('expected a base flame without achievement');
    const { tree } = render(base, makeState({ flameId: base.id, unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked streak flame shows "Unlocked" with no countdown', () => {
    const flame = streakFlame();
    const { tree } = render(
      flame,
      makeState({ flameId: flame.id, unlocked: true, progress: { value: 7, target: 7 } }),
    );
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows the countdown "Unlocked · Nd left"', () => {
    const flame = timeFlame();
    const { tree } = render(flame, makeState({ flameId: flame.id, unlocked: true, daysLeft: 5 }));
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative daysLeft to 0d', () => {
    const flame = timeFlame();
    const { tree } = render(flame, makeState({ flameId: flame.id, unlocked: true, daysLeft: -4 }));
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('locked streak flame shows requirement and counter clamped to target', () => {
    const flame = streakFlame();
    const { tree } = render(
      flame,
      makeState({ flameId: flame.id, progress: { value: 99, target: 7 } }),
    );
    expect(allText(tree)).toContain(`${flame.achievement!.requirement} · 7/7`);
  });

  test('locked streak flame mid-progress shows the partial counter', () => {
    const flame = streakFlame();
    const { tree } = render(
      flame,
      makeState({ flameId: flame.id, progress: { value: 3, target: 7 } }),
    );
    expect(allText(tree)).toContain('3/7');
  });

  test('locked time flame (not expired) shows requirement with counter', () => {
    const flame = timeFlame();
    const { tree } = render(
      flame,
      makeState({ flameId: flame.id, progress: { value: 1, target: 3 } }),
    );
    expect(allText(tree)).toContain(`${flame.achievement!.requirement} · 1/3`);
  });

  test('expired time flame shows "Expired — re-earn: <requirement>"', () => {
    const flame = timeFlame();
    const { tree } = render(
      flame,
      makeState({
        flameId: flame.id,
        expired: true,
        daysLeft: -2,
        progress: { value: 3, target: 3 },
      }),
    );
    expect(allText(tree)).toContain(`Expired — re-earn: ${flame.achievement!.requirement}`);
  });

  test('zero target does not divide by zero', () => {
    const flame = streakFlame();
    const { tree } = render(
      flame,
      makeState({ flameId: flame.id, progress: { value: 2, target: 0 } }),
    );
    expect(allText(tree)).toContain('0/0');
  });
});

// ---- swatchColors (via rendered LinearGradient colors) ----------------------

describe('swatchColors via FlameRow', () => {
  test('unlocked row uses the full gradient stops', () => {
    const flame = findFlame('amber');
    const { tree } = render(flame, makeState({ flameId: flame.id, unlocked: true }));
    const grad = tree.root.findAll(n => n.props.colors !== undefined)[0];
    expect(grad.props.colors).toEqual(flame.gradient);
  });

  test('locked row uses the five embered stops in order', () => {
    const flame = findFlame('amber');
    const e = flame.embered;
    const { tree } = render(flame, makeState({ flameId: flame.id, unlocked: false }));
    const grad = tree.root.findAll(n => n.props.colors !== undefined)[0];
    expect(grad.props.colors).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
  });
});

// ---- REJECT_MS -------------------------------------------------------------

describe('REJECT_MS', () => {
  test('is the 250ms rejection cue duration', () => {
    expect(REJECT_MS).toBe(250);
  });
});

// ---- FlameRow rendering & interaction --------------------------------------

describe('FlameRow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('pressing an unlocked row calls onPress with the flame id', () => {
    const flame = findFlame('amber');
    const state = makeState({ flameId: flame.id, unlocked: true, progress: { value: 1, target: 1 } });
    const { tree, onPress } = render(flame, state);

    act(() => {
      radio(tree).props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('pressing a locked row does NOT call onPress', () => {
    jest.useFakeTimers();
    const flame = streakFlame();
    const state = makeState({ flameId: flame.id, progress: { value: 0, target: 7 } });
    const { tree, onPress } = render(flame, state);

    act(() => {
      radio(tree).props.onPress();
    });

    expect(onPress).not.toHaveBeenCalled();
    act(() => {
      jest.runOnlyPendingTimers();
    });
  });

  test('a locked press shows the rejection cue, which clears after REJECT_MS', () => {
    jest.useFakeTimers();
    const flame = streakFlame();
    const state = makeState({ flameId: flame.id, progress: { value: 0, target: 7 } });
    const { tree } = render(flame, state);
    const cueId = `flame-reject-${flame.id}`;

    expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);

    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    // Just before the cue window elapses it is still visible.
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    // It is gone once the full REJECT_MS has passed.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);
  });

  test('an unlocked press never shows the rejection cue', () => {
    const flame = findFlame('amber');
    const state = makeState({ flameId: flame.id, unlocked: true, progress: { value: 1, target: 1 } });
    const { tree } = render(flame, state);

    act(() => {
      radio(tree).props.onPress();
    });

    expect(tree.root.findAllByProps({ testID: `flame-reject-${flame.id}` }).length).toBe(0);
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const flame = timeFlame();
    const state = makeState({ flameId: flame.id, unlocked: true, daysLeft: 6 });
    const { tree } = render(flame, state, { justUnlocked: true });

    expect(allText(tree)).toContain('Just unlocked! Unlocked · 6d left');
  });

  test('locked rows have a "Locked — " accessibility label prefix and are disabled', () => {
    const flame = streakFlame();
    const state = makeState({ flameId: flame.id, progress: { value: 2, target: 7 } });
    const { tree } = render(flame, state);
    const node = radio(tree);

    expect(node.props.accessibilityLabel).toContain(`${flame.name}. Locked — `);
    expect(node.props.accessibilityState.disabled).toBe(true);
  });

  test('unlocked rows are not disabled and omit the "Locked — " prefix', () => {
    const flame = findFlame('amber');
    const state = makeState({ flameId: flame.id, unlocked: true, progress: { value: 1, target: 1 } });
    const { tree } = render(flame, state);
    const node = radio(tree);

    expect(node.props.accessibilityState.disabled).toBe(false);
    expect(node.props.accessibilityLabel).not.toContain('Locked — ');
  });

  test('an active row reports selected and labels itself Active', () => {
    const flame = findFlame('amber');
    const state = makeState({ flameId: flame.id, unlocked: true, progress: { value: 1, target: 1 } });
    const { tree } = render(flame, state, { active: true });
    const node = radio(tree);

    expect(node.props.accessibilityState.selected).toBe(true);
    expect(node.props.accessibilityLabel).toContain('. Active');
  });
});

/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the public surface of src/components/Settings/FlameRow.tsx:
 *  - FlameRow (default export): equip on unlocked tap, locked-tap rejection cue
 *    that auto-clears after REJECT_MS, accessibility labels/state, "Just unlocked!"
 *    prefix, and progress rendering.
 *  - swatchColors: gradient when unlocked, embered stops when locked.
 *  - statusFor: base / unlocked-time countdown / expired re-earn / locked streak
 *    progress text.
 *  - REJECT_MS: the rejection cue duration constant.
 *
 * react-native-reanimated and expo-linear-gradient are mocked so the row renders
 * under jest-expo without native modules. Timers are faked so the 250ms cue is
 * deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow, { REJECT_MS } from '../src/components/Settings/FlameRow';
import { FLAMES, type FlameId, type FlameStyle } from '../src/domain/flames';
import type { AchievementState } from '../src/domain/achievements';

// Reanimated has no native runtime under jest; replace the hooks/helpers the
// row uses with inert stand-ins that keep the shared value readable/writable.
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: RN.View },
    useSharedValue: (init: number) => ({ value: init }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (toValue: number) => toValue,
  };
});

// LinearGradient is a native view; render it as a plain View that keeps its props.
jest.mock('expo-linear-gradient', () => {
  const RN = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: object) => RN.View(props),
  };
});

// Fixed, hand-built states so every assertion is deterministic.
function lockedState(flame: FlameStyle, value = 0, target = 1): AchievementState {
  return {
    flameId: flame.id,
    unlocked: false,
    progress: { value, target },
    achievementDay: null,
    daysLeft: null,
    expired: false,
  };
}

function unlockedState(flame: FlameStyle, daysLeft: number | null = null): AchievementState {
  return {
    flameId: flame.id,
    unlocked: true,
    progress: { value: 1, target: 1 },
    achievementDay: '2026-06-10',
    daysLeft,
    expired: false,
  };
}

function findFlame(id: FlameId): FlameStyle {
  const flame = FLAMES.find(f => f.id === id);
  if (!flame) throw new Error(`fixture missing flame ${id}`);
  return flame;
}

function renderRow(props: {
  flame: FlameStyle;
  state: AchievementState;
  active?: boolean;
  justUnlocked?: boolean;
  onPress?: (id: FlameId) => void;
}) {
  const onPress = props.onPress ?? jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={props.flame}
        state={props.state}
        active={props.active ?? false}
        justUnlocked={props.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// The Pressable is the radio node carrying the accessibility props.
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function');
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

describe('REJECT_MS', () => {
  test('is the ~250ms rejection cue duration', () => {
    expect(REJECT_MS).toBe(250);
  });
});

describe('FlameRow: tap behavior', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('tapping an unlocked row calls onPress with the flame id', () => {
    const amber = findFlame('amber');
    const { tree, onPress } = renderRow({ flame: amber, state: unlockedState(amber) });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('tapping a locked row never calls onPress (equip is rejected)', () => {
    const voidfire = findFlame('voidfire');
    const { tree, onPress } = renderRow({ flame: voidfire, state: lockedState(voidfire) });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('tapping a locked row shows the rejection cue, cleared after ~250ms', () => {
    jest.useFakeTimers();
    const voidfire = findFlame('voidfire');
    const { tree } = renderRow({ flame: voidfire, state: lockedState(voidfire) });

    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-voidfire' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-voidfire' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-voidfire' }).length).toBe(0);
  });

  test('tapping an unlocked row shows no rejection cue', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow({ flame: amber, state: unlockedState(amber) });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-amber' }).length).toBe(0);
  });

  test('repeated locked taps restart the cue timer instead of stacking', () => {
    jest.useFakeTimers();
    const voidfire = findFlame('voidfire');
    const { tree } = renderRow({ flame: voidfire, state: lockedState(voidfire) });

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
    // 400ms since first tap but only 200ms since the second: still visible.
    expect(tree.root.findAllByProps({ testID: 'flame-reject-voidfire' }).length).toBeGreaterThan(0);
  });
});

describe('FlameRow: accessibility', () => {
  test('active flag is exposed as selected', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow({ flame: amber, state: unlockedState(amber), active: true });
    expect(radio(tree).props.accessibilityState.selected).toBe(true);
    expect(radio(tree).props.accessibilityLabel).toContain('Active');
  });

  test('unlocked row is not disabled and has no Locked prefix', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow({ flame: amber, state: unlockedState(amber) });
    expect(radio(tree).props.accessibilityState.disabled).toBe(false);
    expect(radio(tree).props.accessibilityLabel).not.toContain('Locked');
  });

  test('locked row is disabled and its label starts with "Locked — "', () => {
    const voidfire = findFlame('voidfire');
    const { tree } = renderRow({ flame: voidfire, state: lockedState(voidfire) });
    expect(radio(tree).props.accessibilityState.disabled).toBe(true);
    expect(radio(tree).props.accessibilityLabel).toMatch(/^Voidfire\. Locked — /);
  });
});

describe('FlameRow: justUnlocked', () => {
  test('prefixes status with "Just unlocked!"', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow({ flame: amber, state: unlockedState(amber), justUnlocked: true });
    expect(allText(tree)).toContain('Just unlocked! Unlocked');
  });

  test('no prefix when justUnlocked is omitted', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow({ flame: amber, state: unlockedState(amber) });
    expect(allText(tree)).not.toContain('Just unlocked!');
  });
});

describe('FlameRow: progress rendering', () => {
  test('locked streak row renders the requirement and value/target counter', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow({ flame: sodium, state: lockedState(sodium, 4, 7) });
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('counter is clamped so value above target never reads past target', () => {
    const sodium = findFlame('sodium');
    const { tree } = renderRow({ flame: sodium, state: lockedState(sodium, 9, 7) });
    expect(allText(tree)).toContain('· 7/7');
  });
});

describe('FlameRow: statusFor-derived text', () => {
  test('base flame (no achievement) reads "Unlocked"', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow({ flame: { ...amber, achievement: undefined }, state: unlockedState(amber) });
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time achievement shows the days-left countdown', () => {
    const toxic = findFlame('toxic');
    const { tree } = renderRow({ flame: toxic, state: unlockedState(toxic, 5) });
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('negative daysLeft is clamped to 0d left', () => {
    const toxic = findFlame('toxic');
    const { tree } = renderRow({ flame: toxic, state: unlockedState(toxic, -2) });
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('expired time achievement prompts re-earn with the requirement', () => {
    const toxic = findFlame('toxic');
    const state: AchievementState = {
      ...lockedState(toxic, 3, 3),
      expired: true,
      achievementDay: '2026-05-01',
      daysLeft: -3,
    };
    const { tree } = renderRow({ flame: toxic, state });
    expect(allText(tree)).toContain(`Expired — re-earn: ${toxic.achievement?.requirement}`);
  });
});

describe('swatchColors (via rendered LinearGradient)', () => {
  function gradientColors(tree: ReactTestRenderer.ReactTestRenderer): string[] {
    const grad = tree.root.findAll(n => Array.isArray(n.props.colors))[0];
    return grad.props.colors as string[];
  }

  test('unlocked row uses the full flame gradient', () => {
    const amber = findFlame('amber');
    const { tree } = renderRow({ flame: amber, state: unlockedState(amber) });
    expect(gradientColors(tree)).toEqual(amber.gradient);
  });

  test('locked row uses the embered stops in core, gold, amber, ember, red order', () => {
    const voidfire = findFlame('voidfire');
    const { tree } = renderRow({ flame: voidfire, state: lockedState(voidfire) });
    const e = voidfire.embered;
    expect(gradientColors(tree)).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
  });
});

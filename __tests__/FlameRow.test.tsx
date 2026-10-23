/**
 * FlameRow.test.tsx — unit tests for the FlameRow gallery row.
 *
 * Covers the status text derived by `statusFor` (base, unlocked streak/time,
 * locked streak progress, expired time re-earn), the swatch colors chosen by
 * `swatchColors`, the locked-row accessibility label, and the press behavior:
 * an unlocked tap equips, a locked tap is rejected with a visual cue that
 * clears after REJECT_MS.
 *
 * Animation and gradient libraries are mocked so the tests are deterministic
 * and do not depend on native modules.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import { FLAMES, type FlameId, type FlameStyle } from '../src/domain/flames';
import type { AchievementState } from '../src/domain/achievements';

// Mock Reanimated: shared values are plain holders, and animated styles are
// empty objects. This keeps tests free of the native animation runtime.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: unknown) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (value: unknown) => value,
  };
});

// Mock the gradient: a plain View that records its colors as props, so tests
// can assert which palette was selected.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: object) => React.createElement(View, props),
  };
});

// Find a flame by id, failing loudly if the catalog changes shape.
function flameById(id: FlameId): FlameStyle {
  const f = FLAMES.find(x => x.id === id);
  if (!f) throw new Error(`test fixture: no flame with id ${id}`);
  return f;
}

// Build an AchievementState with sensible defaults; tests override fields.
function stateOf(partial: Partial<AchievementState> & { flameId: FlameId }): AchievementState {
  return {
    unlocked: false,
    progress: { value: 0, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...partial,
  } as AchievementState;
}

// Render a row and return the renderer plus the root Pressable (the element
// that carries onPress and accessibilityRole).
function renderRow(
  flame: FlameStyle,
  state: AchievementState,
  opts: { active?: boolean; justUnlocked?: boolean } = {},
) {
  const onPress = jest.fn();
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
  const pressable = tree.root.find(
    n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function',
  );
  return { tree, onPress, pressable };
}

// Collect every rendered string so we can substring-match the row's text.
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

// Find the gradient swatch by its gradient-specific props.
function swatchOf(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.colors !== undefined && n.props.start !== undefined);
}

describe('statusFor (rendered status line)', () => {
  test('base flame with no achievement shows "Unlocked"', () => {
    const amber = flameById('amber');
    const { tree } = renderRow(amber, stateOf({ flameId: 'amber', unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
  });

  test('unlocked time flame shows the countdown', () => {
    const toxic = flameById('toxic');
    const { tree } = renderRow(
      toxic,
      stateOf({ flameId: 'toxic', unlocked: true, daysLeft: 5, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative daysLeft to 0d', () => {
    const toxic = flameById('toxic');
    const { tree } = renderRow(
      toxic,
      stateOf({ flameId: 'toxic', unlocked: true, daysLeft: -2, achievementDay: '2026-06-10' }),
    );
    expect(allText(tree)).toContain('Unlocked · 0d left');
    expect(allText(tree)).not.toContain('-2d');
  });

  test('locked streak flame shows requirement and value/target counter', () => {
    const sodium = flameById('sodium');
    const { tree } = renderRow(
      sodium,
      stateOf({ flameId: 'sodium', progress: { value: 4, target: 7 } }),
    );
    expect(allText(tree)).toContain(`${sodium.achievement?.requirement} · 4/7`);
  });

  test('locked streak flame clamps the displayed counter to the target', () => {
    const sodium = flameById('sodium');
    const { tree } = renderRow(
      sodium,
      stateOf({ flameId: 'sodium', progress: { value: 99, target: 7 } }),
    );
    expect(allText(tree)).toContain(`${sodium.achievement?.requirement} · 7/7`);
  });

  test('locked streak flame with zero target renders an empty progress fill without dividing by zero', () => {
    const sodium = flameById('sodium');
    const { tree } = renderRow(
      sodium,
      stateOf({ flameId: 'sodium', progress: { value: 3, target: 0 } }),
    );
    // With a zero target the fraction is forced to 0, so the fill width is 0%.
    // Confirm the text still renders and no NaN/Infinity leaks into the output.
    const text = allText(tree);
    expect(text).toContain(`${sodium.achievement?.requirement} · 0/0`);
    expect(text).not.toContain('NaN');
    expect(text).not.toContain('Infinity');
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const toxic = flameById('toxic');
    const { tree } = renderRow(
      toxic,
      stateOf({
        flameId: 'toxic',
        expired: true,
        daysLeft: -3,
        achievementDay: '2026-05-01',
        progress: { value: 3, target: 3 },
      }),
    );
    expect(allText(tree)).toContain(`Expired — re-earn: ${toxic.achievement?.requirement}`);
  });
});

describe('swatchColors (swatch gradient selection)', () => {
  test('unlocked rows use the full flame gradient', () => {
    const amber = flameById('amber');
    const { tree } = renderRow(amber, stateOf({ flameId: 'amber', unlocked: true }));
    expect(swatchOf(tree).props.colors).toEqual(amber.gradient);
  });

  test('locked rows use the embered stops in core, gold, amber, ember, red order', () => {
    const sodium = flameById('sodium');
    const { tree } = renderRow(sodium, stateOf({ flameId: 'sodium' }));
    const e = sodium.embered;
    expect(swatchOf(tree).props.colors).toEqual([e.core, e.gold, e.amber, e.ember, e.red]);
  });
});

describe('FlameRow accessibility', () => {
  test('locked row label is prefixed with "Locked — "', () => {
    const sodium = flameById('sodium');
    const { pressable } = renderRow(sodium, stateOf({ flameId: 'sodium' }));
    expect(pressable.props.accessibilityLabel).toMatch(/^Sodium\. Locked — /);
    expect(pressable.props.accessibilityState.disabled).toBe(true);
  });

  test('unlocked row label has no "Locked" prefix and is enabled', () => {
    const amber = flameById('amber');
    const { pressable } = renderRow(amber, stateOf({ flameId: 'amber', unlocked: true }), {
      active: true,
    });
    expect(pressable.props.accessibilityLabel).toBe('Amber. Unlocked. Active');
    expect(pressable.props.accessibilityState.disabled).toBe(false);
    expect(pressable.props.accessibilityState.selected).toBe(true);
  });
});

describe('FlameRow press behavior', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('tapping an unlocked row calls onPress with the flame id', () => {
    const amber = flameById('amber');
    const { pressable, onPress } = renderRow(amber, stateOf({ flameId: 'amber', unlocked: true }));
    act(() => {
      pressable.props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('tapping a locked row does not equip and shows the rejection cue', () => {
    const sodium = flameById('sodium');
    const { tree, pressable, onPress } = renderRow(sodium, stateOf({ flameId: 'sodium' }));
    act(() => {
      pressable.props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
  });

  test('the rejection cue clears after REJECT_MS', () => {
    const sodium = flameById('sodium');
    const { tree, pressable } = renderRow(sodium, stateOf({ flameId: 'sodium' }));
    act(() => {
      pressable.props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
  });

  test('repeated locked taps restart the cue timer instead of stacking', () => {
    const sodium = flameById('sodium');
    const { tree, pressable } = renderRow(sodium, stateOf({ flameId: 'sodium' }));
    act(() => {
      pressable.props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      pressable.props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    // 400ms total, but the second tap restarted the 250ms window, so the cue is still up.
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-sodium' }).length).toBe(0);
  });

  test('active flame shows the check mark', () => {
    const amber = flameById('amber');
    const { tree } = renderRow(amber, stateOf({ flameId: 'amber', unlocked: true }), {
      active: true,
    });
    expect(allText(tree)).toContain('✓');
  });
});

/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the status text for each achievement state (base, unlocked time with
 * countdown, locked streak with progress, expired time), the `justUnlocked`
 * celebration prefix, and the pressing behavior (unlocked rows equip, locked
 * rows are rejected with a ~250 ms cue).
 *
 * react-native-reanimated and expo-linear-gradient are mocked so the component
 * renders under jest-expo without native modules. Timers are faked so the
 * rejection cue's auto-reset is deterministic.
 *
 * Note: statusFor, swatchColors and REJECT_MS are module-private in
 * FlameRow.tsx, so they are exercised indirectly through rendered output.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// Reanimated has no native runtime under Jest: replace the hooks we use with
// plain values so the shake animation becomes a no-op that still renders.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (value: number) => value,
  };
});

// The gradient is purely visual; render it as a plain View.
jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, LinearGradient: View };
});

// Mirrors the rejection cue duration defined in FlameRow.tsx.
const REJECT_MS = 250;

// Build a minimal FlameStyle fixture. Only the fields FlameRow reads are set.
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
    palette: { core: '#ffcc00' },
    achievement: {
      type: 'time',
      requirement: 'Log 3 days in a row',
    },
    ...overrides,
  } as unknown as FlameStyle;
}

// Build an AchievementState fixture with sensible defaults.
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

// Render a FlameRow and return the renderer plus the onPress spy.
function render(
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
  return { tree, onPress };
}

// Collect every rendered text string so we can assert on visible copy.
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

// Find the single radio row (the Pressable) for this flame.
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

describe('FlameRow status text', () => {
  test('base flame with no achievement reads "Unlocked"', () => {
    const { tree } = render(
      makeFlame({ achievement: undefined } as Partial<FlameStyle>),
      makeState({ unlocked: true }),
    );
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows the day countdown', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true, daysLeft: 5 }));
    expect(allText(tree)).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative countdown to 0d left', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true, daysLeft: -2 }));
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('unlocked streak flame shows plain "Unlocked"', () => {
    const flame = makeFlame({
      achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
    } as Partial<FlameStyle>);
    const { tree } = render(flame, makeState({ unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('locked streak flame shows requirement and value/target counter', () => {
    const flame = makeFlame({
      achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
    } as Partial<FlameStyle>);
    const { tree } = render(flame, makeState({ progress: { value: 4, target: 7 } }));
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('locked streak counter clamps to the target', () => {
    const flame = makeFlame({
      achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
    } as Partial<FlameStyle>);
    const { tree } = render(flame, makeState({ progress: { value: 9, target: 7 } }));
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('expired time flame prompts a re-earn', () => {
    const { tree } = render(
      makeFlame(),
      makeState({ expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });

  test('prefixes the status with "Just unlocked!" when justUnlocked is set', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true, daysLeft: 2 }), {
      justUnlocked: true,
    });
    expect(allText(tree)).toContain('Just unlocked! Unlocked · 2d left');
  });

  test('marks the active flame with a check and selected accessibility state', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true }), { active: true });
    expect(allText(tree)).toContain('✓');
    expect(radio(tree).props.accessibilityState.selected).toBe(true);
    expect(radio(tree).props.accessibilityLabel).toContain('Active');
  });

  test('locked rows announce themselves as disabled with a Locked label', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: false }));
    expect(radio(tree).props.accessibilityState.disabled).toBe(true);
    expect(radio(tree).props.accessibilityLabel).toContain('Locked');
  });
});

describe('FlameRow pressing', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = render(makeFlame(), makeState({ unlocked: true, daysLeft: 3 }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('toxic');
  });

  test('pressing a locked row does not call onPress', () => {
    const { tree, onPress } = render(makeFlame(), makeState({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
  });

  test('pressing a locked row shows the rejection cue, which clears after ~250 ms', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_MS);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBe(0);
  });

  test('a second locked press restarts the rejection cue timer', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: false }));
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 50);
    });
    act(() => {
      radio(tree).props.onPress();
    });
    // 50 ms after the second press the cue must still be visible (timer restarted).
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBeGreaterThan(0);
  });

  test('an unlocked press never shows the rejection cue', () => {
    const { tree } = render(makeFlame(), makeState({ unlocked: true, daysLeft: 1 }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-toxic' }).length).toBe(0);
  });
});

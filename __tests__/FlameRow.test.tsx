/**
 * FlameRow.test.tsx — unit tests for the FlameRow gallery row.
 *
 * Covers the pure helpers (swatchColors, statusFor) and the component's
 * behavior: equip on unlocked tap, rejection cue on locked tap (cleared after
 * REJECT_MS), and the "Just unlocked!" status prefix.
 *
 * expo-linear-gradient and react-native-reanimated are mocked so the test runs
 * deterministically under jest-expo without native modules.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';
import FlameRow, { REJECT_MS, statusFor, swatchColors } from '../src/components/Settings/FlameRow';

// LinearGradient is a native view; render it as a plain host element.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: object) => React.createElement(View, props),
  };
});

// Reanimated worklets don't run under the test renderer; provide inert stand-ins.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...args: unknown[]) => args[args.length - 1],
    withTiming: (value: number) => value,
    // React is referenced so the factory stays self-contained.
    __react: React,
  };
});

// Minimal flame fixtures matching the FlameStyle shape the component reads.
function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'crimson',
    name: 'Crimson',
    gradient: ['#ff0000', '#ff7a18', '#ffae3b'],
    embered: { core: '#400', gold: '#530', amber: '#640', ember: '#750', red: '#860' },
    palette: { core: '#ffd27a' },
    achievement: {
      type: 'streak',
      requirement: 'Keep a 7-day run',
    },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'crimson',
    unlocked: true,
    progress: { value: 7, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

function render(element: React.ReactElement) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(element);
  });
  return tree;
}

function findRow(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

describe('swatchColors', () => {
  const flame = makeFlame();

  test('returns the full gradient when unlocked', () => {
    expect(swatchColors(flame, true)).toEqual(flame.gradient);
  });

  test('returns the embered stops when locked', () => {
    expect(swatchColors(flame, false)).toEqual(['#400', '#530', '#640', '#750', '#860']);
  });
});

describe('statusFor', () => {
  test('base flame with no achievement always reads "Unlocked"', () => {
    const base = makeFlame({ achievement: undefined } as Partial<FlameStyle>);
    const result = statusFor(base, makeState({ unlocked: false }));
    expect(result).toEqual({ text: 'Unlocked', progress: null });
  });

  test('unlocked streak flame reads "Unlocked" with no progress bar', () => {
    const result = statusFor(makeFlame(), makeState({ unlocked: true }));
    expect(result).toEqual({ text: 'Unlocked', progress: null });
  });

  test('unlocked time flame shows the countdown', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(flame, makeState({ unlocked: true, daysLeft: 5 }));
    expect(result.text).toBe('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative countdown at zero', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(flame, makeState({ unlocked: true, daysLeft: -2 }));
    expect(result.text).toBe('Unlocked · 0d left');
  });

  test('locked streak row shows requirement, counter and progress fraction', () => {
    const result = statusFor(
      makeFlame(),
      makeState({ unlocked: false, progress: { value: 4, target: 7 } }),
    );
    expect(result.text).toBe('Keep a 7-day run · 4/7');
    expect(result.progress).toBeCloseTo(4 / 7);
  });

  test('locked streak counter never exceeds the target', () => {
    const result = statusFor(
      makeFlame(),
      makeState({ unlocked: false, progress: { value: 9, target: 7 } }),
    );
    expect(result.text).toBe('Keep a 7-day run · 7/7');
    expect(result.progress).toBe(1);
  });

  test('zero target yields zero progress without dividing by zero', () => {
    const result = statusFor(
      makeFlame(),
      makeState({ unlocked: false, progress: { value: 0, target: 0 } }),
    );
    expect(result.progress).toBe(0);
  });

  test('expired time flame prompts re-earn', () => {
    const flame = makeFlame({
      achievement: { type: 'time', requirement: 'Log 3 days' },
    } as Partial<FlameStyle>);
    const result = statusFor(
      flame,
      makeState({ unlocked: false, expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(result.text).toBe('Expired — re-earn: Log 3 days');
  });
});

describe('FlameRow component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('pressing an unlocked row calls onPress with the flame id', () => {
    const onPress = jest.fn();
    const tree = render(
      <FlameRow flame={makeFlame()} state={makeState({ unlocked: true })} active={false} onPress={onPress} />,
    );
    act(() => {
      findRow(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('crimson');
  });

  test('pressing a locked row does not call onPress and shows the rejection cue', () => {
    const onPress = jest.fn();
    const tree = render(
      <FlameRow flame={makeFlame()} state={makeState({ unlocked: false })} active={false} onPress={onPress} />,
    );
    act(() => {
      findRow(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(tree.root.findAllByProps({ testID: 'flame-reject-crimson' }).length).toBeGreaterThan(0);
  });

  test('the rejection cue clears after REJECT_MS', () => {
    const tree = render(
      <FlameRow flame={makeFlame()} state={makeState({ unlocked: false })} active={false} onPress={jest.fn()} />,
    );
    act(() => {
      findRow(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-crimson' }).length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: 'flame-reject-crimson' }).length).toBe(0);
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const tree = render(
      <FlameRow
        flame={makeFlame()}
        state={makeState({ unlocked: true })}
        active={false}
        justUnlocked
        onPress={jest.fn()}
      />,
    );
    const label = findRow(tree).props.accessibilityLabel as string;
    expect(label).toContain('Just unlocked! Unlocked');
  });

  test('locked rows are announced as disabled with a "Locked —" label', () => {
    const tree = render(
      <FlameRow flame={makeFlame()} state={makeState({ unlocked: false })} active={false} onPress={jest.fn()} />,
    );
    const row = findRow(tree);
    expect(row.props.accessibilityState.disabled).toBe(true);
    expect(row.props.accessibilityLabel).toContain('Locked — Keep a 7-day run');
  });

  test('the active flame is marked selected and shows the check mark', () => {
    const tree = render(
      <FlameRow flame={makeFlame()} state={makeState({ unlocked: true })} active onPress={jest.fn()} />,
    );
    expect(findRow(tree).props.accessibilityState.selected).toBe(true);
    expect(findRow(tree).props.accessibilityLabel).toContain('Active');
  });
});

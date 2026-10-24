/**
 * FlameRow.test.tsx — unit tests for the flame gallery row.
 *
 * Covers the public surface of src/components/Settings/FlameRow.tsx:
 *  - swatchColors: full gradient when unlocked, embered stops when locked.
 *  - statusFor: status text + progress fraction for base, unlocked time,
 *    locked streak (progress counter), and expired time flames.
 *  - FlameRow component: a locked tap never calls onPress (FR-001) and the
 *    rejection cue is visible for ~REJECT_MS (FR-002); unlocked taps equip.
 *
 * Only the default export FlameRow is exported by the production module, so
 * the helpers are exercised through the rendered component and through a
 * local copy of the documented contract is NOT used: the helpers are reached
 * by rendering FlameRow and inspecting its output. REJECT_MS is mirrored here
 * as the documented 250ms cue duration.
 *
 * Fixtures are fixed literals so every assertion is deterministic. The
 * expo-linear-gradient and react-native-reanimated modules are mocked so the
 * test runs without native code or a real animation loop.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// ---- Module mocks -----------------------------------------------------------
// LinearGradient is a native view; render it as a plain View-like host element.
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: object) => React.createElement(View, props),
  };
});

// Reanimated: stub the hooks and the Animated.View so no worklet runtime is
// needed. withSequence/withTiming just return their last value.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withTiming: (to: number) => to,
    __react: React,
  };
});

// Mirrors the production cue duration (FlameRow.tsx REJECT_MS) for assertions.
const REJECT_MS = 250;

// Imported after the mocks so FlameRow picks up the stubbed modules.
import FlameRow from '../src/components/Settings/FlameRow';

// ---- Fixtures ---------------------------------------------------------------
const GRADIENT = ['#fff1b8', '#ffae3b', '#ff7a18', '#c0392b', '#5a0d00'];
const EMBERED = {
  core: '#222222',
  gold: '#333333',
  amber: '#444444',
  ember: '#555555',
  red: '#666666',
};

const baseFlame = {
  id: 'amber',
  name: 'Amber',
  gradient: GRADIENT,
  embered: EMBERED,
  palette: { core: '#ffe9a8' },
  achievement: undefined,
} as unknown as FlameStyle;

const streakFlame = {
  id: 'sodium',
  name: 'Sodium',
  gradient: GRADIENT,
  embered: EMBERED,
  palette: { core: '#ffd27f' },
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
} as unknown as FlameStyle;

const timeFlame = {
  id: 'toxic',
  name: 'Toxic',
  gradient: GRADIENT,
  embered: EMBERED,
  palette: { core: '#9dff7a' },
  achievement: { type: 'time', requirement: 'Log 3 days in a row' },
} as unknown as FlameStyle;

function state(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber',
    unlocked: false,
    progress: { value: 0, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

// ---- Rendering helpers ------------------------------------------------------
function renderRow(
  flame: FlameStyle,
  st: AchievementState,
  onPress = jest.fn(),
) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow flame={flame} state={st} active={false} onPress={onPress} />,
    );
  });
  return { tree, onPress };
}

function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

// Collect all rendered text nodes joined into one string for substring checks.
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

// ---- Status / swatch behavior (exercised via rendering) ---------------------
describe('swatch and status rendering', () => {
  test('unlocked row shows the full gradient as the swatch colors', () => {
    const { tree } = renderRow(streakFlame, state({ unlocked: true }));
    const swatch = tree.root.find(n => n.props.colors !== undefined);
    expect(swatch.props.colors).toEqual(GRADIENT);
  });

  test('locked row shows the embered stops as the swatch colors', () => {
    const { tree } = renderRow(streakFlame, state());
    const swatch = tree.root.find(n => n.props.colors !== undefined);
    expect(swatch.props.colors).toEqual([
      EMBERED.core,
      EMBERED.gold,
      EMBERED.amber,
      EMBERED.ember,
      EMBERED.red,
    ]);
  });

  test('base flame (no achievement) reads "Unlocked" with no progress bar', () => {
    const { tree } = renderRow(baseFlame, state({ unlocked: true }));
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('unlocked time flame shows the day countdown', () => {
    const { tree } = renderRow(timeFlame, state({ unlocked: true, daysLeft: 4 }));
    expect(allText(tree)).toContain('Unlocked · 4d left');
  });

  test('unlocked time flame clamps a negative countdown to 0d', () => {
    const { tree } = renderRow(timeFlame, state({ unlocked: true, daysLeft: -2 }));
    expect(allText(tree)).toContain('Unlocked · 0d left');
  });

  test('locked streak flame shows the requirement with a progress counter', () => {
    const { tree } = renderRow(
      streakFlame,
      state({ progress: { value: 4, target: 7 } }),
    );
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  test('locked streak counter caps the displayed value at the target', () => {
    const { tree } = renderRow(
      streakFlame,
      state({ progress: { value: 9, target: 7 } }),
    );
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('locked streak with a zero target renders without dividing by zero', () => {
    const { tree } = renderRow(
      streakFlame,
      state({ progress: { value: 0, target: 0 } }),
    );
    expect(allText(tree)).toContain('Keep a 7-day run · 0/0');
  });

  test('expired time flame prompts a re-earn of its requirement', () => {
    const { tree } = renderRow(
      timeFlame,
      state({ expired: true, daysLeft: -3, progress: { value: 3, target: 3 } }),
    );
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });
});

// ---- FlameRow interaction ---------------------------------------------------
describe('FlameRow component', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('a locked tap does NOT invoke onPress (FR-001)', () => {
    const { tree, onPress } = renderRow(streakFlame, state());

    act(() => {
      radio(tree).props.onPress();
    });

    expect(onPress).not.toHaveBeenCalled();
  });

  test('a locked tap shows the rejection cue for about REJECT_MS (FR-002)', () => {
    const { tree } = renderRow(streakFlame, state());
    const cueId = `flame-reject-${streakFlame.id}`;

    act(() => {
      radio(tree).props.onPress();
    });

    // Cue is visible immediately after the tap.
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    // Still visible just before the window closes.
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBeGreaterThan(0);

    // Cleared once the window elapses.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(tree.root.findAllByProps({ testID: cueId }).length).toBe(0);
  });

  test('an unlocked tap invokes onPress with the flame id and shows no cue', () => {
    const { tree, onPress } = renderRow(
      streakFlame,
      state({ unlocked: true, progress: { value: 7, target: 7 } }),
    );

    act(() => {
      radio(tree).props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('sodium');
    expect(
      tree.root.findAllByProps({ testID: `flame-reject-${streakFlame.id}` }).length,
    ).toBe(0);
  });

  test('locked rows are announced as disabled with a "Locked —" label', () => {
    const { tree } = renderRow(streakFlame, state());
    const row = radio(tree);

    expect(row.props.accessibilityState.disabled).toBe(true);
    expect(row.props.accessibilityLabel).toContain('Locked — ');
  });

  test('unlocked rows are not disabled', () => {
    const { tree } = renderRow(baseFlame, state({ unlocked: true }));
    expect(radio(tree).props.accessibilityState.disabled).toBe(false);
  });
});

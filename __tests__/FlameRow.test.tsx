/**
 * FlameRow.test.tsx — unit tests for the flame gallery row component.
 *
 * Covers the pure helpers (swatchColors, statusFor) and the FlameRow component:
 * equip path for unlocked rows, the locked-tap rejection cue (shake/flash that
 * resets after REJECT_MS), status text, and accessibility labels / radio state.
 * Reanimated and LinearGradient are stubbed so the tests run deterministically
 * under jest-expo with no native modules and no real timers.
 *
 * The helpers are not exported from FlameRow.tsx, so they are reached through
 * the component's rendered output and the module's default export; REJECT_MS
 * is asserted through its observable timing behaviour.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// The rejection cue duration, mirrored from the component for timing assertions.
const REJECT_MS = 250;

// ---- Stubs -------------------------------------------------------------
// Reanimated: shared values are plain holders; animated styles are evaluated
// once; withSequence/withTiming return their final value so the shake is
// observable without running a real animation loop.
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => object) => fn(),
    withSequence: (...vals: number[]) => vals[vals.length - 1],
    withTiming: (to: number) => to,
  };
});

// LinearGradient renders as a plain host element so props remain inspectable.
jest.mock('expo-linear-gradient', () => {
  const ReactLib = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    LinearGradient: (props: object) => ReactLib.createElement(View, props),
  };
});

// ---- Fixtures ----------------------------------------------------------
const palette = {
  core: '#ffe9b0',
  gold: '#ffd060',
  amber: '#ffae3b',
  ember: '#ff7a18',
  red: '#c8381a',
};

function makeFlame(overrides: Record<string, unknown> = {}): FlameStyle {
  return {
    id: 'amber',
    name: 'Amber',
    gradient: ['#111111', '#222222', '#333333'],
    embered: { core: 'e1', gold: 'e2', amber: 'e3', ember: 'e4', red: 'e5' },
    palette,
    achievement: undefined,
    ...overrides,
  } as unknown as FlameStyle;
}

const streakFlame = makeFlame({
  id: 'sodium',
  name: 'Sodium',
  achievement: { type: 'streak', requirement: 'Keep a 7-day run' },
});

const timeFlame = makeFlame({
  id: 'toxic',
  name: 'Toxic',
  achievement: { type: 'time', requirement: 'Log 3 days in a row' },
});

function makeState(partial: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber',
    unlocked: false,
    progress: { value: 0, target: 7 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...partial,
  } as AchievementState;
}

interface RenderOpts {
  flame?: FlameStyle;
  state?: AchievementState;
  active?: boolean;
  justUnlocked?: boolean;
}

function render(opts: RenderOpts = {}) {
  const onPress = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={opts.flame ?? makeFlame()}
        state={opts.state ?? makeState({ unlocked: true, progress: { value: 1, target: 1 } })}
        active={opts.active ?? false}
        justUnlocked={opts.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// The Pressable is the element carrying accessibilityRole="radio".
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

function rejectCues(tree: ReactTestRenderer.ReactTestRenderer, id: string) {
  return tree.root.findAllByProps({ testID: `flame-reject-${id}` });
}

// ---- Rendered-output helpers ------------------------------------------

// Collects every text string rendered inside the tree, in order.
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

// ---- Pure helper behaviour (exercised via the rendered output) ---------

describe('swatch colours (via rendered LinearGradient)', () => {
  // Unlocked rows show the full flame gradient.
  test('unlocked row uses the full flame gradient', () => {
    const flame = makeFlame();
    const { tree } = render({ flame, state: makeState({ unlocked: true }) });
    const grad = tree.root.findAll(n => n.props.colors !== undefined)[0];
    expect(grad.props.colors).toEqual(flame.gradient);
  });

  // Locked rows show the dim embered stops in core→red order.
  test('locked row uses the five embered stops', () => {
    const { tree } = render({ flame: makeFlame(), state: makeState({ unlocked: false }) });
    const grad = tree.root.findAll(n => n.props.colors !== undefined)[0];
    expect(grad.props.colors).toEqual(['e1', 'e2', 'e3', 'e4', 'e5']);
  });
});

describe('status text (via rendered output)', () => {
  // Base flame has no achievement, so it always reads as unlocked with no bar.
  test('base flame (no achievement) always reads Unlocked with no progress bar', () => {
    const { tree } = render({ flame: makeFlame(), state: makeState({ unlocked: true }) });
    expect(allText(tree)).toContain('Unlocked');
    expect(tree.root.findAll(n => n.props.style && n.props.style.height === 4).length).toBe(0);
  });

  test('unlocked time flame shows the day countdown', () => {
    const { tree } = render({
      flame: timeFlame,
      state: makeState({ unlocked: true, daysLeft: 4 }),
    });
    expect(allText(tree)).toContain('Unlocked · 4d left');
  });

  // A countdown that has gone negative must never display as "-2d left".
  test('unlocked time flame clamps a negative countdown to 0d', () => {
    const { tree } = render({
      flame: timeFlame,
      state: makeState({ unlocked: true, daysLeft: -2 }),
    });
    expect(allText(tree)).toContain('Unlocked · 0d left');
    expect(allText(tree)).not.toContain('-2d');
  });

  // Only time flames carry a countdown; streak flames stay plain.
  test('unlocked streak flame shows plain Unlocked even with daysLeft set', () => {
    const { tree } = render({
      flame: streakFlame,
      state: makeState({ unlocked: true, daysLeft: 3 }),
    });
    expect(allText(tree)).toContain('Unlocked');
    expect(allText(tree)).not.toContain('left');
  });

  test('locked streak flame shows requirement plus counter', () => {
    const { tree } = render({
      flame: streakFlame,
      state: makeState({ progress: { value: 4, target: 7 } }),
    });
    expect(allText(tree)).toContain('Keep a 7-day run · 4/7');
  });

  // Overshoot (e.g. 9 of 7) is clamped in the counter.
  test('locked counter is capped at the target when value overshoots', () => {
    const { tree } = render({
      flame: streakFlame,
      state: makeState({ progress: { value: 9, target: 7 } }),
    });
    expect(allText(tree)).toContain('Keep a 7-day run · 7/7');
  });

  test('expired time flame prompts re-earn with the requirement', () => {
    const { tree } = render({
      flame: timeFlame,
      state: makeState({ expired: true, progress: { value: 3, target: 3 } }),
    });
    expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
  });
});

// ---- Component ---------------------------------------------------------

describe('FlameRow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('unlocked row equips the flame id on press', () => {
    const { tree, onPress } = render({ flame: makeFlame({ id: 'amber' }) });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  // An equipped unlocked row must not flash the rejection cue.
  test('unlocked row does not show a rejection cue', () => {
    const { tree } = render();
    act(() => {
      radio(tree).props.onPress();
    });
    expect(rejectCues(tree, 'amber')).toHaveLength(0);
  });

  // FR-001 / FR-002: a locked tap never equips and shows visible feedback.
  test('locked row does NOT call onPress and shows the rejection cue', () => {
    jest.useFakeTimers();
    const { tree, onPress } = render({ flame: streakFlame, state: makeState() });
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(rejectCues(tree, 'sodium').length).toBeGreaterThan(0);
  });

  test('rejection cue clears itself after REJECT_MS', () => {
    jest.useFakeTimers();
    const { tree } = render({ flame: streakFlame, state: makeState() });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 1);
    });
    expect(rejectCues(tree, 'sodium').length).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(rejectCues(tree, 'sodium')).toHaveLength(0);
  });

  // Rapid repeated taps must extend the cue, not stack timers that cut it short.
  test('repeated locked taps restart the cue timer instead of stacking', () => {
    jest.useFakeTimers();
    const { tree } = render({ flame: streakFlame, state: makeState() });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 100);
    });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_MS - 100);
    });
    // Still visible: the second tap restarted the window.
    expect(rejectCues(tree, 'sodium').length).toBeGreaterThan(0);
  });

  test('locked row is announced as disabled with a Locked label', () => {
    const { tree } = render({ flame: streakFlame, state: makeState() });
    const r = radio(tree);
    expect(r.props.accessibilityState.disabled).toBe(true);
    expect(r.props.accessibilityLabel).toContain('Locked — ');
    expect(r.props.accessibilityLabel).toContain('Keep a 7-day run · 0/7');
  });

  test('unlocked row is not disabled and has no Locked prefix', () => {
    const { tree } = render({
      flame: streakFlame,
      state: makeState({ unlocked: true, progress: { value: 7, target: 7 } }),
    });
    const r = radio(tree);
    expect(r.props.accessibilityState.disabled).toBe(false);
    expect(r.props.accessibilityLabel).not.toContain('Locked');
  });

  test('radio selected state reflects the active flag', () => {
    const { tree } = render({ active: true });
    expect(radio(tree).props.accessibilityState.selected).toBe(true);
    expect(radio(tree).props.accessibilityLabel).toContain('Active');
  });

  test('inactive row is not selected and omits the Active suffix', () => {
    const { tree } = render({ active: false });
    expect(radio(tree).props.accessibilityState.selected).toBe(false);
    expect(radio(tree).props.accessibilityLabel).not.toContain('Active');
  });

  test('justUnlocked prefixes the status with a celebratory label', () => {
    const { tree } = render({
      flame: timeFlame,
      state: makeState({ unlocked: true, daysLeft: 2 }),
      justUnlocked: true,
    });
    expect(radio(tree).props.accessibilityLabel).toContain('Just unlocked! Unlocked · 2d left');
  });

  test('locked row exposes its progress counter in the accessibility label', () => {
    const { tree } = render({
      flame: streakFlame,
      state: makeState({ progress: { value: 2, target: 4 } }),
    });
    expect(radio(tree).props.accessibilityLabel).toContain('2/4');
  });
});

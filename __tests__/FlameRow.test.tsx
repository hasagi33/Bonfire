/**
 * FlameRow.test.tsx — unit tests for one row in the flame gallery.
 *
 * Covers the rendered `FlameRow` component: status text for each
 * AchievementState, progress fractions, the equip path for unlocked rows, and
 * the locked-tap rejection cue that clears after ~250ms using fake timers
 * (no real delays).
 *
 * Inputs: hand-built FlameStyle and AchievementState fixtures.
 * Outputs: Jest assertions only; no network, no wall-clock timing.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameId, FlameStyle } from '../src/domain/flames';

// The rejection cue lasts ~250ms in production; tests advance fake timers
// past this bound rather than importing the (non-exported) constant.
const REJECT_WINDOW_MS = 250;

// ---- Fixtures ----

const EMBERED = {
  core: '#111111',
  gold: '#222222',
  amber: '#333333',
  ember: '#444444',
  red: '#555555',
};

const GRADIENT = ['#aa0000', '#bb4400', '#cc8800', '#ddcc00', '#eeffff'];

// A base flame has no achievement at all.
const baseFlame = {
  id: 'amber' as FlameId,
  name: 'Amber',
  gradient: GRADIENT,
  embered: EMBERED,
  palette: { core: '#ffeeaa' },
  achievement: null,
} as unknown as FlameStyle;

// A streak flame tied to a 7-day run.
const streakFlame = {
  id: 'sodium' as FlameId,
  name: 'Sodium',
  gradient: GRADIENT,
  embered: EMBERED,
  palette: { core: '#aaccff' },
  achievement: { type: 'streak', requirement: 'Keep a 7-day run', target: 7 },
} as unknown as FlameStyle;

// A time flame tied to a 3-day window.
const timeFlame = {
  id: 'toxic' as FlameId,
  name: 'Toxic',
  gradient: GRADIENT,
  embered: EMBERED,
  palette: { core: '#88ff66' },
  achievement: { type: 'time', requirement: 'Log 3 days in a row', target: 3 },
} as unknown as FlameStyle;

function state(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'amber' as FlameId,
    unlocked: false,
    progress: { value: 0, target: 1 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

// Render helper: wraps create() in act() and returns the tree plus a spy.
function renderRow(
  flame: FlameStyle,
  s: AchievementState,
  props: { active?: boolean; justUnlocked?: boolean } = {},
) {
  const onPress = jest.fn();
  let tree!: ReactTestRenderer.ReactTestRenderer;
  act(() => {
    tree = ReactTestRenderer.create(
      <FlameRow
        flame={flame}
        state={s}
        active={props.active ?? false}
        justUnlocked={props.justUnlocked}
        onPress={onPress}
      />,
    );
  });
  return { tree, onPress };
}

// Find the single radio Pressable (the row root with accessibilityRole="radio").
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(
    n => n.props.accessibilityRole === 'radio' && typeof n.props.onPress === 'function',
  );
}

function rejectCueCount(tree: ReactTestRenderer.ReactTestRenderer, id: string): number {
  return tree.root.findAllByProps({ testID: `flame-reject-${id}` }).length;
}

// ---- FlameRow component ----

describe('FlameRow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('base flame renders its name and the "Unlocked" status', () => {
    const { tree } = renderRow(baseFlame, state({ unlocked: true }));
    const text = JSON.stringify(tree.toJSON());
    expect(text).toContain('Amber');
    expect(text).toContain('Unlocked');
  });

  test('unlocked time flame renders the days-left countdown', () => {
    const { tree } = renderRow(timeFlame, state({ unlocked: true, daysLeft: 5 }));
    expect(JSON.stringify(tree.toJSON())).toContain('Unlocked · 5d left');
  });

  test('unlocked time flame clamps a negative countdown to 0d left', () => {
    const { tree } = renderRow(timeFlame, state({ unlocked: true, daysLeft: -4 }));
    expect(JSON.stringify(tree.toJSON())).toContain('Unlocked · 0d left');
  });

  test('locked streak flame renders the requirement and value/target counter', () => {
    const { tree } = renderRow(
      streakFlame,
      state({ progress: { value: 4, target: 7 } }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Keep a 7-day run · 4/7');
  });

  test('locked streak counter caps the displayed value at the target', () => {
    const { tree } = renderRow(
      streakFlame,
      state({ progress: { value: 9, target: 7 } }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Keep a 7-day run · 7/7');
  });

  test('zero target renders without dividing by zero', () => {
    const { tree } = renderRow(
      streakFlame,
      state({ progress: { value: 0, target: 0 } }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Keep a 7-day run · 0/0');
  });

  test('expired time flame renders the re-earn prompt', () => {
    const { tree } = renderRow(
      timeFlame,
      state({ expired: true, progress: { value: 3, target: 3 } }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain(
      'Expired — re-earn: Log 3 days in a row',
    );
  });

  test('locked time flame (not expired) renders requirement and counter', () => {
    const { tree } = renderRow(
      timeFlame,
      state({ progress: { value: 1, target: 3 } }),
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Log 3 days in a row · 1/3');
  });

  test('justUnlocked prefixes the status with "Just unlocked!"', () => {
    const { tree } = renderRow(
      timeFlame,
      state({ unlocked: true, daysLeft: 3 }),
      { justUnlocked: true },
    );
    expect(JSON.stringify(tree.toJSON())).toContain('Just unlocked! Unlocked · 3d left');
  });

  test('active flag is reflected in accessibilityState.selected', () => {
    const { tree } = renderRow(baseFlame, state({ unlocked: true }), { active: true });
    expect(radio(tree).props.accessibilityState.selected).toBe(true);
    expect(radio(tree).props.accessibilityLabel).toContain('Active');
  });

  test('inactive flag yields selected=false and no Active label', () => {
    const { tree } = renderRow(baseFlame, state({ unlocked: true }), { active: false });
    expect(radio(tree).props.accessibilityState.selected).toBe(false);
    expect(radio(tree).props.accessibilityLabel).not.toContain('Active');
  });

  test('locked row is announced as disabled with a "Locked — " label', () => {
    const { tree } = renderRow(streakFlame, state());
    const r = radio(tree);
    expect(r.props.accessibilityState.disabled).toBe(true);
    expect(r.props.accessibilityLabel).toContain('Locked — ');
  });

  test('pressing an unlocked row calls onPress with the flame id', () => {
    const { tree, onPress } = renderRow(baseFlame, state({ unlocked: true }));
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith('amber');
  });

  test('pressing a locked row does not call onPress and shows the rejection cue', () => {
    const { tree, onPress } = renderRow(streakFlame, state());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(onPress).not.toHaveBeenCalled();
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);
  });

  test('rejection cue clears after ~250ms using fake timers', () => {
    const { tree } = renderRow(streakFlame, state());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(REJECT_WINDOW_MS - 1);
    });
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(rejectCueCount(tree, 'sodium')).toBe(0);
  });

  test('repeated locked taps restart the rejection timer rather than stacking', () => {
    const { tree, onPress } = renderRow(streakFlame, state());
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_WINDOW_MS - 50);
    });
    act(() => {
      radio(tree).props.onPress();
    });
    act(() => {
      jest.advanceTimersByTime(REJECT_WINDOW_MS - 50);
    });
    // Still visible: the second tap pushed the clear-time forward.
    expect(rejectCueCount(tree, 'sodium')).toBeGreaterThan(0);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(rejectCueCount(tree, 'sodium')).toBe(0);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('unmounting clears a pending rejection timer without errors', () => {
    const { tree } = renderRow(streakFlame, state());
    act(() => {
      radio(tree).props.onPress();
    });
    expect(() => {
      act(() => {
        tree.unmount();
      });
      jest.runOnlyPendingTimers();
    }).not.toThrow();
  });
});

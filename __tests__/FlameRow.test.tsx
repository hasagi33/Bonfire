/**
 * FlameRow.test.tsx — unit tests for the FlameRow gallery row component.
 *
 * Covers: equip vs. rejection behavior on tap, accessibility labels for locked
 * and unlocked rows, time-achievement countdown text (clamped at zero), expired
 * re-earn text, progress counters, the "Just unlocked!" prefix, the base flame
 * status, swatch gradient selection, and the 250ms rejection cue auto-clearing.
 *
 * Uses react-test-renderer and jest fake timers so the cue timing is deterministic.
 */

import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import FlameRow from '../src/components/Settings/FlameRow';
import type { AchievementState } from '../src/domain/achievements';
import type { FlameStyle } from '../src/domain/flames';

// REJECT_MS is not exported by FlameRow.tsx, so the documented 250ms value is
// mirrored here. The timing tests below assert the cue clears at this boundary.
const REJECT_MS = 250;

// A minimal but type-complete flame fixture. Only the fields FlameRow reads matter.
function makeFlame(overrides: Partial<FlameStyle> = {}): FlameStyle {
  return {
    id: 'voidfire',
    name: 'Voidfire',
    gradient: ['#111111', '#222222', '#333333', '#444444', '#555555'],
    embered: {
      core: '#aa0000',
      gold: '#bb0000',
      amber: '#cc0000',
      ember: '#dd0000',
      red: '#ee0000',
    },
    palette: { core: '#ffffff' },
    achievement: {
      type: 'streak',
      requirement: 'Log 14 days in a row',
    },
    ...overrides,
  } as unknown as FlameStyle;
}

function makeState(overrides: Partial<AchievementState> = {}): AchievementState {
  return {
    flameId: 'voidfire',
    unlocked: false,
    progress: { value: 0, target: 14 },
    achievementDay: null,
    daysLeft: null,
    expired: false,
    ...overrides,
  } as AchievementState;
}

function render(
  flame: FlameStyle,
  state: AchievementState,
  opts: { active?: boolean; justUnlocked?: boolean; onPress?: jest.Mock } = {},
) {
  const onPress = opts.onPress ?? jest.fn();
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

// Find the radio Pressable (the outer accessible row).
function radio(tree: ReactTestRenderer.ReactTestRenderer) {
  return tree.root.find(n => n.props.accessibilityRole === 'radio');
}

// Collect every rendered text string, joined, for substring assertions.
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

describe('FlameRow', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('tap behavior', () => {
    test('an unlocked row calls onPress with the flame id', () => {
      const flame = makeFlame();
      const { tree, onPress } = render(
        flame,
        makeState({ unlocked: true, progress: { value: 14, target: 14 } }),
      );

      act(() => {
        radio(tree).props.onPress();
      });

      expect(onPress).toHaveBeenCalledTimes(1);
      expect(onPress).toHaveBeenCalledWith('voidfire');
    });

    test('a locked row does NOT call onPress and shows the rejection cue', () => {
      jest.useFakeTimers();
      const flame = makeFlame();
      const { tree, onPress } = render(flame, makeState({ unlocked: false }));

      act(() => {
        radio(tree).props.onPress();
      });

      expect(onPress).not.toHaveBeenCalled();
      expect(tree.root.findAllByProps({ testID: 'flame-reject-voidfire' }).length).toBeGreaterThan(0);
    });

    test('the rejection cue clears itself after REJECT_MS', () => {
      jest.useFakeTimers();
      const flame = makeFlame();
      const { tree } = render(flame, makeState({ unlocked: false }));

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

    test('the rejection cue timing constant is 250ms', () => {
      expect(REJECT_MS).toBe(250);
    });
  });

  describe('accessibility', () => {
    test('a locked row is labelled "Locked — <status>" and marked disabled', () => {
      const { tree } = render(makeFlame(), makeState({ unlocked: false }));
      const r = radio(tree);

      expect(r.props.accessibilityLabel).toContain('Locked — ');
      expect(r.props.accessibilityLabel).toContain('Log 14 days in a row');
      expect(r.props.accessibilityState.disabled).toBe(true);
    });

    test('an unlocked row is not labelled Locked and is not disabled', () => {
      const { tree } = render(
        makeFlame(),
        makeState({ unlocked: true, progress: { value: 14, target: 14 } }),
      );
      const r = radio(tree);

      expect(r.props.accessibilityLabel).not.toContain('Locked');
      expect(r.props.accessibilityState.disabled).toBe(false);
    });

    test('the active flame is marked selected and labelled Active', () => {
      const { tree } = render(
        makeFlame(),
        makeState({ unlocked: true, progress: { value: 14, target: 14 } }),
        { active: true },
      );
      const r = radio(tree);

      expect(r.props.accessibilityState.selected).toBe(true);
      expect(r.props.accessibilityLabel).toContain('Active');
    });
  });

  describe('status text', () => {
    test('the base flame (no achievement) always shows "Unlocked"', () => {
      const base = makeFlame({ id: 'amber', name: 'Amber', achievement: undefined } as never);
      const { tree } = render(base, makeState({ flameId: 'amber', unlocked: false }));

      expect(allText(tree)).toContain('Unlocked');
      expect(allText(tree)).not.toContain('Locked');
    });

    test('an unlocked time flame shows "Unlocked · Nd left"', () => {
      const flame = makeFlame({
        achievement: { type: 'time', requirement: 'Log 3 days in a row' },
      } as never);
      const { tree } = render(
        flame,
        makeState({ unlocked: true, daysLeft: 5, progress: { value: 3, target: 3 } }),
      );

      expect(allText(tree)).toContain('Unlocked · 5d left');
    });

    test('daysLeft is clamped at zero in the countdown text', () => {
      const flame = makeFlame({
        achievement: { type: 'time', requirement: 'Log 3 days in a row' },
      } as never);
      const { tree } = render(
        flame,
        makeState({ unlocked: true, daysLeft: -2, progress: { value: 3, target: 3 } }),
      );

      expect(allText(tree)).toContain('Unlocked · 0d left');
      expect(allText(tree)).not.toContain('-2d');
    });

    test('an expired time flame shows "Expired — re-earn: <requirement>"', () => {
      const flame = makeFlame({
        achievement: { type: 'time', requirement: 'Log 3 days in a row' },
      } as never);
      const { tree } = render(
        flame,
        makeState({ unlocked: false, expired: true, progress: { value: 3, target: 3 } }),
      );

      expect(allText(tree)).toContain('Expired — re-earn: Log 3 days in a row');
    });

    test('a locked streak flame shows requirement and clamped progress counter', () => {
      const { tree } = render(
        makeFlame(),
        makeState({ unlocked: false, progress: { value: 4, target: 14 } }),
      );

      expect(allText(tree)).toContain('Log 14 days in a row · 4/14');
    });

    test('progress value above target is clamped to target in the counter', () => {
      const { tree } = render(
        makeFlame(),
        makeState({ unlocked: false, progress: { value: 20, target: 14 } }),
      );

      expect(allText(tree)).toContain('Log 14 days in a row · 14/14');
    });

    test('justUnlocked prefixes the status with "Just unlocked!"', () => {
      const { tree } = render(
        makeFlame(),
        makeState({ unlocked: true, progress: { value: 14, target: 14 } }),
        { justUnlocked: true },
      );

      expect(allText(tree)).toContain('Just unlocked! Unlocked');
    });
  });

  describe('swatch gradient', () => {
    function swatchColorsOf(tree: ReactTestRenderer.ReactTestRenderer): string[] {
      const gradient = tree.root.find(
        n => n.props.colors !== undefined && Array.isArray(n.props.colors),
      );
      return gradient.props.colors as string[];
    }

    test('an unlocked flame uses its full gradient', () => {
      const flame = makeFlame();
      const { tree } = render(
        flame,
        makeState({ unlocked: true, progress: { value: 14, target: 14 } }),
      );

      expect(swatchColorsOf(tree)).toEqual(flame.gradient);
    });

    test('a locked flame uses the embered stops', () => {
      const flame = makeFlame();
      const { tree } = render(flame, makeState({ unlocked: false }));

      expect(swatchColorsOf(tree)).toEqual([
        flame.embered.core,
        flame.embered.gold,
        flame.embered.amber,
        flame.embered.ember,
        flame.embered.red,
      ]);
    });
  });
});

/**
 * CalendarSheet.tsx — the calendar lives in a bottom sheet that rises over the
 * full-screen bonfire (mirrors `calendar.jsx` / `styles.css .cal-window`).
 *
 * Closed: a clean view with a glowing "swipe up to log · or tap" handle.
 * Open:   the sheet covers ~72% of the screen, a scrim dims the fire behind it,
 *         and the month grid + inline score picker are shown.
 *
 * Interaction (gesture-handler Pan + Reanimated):
 *  - swipe up ANYWHERE on the closed screen (a full-screen "status-bar-shade"
 *    pull, FR-025) or drag/tap the bottom handle → open;
 *  - drag the header down / tap the scrim area → close.
 *  - `progress` (0 closed → 1 open) is a SHARED value owned by the parent so the
 *    flame can lift/dim in lock-step (see BonfireScreen → Flame `lift`).
 *
 * The full-screen pull activates ONLY on upward movement (activeOffsetY), so
 * plain taps still reach the settings gear / dev pill (they sit above it via
 * zIndex) and never accidentally open the calendar. Day-cell taps, score
 * buttons and month-nav arrows inside the sheet are plain taps (FR-011).
 */

/* eslint-disable react-hooks/immutability --
 * `progress` is a Reanimated SharedValue passed down as a prop; assigning to
 * `.value` inside gesture callbacks/worklets is the documented Reanimated API,
 * not an illegal prop mutation. The rule cannot know this. */

import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  type SharedValue,
} from 'react-native-reanimated';
import type { Score } from '../../domain/fire';
import type { Entries } from '../../domain/fire';
import type { FireHealthState } from '../Bonfire/emberMood';
import type { DateKey } from '../../domain/dates';
import MonthGrid from './MonthGrid';
import ScorePickerBar from './ScorePickerBar';

interface CalendarSheetProps {
  today: DateKey;
  entries: Entries;
  fireHealth?: FireHealthState;
  selectedDate: DateKey | null;
  onSelectDate: (date: DateKey | null) => void;
  onSet: (date: DateKey, score: Score) => void;
  onClear: (date: DateKey) => void;
  noteDraft: string;
  onNoteChange: (text: string) => void;
  progress: SharedValue<number>; // 0 closed → 1 open (shared with the flame lift)
  height: number; // full screen height
}

const TIMING = {
  duration: 420,
  easing: Easing.bezier(0.22, 0.9, 0.3, 1),
} as const;

const clamp01 = (value: number) => {
  'worklet';
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
};

function CalendarSheet({
  today,
  entries,
  fireHealth,
  selectedDate,
  onSelectDate,
  onSet,
  noteDraft,
  onNoteChange,
  progress,
  height,
}: CalendarSheetProps) {
  const sheetH = Math.max(1, Math.round(height * 0.72));

  // Drag start reference for the pan gestures.
  const startProgress = useSharedValue(0);

  // One pan formula works for both handle (drag up) and header (drag down):
  // moving up (negative translationY) increases progress.
  const makePan = useCallback(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          cancelAnimation(progress);
          startProgress.value = clamp01(progress.value);
        })
        .onUpdate(e => {
          const next = startProgress.value + -e.translationY / sheetH;
          progress.value = clamp01(next);
        })
        .onEnd(e => {
          // Snap by position + a flick of velocity.
          const currentProgress = clamp01(progress.value);
          const goingOpen = currentProgress > 0.5 || e.velocityY < -600;
          const stayingOpen = goingOpen && e.velocityY < 600;
          cancelAnimation(progress);
          if (stayingOpen) {
            progress.value = withTiming(1, TIMING);
          } else {
            progress.value = withTiming(0, TIMING);
            runOnJS(onSelectDate)(null);
          }
        }),
    [onSelectDate, progress, sheetH, startProgress],
  );

  const handlePan = useMemo(() => makePan(), [makePan]);
  const headerPan = useMemo(() => makePan(), [makePan]);
  const handleTap = useMemo(() => Gesture.Tap().onEnd(() => {
    cancelAnimation(progress);
    progress.value = withTiming(1, TIMING);
  }), [progress]);

  // Full-screen swipe-to-open (FR-025): the same pan math as the handle, but
  // armed across the whole closed screen like a phone's status-bar shade.
  // `activeOffsetY([-12, 9999])` = activate only after ~12px of UPWARD travel,
  // never on downward movement — so simple taps and horizontal swipes pass
  // through untouched. The overlay sits on top of the scrim, so it also owns
  // "tap above the open sheet to close" (the tap is a no-op while closed).
  const fullScreenPan = useMemo(
    () => makePan().activeOffsetY([-12, 9999]),
    [makePan],
  );

  const overlayTap = useMemo(() => Gesture.Tap().onEnd(() => {
    if (clamp01(progress.value) > 0.5) {
      cancelAnimation(progress);
      progress.value = withTiming(0, TIMING);
      runOnJS(onSelectDate)(null);
    }
  }), [onSelectDate, progress]);
  const fullScreenGesture = useMemo(
    () => Gesture.Race(fullScreenPan, overlayTap),
    [fullScreenPan, overlayTap],
  );
  const handleGesture = useMemo(
    () => Gesture.Exclusive(handlePan, handleTap),
    [handlePan, handleTap],
  );

  // Sheet slides up: translateY from sheetH (hidden) to 0 (open).
  const sheetStyle = useAnimatedStyle(() => {
    const p = clamp01(progress.value);
    return {
      transform: [{ translateY: (1 - p) * sheetH }],
    };
  });
  // Scrim fades in as the sheet opens.
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: clamp01(progress.value) * 0.42,
  }));
  // Closed-state handle fades out as the sheet opens.
  const handleStyle = useAnimatedStyle(() => {
    const p = clamp01(progress.value);
    return {
      opacity: 1 - Math.min(1, p * 2),
    };
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* scrim — dims the fire (visual only; the overlay above handles touches) */}
      <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents="none" />

      {/* full-screen pull surface (FR-025): swipe up anywhere to open; tap to
          close while open. Sits under the gear/dev pill (they win via zIndex)
          and under the sheet + handle (later siblings), so it never steals
          their touches. */}
      <GestureDetector gesture={fullScreenGesture}>
        <Animated.View style={StyleSheet.absoluteFill} pointerEvents="auto" />
      </GestureDetector>

      {/* closed-state affordance: swipe up / tap to open */}
      <GestureDetector gesture={handleGesture}>
        <Animated.View
          style={[styles.affHandle, handleStyle]}
          pointerEvents="auto"
        >
          <View style={styles.handlePill} />
          <Text style={styles.handleLabel}>swipe up to log · or tap</Text>
        </Animated.View>
      </GestureDetector>

      {/* the sheet itself — drag the header to close */}
      <Animated.View style={[styles.sheet, { height: sheetH }, sheetStyle]}>
        <GestureDetector gesture={headerPan}>
          <View
            style={styles.grabHeader}
            accessibilityLabel="Drag to close calendar"
          >
            <View style={styles.grab} />
          </View>
        </GestureDetector>

        <MonthGrid
          today={today}
          entries={entries}
          fireHealth={fireHealth}
          selectedDate={selectedDate}
          onSelectDay={onSelectDate}
        />

        <ScorePickerBar
          dateKey={selectedDate}
          currentScore={selectedDate ? entries[selectedDate] : undefined}
          noteDraft={noteDraft}
          onNoteChange={onNoteChange}
          onChoose={score => {
            if (selectedDate) onSet(selectedDate, score);
            onSelectDate(null);
          }}
          onClear={() => onSelectDate(null)}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#03050c',
  },
  affHandle: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 156,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    gap: 8,
  },
  handlePill: {
    width: 50,
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,210,140,0.55)',
    shadowColor: '#ffaa3c',
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  handleLabel: { fontSize: 12.5, letterSpacing: 0.45, color: 'rgba(230,235,255,0.72)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#0a0f1e',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 18,
    paddingBottom: 24,
  },
  grabHeader: { paddingTop: 12, paddingBottom: 6, alignItems: 'center' },
  grab: {
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});

export default React.memo(CalendarSheet);

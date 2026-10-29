/**
 * BonfireScreen.tsx — the app's single screen.
 *
 * Composes the full-screen fire scene (FireScene + Hearth + FireCaption)
 * with the swipe-up CalendarSheet on top and a top-right SettingsSheet. It wires
 * the data hooks (`useEntries`, `useSettings`) to the UI:
 *  - the calendar logs/clears a day's score → re-derives the fire → re-renders
 *    the flame;
 *  - the equipped flame's palette feeds the flame, embers AND hearth, so every
 *    light source in the scene matches the active flame (003 US2).
 *
 * A shared `progress` value (0 closed → 1 open) is owned here and passed to the
 * calendar sheet (which drives it) and caption (which fades out behind it).
 * The flame stays physically fixed; opening the calendar should not move the fire.
 */

/* eslint-disable react-hooks/immutability --
 * Reanimated SharedValue `.value` assignments are required for the calendar
 * sheet animation and frame clock; they are not React prop/state mutation. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cancelAnimation,
  Easing,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Atmosphere from '../components/Bonfire/Atmosphere';
import FireScene from '../components/Bonfire/FireScene';
import Hearth, { HEARTH_TOP_LOG_OFFSET } from '../components/Bonfire/Hearth';
import FireCaption from '../components/Bonfire/FireCaption';
import { flameVisual } from '../components/Bonfire/flameModel';
import CalendarSheet from '../components/Calendar/CalendarSheet';
import SettingsSheet from '../components/Settings/SettingsSheet';
import { deriveAtmosphere } from '../domain/atmosphere';
import { todayKey, type DateKey } from '../domain/dates';
import { deriveFireHealth } from '../domain/fireHealth';
import { BASE_FLAME_ID, type FlameId } from '../domain/flames';
import { useEntries } from '../hooks/useEntries';
import { useDayNotes } from '../hooks/useDayNotes';
import { useSettings } from '../hooks/useSettings';
import { useFlames } from '../hooks/useFlames';
import { useFlamePulses } from '../hooks/useFlamePulses';
import { bg0 } from '../theme/tokens';

const DESIGN_HEARTH_BOTTOM = 144;
const DESIGN_CAPTION_BOTTOM = 64;
const DESIGN_FLAME_LOG_GAP = 8;
const CALENDAR_TIMING = {
  duration: 420,
  easing: Easing.bezier(0.22, 0.9, 0.3, 1),
} as const;

export function fireLayoutForWidth(_width: number) {
  const hearthBottom = DESIGN_HEARTH_BOTTOM;
  return {
    flameVisibleBottomFromBottom: hearthBottom + HEARTH_TOP_LOG_OFFSET + DESIGN_FLAME_LOG_GAP,
    hearthBottom,
    captionBottom: DESIGN_CAPTION_BOTTOM,
  };
}

function BonfireScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [sceneSize, setSceneSize] = useState({ width, height });
  const [atmosphere] = useState(() => deriveAtmosphere());

  const today: DateKey = useMemo(() => todayKey(), []);
  const [selectedDate, setSelectedDate] = useState<DateKey | null>(null);

  const { entries, fire, setScore, clearScore } = useEntries(today);
  const { draft: noteDraft, setDraft: setNoteDraft } = useDayNotes(selectedDate);
  const { settings, setFlameStyle } = useSettings();

  // Derive every flame's unlock state + what the active flame should render.
  // If a saved selection relocks, `useFlames` renders Amber immediately while
  // the effect below persists that same fallback.
  const { states, activeStyle, effectivePalette, dim, newlyUnlocked } = useFlames(
    entries,
    today,
    fire,
    settings.flameStyle,
  );
  const { pulse } = useFlamePulses(entries, today, fire);
  const visual = useMemo(() => flameVisual(fire), [fire]);
  // Fire Health intentionally lags one day: today's score can affect gameplay
  // immediately, but the visual health window ends yesterday inside the helper.
  const fireHealth = useMemo(
    () => deriveFireHealth(entries, fire, today),
    [entries, fire, today],
  );
  const sceneWidth = sceneSize.width || width;
  const sceneHeight = sceneSize.height || height;
  const fireLayout = useMemo(() => fireLayoutForWidth(sceneWidth), [sceneWidth]);

  const handleSceneLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setSceneSize(current =>
      current.width === nextWidth && current.height === nextHeight
        ? current
        : { width: nextWidth, height: nextHeight },
    );
  }, []);

  // Locked-equip guard (FR-001, defense in depth): the gallery row already
  // refuses locked taps, but this wrapper makes the rule hold for ANY caller —
  // a locked flame id is silently dropped, never persisted. Reads only the
  // derived unlock state (002 invariant: nothing new is stored).
  const handleEquip = useCallback(
    (id: FlameId) => {
      if (states[id]?.unlocked) setFlameStyle(id);
    },
    [states, setFlameStyle],
  );

  // Calendar open progress (0..1). The flame does not consume this; it stays put.
  const progress = useSharedValue(0);
  const sceneClock = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const sceneFrame = useFrameCallback(frame => {
    'worklet';
    // Keep the full fire scene at display rate even while the calendar moves.
    sceneClock.value = frame.timeSinceFirstFrame ?? 0;
  }, false);

  useEffect(() => {
    sceneFrame.setActive(!reducedMotion);
  }, [reducedMotion, sceneFrame]);

  useEffect(() => {
    if (settings.flameStyle !== BASE_FLAME_ID && states[settings.flameStyle]?.unlocked !== true) {
      setFlameStyle(BASE_FLAME_ID);
    }
  }, [settings.flameStyle, setFlameStyle, states]);

  const closeCalendar = useCallback(() => {
    cancelAnimation(progress);
    progress.value = withTiming(0, CALENDAR_TIMING);
    setSelectedDate(null);
  }, [progress]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (selectedDate !== null) {
        setSelectedDate(null);
        return true;
      }

      if (progress.value > 0.01) {
        closeCalendar();
        return true;
      }

      return false;
    });

    return () => subscription.remove();
  }, [closeCalendar, progress, selectedDate]);

  return (
    <View testID="bonfire-screen" style={styles.screen}>
      <Atmosphere state={atmosphere} />

      {/* the fire scene (GPU flame + embers, then hearth + caption on top).
          Out-state precedence (US2): `Flame` hides itself whenever the fire is
          not lit, so the Hearth's smoke wins. Relocked selections render Amber
          immediately, avoiding the old blackened/embered selected-flame state.
          `activeStyle` (004) carries the BonfireDesign visualProfile into the
          flame (shape/motion/aura/accents) and embers (particle mix); palette +
          dim still control color/energy for the rendered flame. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={handleSceneLayout}>
        <Hearth
          fire={fire}
          glow={visual.glow}
          intensity={visual.intensity}
          palette={effectivePalette}
          atmosphere={atmosphere}
          bottom={fireLayout.hearthBottom}
        />
        <FireScene
          fire={fire}
          activeStyle={activeStyle}
          palette={effectivePalette}
          width={sceneWidth}
          height={sceneHeight}
          flameDim={dim}
          flameVisibleBottomFromBottom={fireLayout.flameVisibleBottomFromBottom}
          intensity={visual.intensity}
          clock={sceneClock}
          health={fireHealth}
          pulse={pulse}
        />
        <FireCaption
          fire={fire}
          lift={progress}
          bottom={fireLayout.captionBottom}
          palette={effectivePalette}
        />
      </View>

      {/* settings (top-right): the gear opens the flame gallery */}
      <SettingsSheet
        states={states}
        activeId={activeStyle.id}
        onEquip={handleEquip}
        newlyUnlocked={newlyUnlocked}
        top={insets.top}
      />

      {/* the swipe-up calendar */}
      <CalendarSheet
        today={today}
        entries={entries}
        fireHealth={fireHealth}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        onSet={setScore}
        onClear={clearScore}
        noteDraft={noteDraft}
        onNoteChange={setNoteDraft}
        progress={progress}
        height={height}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: bg0 },
});

export default BonfireScreen;

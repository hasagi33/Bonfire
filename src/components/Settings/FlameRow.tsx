/**
 * FlameRow.tsx — one row in the flame gallery.
 *
 * Shows a gradient swatch (full colors when unlocked, the dim "embered" colors
 * when locked), the flame's name, and a status line that depends on the derived
 * `AchievementState`:
 *  - unlocked streak/base → "Unlocked"
 *  - unlocked time        → "Unlocked · Nd left" (the window countdown)
 *  - locked streak/time   → the requirement + a progress bar (value / target)
 *  - locked time, expired → "Expired — re-earn: <requirement>"
 *
 * Tapping an UNLOCKED row equips the flame. Tapping a LOCKED row never equips
 * (FR-001). Accessibility: each row is a radio whose selected state marks the
 * active flame; locked rows are additionally announced as disabled with a
 * "Locked — <requirement>" label.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { AchievementState } from '../../domain/achievements';
import type { FlameId, FlameStyle } from '../../domain/flames';
import { bg2, core, ink, inkDim, inkFaint, line } from '../../theme/tokens';

interface FlameRowProps {
  flame: FlameStyle;
  state: AchievementState;
  active: boolean;
  justUnlocked?: boolean; // one-shot celebration when the flame flips to unlocked (FR-023)
  onPress: (id: FlameId) => void;
}

// The swatch colors: full gradient when unlocked, embered stops when locked.
function swatchColors(flame: FlameStyle, unlocked: boolean): string[] {
  if (unlocked) return flame.gradient;
  const e = flame.embered;
  return [e.core, e.gold, e.amber, e.ember, e.red];
}

// The status line + an optional 0..1 progress fraction for the bar.
function statusFor(
  flame: FlameStyle,
  state: AchievementState,
): { text: string; progress: number | null } {
  const ach = flame.achievement;
  // Base flame (or anything with no achievement): always just "Unlocked".
  if (!ach) return { text: 'Unlocked', progress: null };

  if (state.unlocked) {
    if (ach.type === 'time' && state.daysLeft !== null) {
      return { text: `Unlocked · ${Math.max(0, state.daysLeft)}d left`, progress: null };
    }
    return { text: 'Unlocked', progress: null };
  }

  // Locked: show how to earn it (and how close).
  const frac =
    state.progress.target > 0
      ? Math.min(1, state.progress.value / state.progress.target)
      : 0;
  if (ach.type === 'time' && state.expired) {
    return { text: `Expired — re-earn: ${ach.requirement}`, progress: frac };
  }
  const counter = `${Math.min(state.progress.value, state.progress.target)}/${state.progress.target}`;
  return { text: `${ach.requirement} · ${counter}`, progress: frac };
}

function FlameRow({ flame, state, active, justUnlocked = false, onPress }: FlameRowProps) {
  const unlocked = state.unlocked;
  const { text, progress } = statusFor(flame, state);
  const colors = swatchColors(flame, unlocked);
  // A freshly earned flame gets a brief celebratory label + glow tint so the
  // user notices the unlock without a popup (FR-023, in-app only).
  const status = justUnlocked ? `Just unlocked! ${text}` : text;
  // Locked rows announce their state up front.
  const a11yStatus = unlocked ? status : `Locked — ${status}`;

  const handlePress = () => {
    if (unlocked) onPress(flame.id);
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active, disabled: !unlocked }}
      accessibilityLabel={`${flame.name}. ${a11yStatus}${active ? '. Active' : ''}`}
      style={({ pressed }) => [
        styles.row,
        justUnlocked && styles.rowJustUnlocked,
        pressed && styles.rowPressed,
      ]}>
      <View style={styles.inner}>
        {/* gradient swatch — at least 2 stops are required by LinearGradient */}
        <LinearGradient
          colors={colors.length >= 2 ? (colors as [string, string, ...string[]]) : [colors[0], colors[0]]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[styles.swatch, { borderColor: unlocked ? flame.palette.core : line }]}
        />

        <View style={styles.body}>
          <Text style={[styles.name, !unlocked && styles.nameLocked]}>{flame.name}</Text>
          <Text style={styles.status} numberOfLines={2}>
            {status}
          </Text>
          {progress !== null && (
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
          )}
        </View>

        {active && <Text style={styles.check}>✓</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.05)' },
  rowJustUnlocked: { backgroundColor: 'rgba(255,174,59,0.10)' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
  },
  swatch: {
    width: 34,
    height: 44,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  body: { flex: 1, gap: 3 },
  name: { color: ink, fontSize: 15, fontWeight: '700' },
  nameLocked: { color: inkDim },
  status: { color: inkFaint, fontSize: 11.5, lineHeight: 15 },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: bg2,
    overflow: 'hidden',
    marginTop: 2,
  },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#ffae3b' },
  check: { color: core, fontSize: 18, fontWeight: '700' },
});

export default React.memo(FlameRow);

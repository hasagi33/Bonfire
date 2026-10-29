/**
 * DayCell.tsx — one square in the month grid.
 *
 * Mirrors `styles.css .cell` and its variants:
 *  - blank  : padding cell outside the month (invisible).
 *  - future / missed : dimmed (future days are not tappable).
 *  - today  : unscored today — amber ring.
 *  - scored : a 1–5 day — warm heat fill, dark number, and a row of "pip" dots.
 * A scored day that is also today additionally gets the bright ring.
 *
 * Layout: the Pressable is a fixed 1/7-of-the-row wrapper (so 7 fill a week);
 * the inner View is the visible rounded square. Wrapped in `React.memo` so the
 * grid only re-renders the cells that change (~42 cells — Principle V).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { DayKind, Score } from '../../domain/fire';
import { amber, core, gold, inkDim, inkFaint, heatStyle } from '../../theme/tokens';

interface DayCellProps {
  dateKey: string | null; // null = blank padding cell
  dayNumber: number | null; // day-of-month to show
  kind: DayKind | null; // classification (null for blank)
  score?: Score; // present when kind === 'scored'
  isToday?: boolean; // overlay the "today" ring even on scored days
  selected?: boolean; // currently open in the picker
  onPress?: (dateKey: string) => void;
}

function DayCell({ dateKey, dayNumber, kind, score, isToday, selected, onPress }: DayCellProps) {
  if (dateKey === null || kind === null) {
    return <View style={styles.cell} />; // blank padding
  }

  const scored = kind === 'scored' && score !== undefined;
  const heat = scored ? heatStyle(score as Score) : undefined;
  const tappable = kind !== 'future';

  return (
    <Pressable
      style={styles.cell}
      disabled={!tappable}
      onPress={tappable ? () => onPress?.(dateKey) : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: !tappable, selected }}
      accessibilityLabel={accessibilityLabel(dateKey, kind, score)}>
      {({ pressed }) => (
        <View
          style={[
            styles.real,
            (kind === 'future' || kind === 'missed') && styles.future,
            isToday && styles.today,
            scored && { backgroundColor: heat!.background, borderWidth: 0 },
            // the white "1" day keeps a token-defined hairline so it doesn't
            // read as an empty cell (today/selected rings below still win)
            scored && heat!.border !== undefined && { borderWidth: 1.4, borderColor: heat!.border },
            scored && isToday && styles.scoredToday,
            selected && styles.selected,
            pressed && tappable && styles.pressed,
          ]}>
          <Text
            style={[
              styles.num,
              (kind === 'future' || kind === 'missed') && styles.numFuture,
              isToday && !scored && styles.numToday,
              scored && { color: heat!.color },
            ]}>
            {dayNumber}
          </Text>

          {/* heat pips under a scored day (one per point) */}
          {scored && (
            <View style={styles.pips}>
              {Array.from({ length: score as number }).map((_, i) => (
                <View key={i} style={styles.pip} />
              ))}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

function accessibilityLabel(dateKey: string, kind: DayKind, score?: Score): string {
  if (kind === 'scored') return `${dateKey}, scored ${score} out of 5`;
  if (kind === 'today') return `${dateKey}, today, not yet logged`;
  if (kind === 'missed') return `${dateKey}, missed`;
  return `${dateKey}, future`;
}

const COL = `${100 / 7}%` as const;

const styles = StyleSheet.create({
  // Outer wrapper: exactly 1/7 of the row so 7 cells fill a week.
  cell: {
    width: COL,
    aspectRatio: 1,
    padding: 3,
  },
  // The visible rounded square fills the wrapper (the 3px padding is the gutter).
  real: {
    flex: 1,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  future: { opacity: 0.4, backgroundColor: 'rgba(255,255,255,0.015)' },
  today: { borderColor: amber },
  scoredToday: { borderWidth: 2, borderColor: core },
  selected: { borderWidth: 2, borderColor: core },
  pressed: { transform: [{ scale: 0.9 }] },
  num: { fontSize: 13.5, fontWeight: '600', color: inkDim },
  numFuture: { color: inkFaint },
  numToday: { color: gold },
  pips: {
    position: 'absolute',
    bottom: 5,
    flexDirection: 'row',
    gap: 2,
    justifyContent: 'center',
  },
  pip: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(28,13,4,0.55)',
  },
});

export default React.memo(DayCell);

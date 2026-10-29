/**
 * MonthGrid.tsx — the month calendar: title + ‹ › nav, weekday row, day grid.
 *
 * Mirrors `calendar.jsx` (`cal-head`, `cal-dow`, `cal-grid`). It owns the
 * currently-viewed month and lets the user page backward and forward with the
 * ‹ › buttons. Future days stay non-tappable in the grid itself.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { classifyDay, type Entries, type Score } from '../../domain/fire';
import type { FireHealthState } from '../../domain/fireHealth';
import { monthGrid, parseYmd, type DateKey } from '../../domain/dates';
import { amber, ink, inkDim, inkFaint, line } from '../../theme/tokens';
import DayCell from './DayCell';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MonthGridProps {
  today: DateKey;
  entries: Entries;
  selectedDate: DateKey | null;
  onSelectDay: (dateKey: DateKey) => void;
  fireHealth?: FireHealthState;
}

function MonthGrid({ today, entries, selectedDate, onSelectDay, fireHealth }: MonthGridProps) {
  const todayDate = useMemo(() => parseYmd(today), [today]);
  const [view, setView] = useState(() => ({ y: todayDate.getFullYear(), m: todayDate.getMonth() }));

  function shift(delta: number) {
    setView(v => {
      let m = v.m + delta;
      let y = v.y;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { y, m };
    });
  }

  const cells = useMemo(() => monthGrid(view.y, view.m), [view.y, view.m]);

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.title}>
          {MONTHS[view.m]} <Text style={styles.year}>{view.y}</Text>
        </Text>
        <View style={styles.healthSlot} accessibilityRole="text">
          {fireHealth?.visible && (
            <Text style={styles.healthText} accessibilityLabel={`Fire Health ${fireHealth.label}`}>
              {fireHealth.label}
            </Text>
          )}
        </View>
        <View style={styles.nav}>
          <Pressable
            onPress={() => shift(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            style={({ pressed }) => [styles.navBtn, pressed && styles.navPressed]}>
            <Text style={styles.navText}>‹</Text>
          </Pressable>
          <Pressable
            onPress={() => shift(1)}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            style={({ pressed }) => [styles.navBtn, pressed && styles.navPressed]}>
            <Text style={styles.navText}>›</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.dow}>
        {DOW.map((d, i) => (
          <Text key={i} style={styles.dowText}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((key, i) => {
          if (key === null) {
            return <DayCell key={`b${i}`} dateKey={null} dayNumber={null} kind={null} />;
          }
          const kind = classifyDay(entries, key, today);
          const score = entries[key] as Score | undefined;
          const dayNumber = parseYmd(key).getDate();
          return (
            <DayCell
              key={key}
              dateKey={key}
              dayNumber={dayNumber}
              kind={kind}
              score={score}
              isToday={key === today}
              selected={selectedDate === key}
              onPress={onSelectDay}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { fontSize: 17, fontWeight: '700', color: ink, letterSpacing: 0.2 },
  year: { color: inkDim, fontWeight: '500' },
  healthSlot: { flex: 1, alignItems: 'center' },
  healthText: {
    color: amber,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  nav: { flexDirection: 'row', gap: 8 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPressed: { transform: [{ scale: 0.92 }], backgroundColor: 'rgba(255,255,255,0.08)' },
  navText: { color: ink, fontSize: 16, lineHeight: 18 },
  dow: { flexDirection: 'row', marginBottom: 6 },
  dowText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.6,
    color: inkFaint,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
});

export default React.memo(MonthGrid);

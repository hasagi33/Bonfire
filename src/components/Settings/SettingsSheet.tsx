/**
 * SettingsSheet.tsx — the top-right gear that opens the flame gallery.
 *
 * Tapping the gear opens `FlameGallery`, where the user browses the whole flame
 * catalog and equips any UNLOCKED flame (locked rows reject the tap — 003 US1).
 * The old three-color picker is gone; flame selection now lives in the
 * gallery, driven by the derived achievement `states`.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { AchievementState } from '../../domain/achievements';
import type { FlameId } from '../../domain/flames';
import FlameGallery from './FlameGallery';
import { ink, line } from '../../theme/tokens';

interface SettingsSheetProps {
  states: Record<FlameId, AchievementState>; // unlock state per flame (for the gallery)
  activeId: FlameId; // the currently equipped flame
  onEquip: (id: FlameId) => void; // equip a flame by id
  newlyUnlocked: FlameId[]; // flames that just flipped to unlocked (FR-023 feedback)
  top: number; // safe-area top inset, to place the gear below the status bar
}

function SettingsSheet({ states, activeId, onEquip, newlyUnlocked, top }: SettingsSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Settings: choose flame"
        style={({ pressed }) => [styles.gear, { top: top + 6 }, pressed && styles.gearPressed]}>
        <Text style={styles.gearIcon}>⚙</Text>
      </Pressable>

      <FlameGallery
        visible={open}
        onClose={() => setOpen(false)}
        states={states}
        activeId={activeId}
        onEquip={onEquip}
        newlyUnlocked={newlyUnlocked}
      />
    </>
  );
}

const styles = StyleSheet.create({
  gear: {
    position: 'absolute',
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: line,
    backgroundColor: 'rgba(10,14,26,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 58,
  },
  gearPressed: { transform: [{ scale: 0.92 }] },
  gearIcon: { fontSize: 20, color: ink },
});

export default React.memo(SettingsSheet);

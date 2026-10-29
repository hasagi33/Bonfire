/**
 * FlameGallery.tsx — the full flame catalog, opened from the settings gear.
 *
 * A lazy `Modal` (its list is only mounted while open, so it never renders behind
 * the live flame) containing a scrollable list of `FlameRow`s grouped by tier in
 * rarity order: Base → Streak → Time. Every flame is visible with its colors,
 * name, requirement, and live progress (full teasers — FR-016/017/018, SC-008).
 *
 * Tapping an UNLOCKED row equips that flame and closes the gallery. LOCKED rows
 * never equip (003 US1, FR-001): `FlameRow` ignores the tap and
 * the screen's `onEquip` guard would drop a locked id anyway.
 */

import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AchievementState } from '../../domain/achievements';
import { FLAMES, type FlameId, type FlameTier } from '../../domain/flames';
import FlameRow from './FlameRow';
import { inkDim, line } from '../../theme/tokens';

interface FlameGalleryProps {
  visible: boolean;
  onClose: () => void;
  states: Record<FlameId, AchievementState>;
  activeId: FlameId;
  onEquip: (id: FlameId) => void;
  newlyUnlocked?: FlameId[]; // rows to celebrate with a one-shot highlight (FR-023)
}

// Tier section headers, in display (rarity) order.
const SECTIONS: { tier: FlameTier; title: string; hint: string }[] = [
  { tier: 'base', title: 'Classic', hint: 'always lit' },
  { tier: 'streak', title: 'Streak flames', hint: 'burn while your run holds' },
  { tier: 'time', title: 'Time flames', hint: 'earned for a while, then fade' },
];

function FlameGallery({
  visible,
  onClose,
  states,
  activeId,
  onEquip,
  newlyUnlocked = [],
}: FlameGalleryProps) {
  // Equipping a flame applies it and dismisses the gallery.
  const equip = (id: FlameId) => {
    onEquip(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel} onPress={() => {}}>
          <View style={styles.grab} />
          <Text style={styles.title}>Flames</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollBody} removeClippedSubviews>
            {SECTIONS.map(section => {
              const flames = FLAMES.filter(f => f.tier === section.tier);
              if (flames.length === 0) return null;
              return (
                <View key={section.tier} style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    {section.title} <Text style={styles.sectionHint}>· {section.hint}</Text>
                  </Text>
                  {flames.map(flame => (
                    <FlameRow
                      key={flame.id}
                      flame={flame}
                      state={states[flame.id]}
                      active={flame.id === activeId}
                      justUnlocked={newlyUnlocked.includes(flame.id)}
                      onPress={equip}
                    />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(3,5,12,0.6)',
    justifyContent: 'flex-end',
  },
  panel: {
    maxHeight: '82%',
    backgroundColor: '#0a0f1e',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: line,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grab: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 8,
  },
  title: {
    color: inkDim,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  scroll: { flexGrow: 0 },
  scrollBody: { paddingBottom: 10 },
  section: { marginBottom: 6 },
  sectionTitle: {
    color: inkDim,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  sectionHint: { color: 'rgba(138,147,168,0.6)', fontWeight: '500' },
});

export default React.memo(FlameGallery);

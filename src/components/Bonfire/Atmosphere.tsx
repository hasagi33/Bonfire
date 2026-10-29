/**
 * Atmosphere.tsx - gradient-only background for the bonfire scene.
 *
 * Receives a derived atmospheric state and renders stable, non-interactive
 * gradient layers behind the fire. It intentionally avoids stars, clouds,
 * objects, timers, and animation loops.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { AtmosphericState } from '../../domain/atmosphere';
import { bg0, bg1 } from '../../theme/tokens';

interface AtmosphereProps {
  state: AtmosphericState;
}

type GradientStops = readonly [string, string, ...string[]];

interface AtmospherePalette {
  base: GradientStops;
  horizon: GradientStops;
  veil: string;
}

const PALETTES: Record<AtmosphericState['phase'], AtmospherePalette> = {
  morning: {
    base: ['#221522', '#5a2d34', bg1],
    horizon: ['rgba(255,154,92,0.38)', 'rgba(147,72,74,0.22)', 'transparent'],
    veil: 'rgba(255,129,58,0.055)',
  },
  day: {
    base: ['#48384f', '#80696f', '#2a2033'],
    horizon: ['rgba(255,229,190,0.42)', 'rgba(234,158,105,0.22)', 'transparent'],
    veil: 'rgba(255,232,202,0.075)',
  },
  dusk: {
    base: ['#1f1a2f', '#4b3a54', bg1],
    horizon: ['rgba(255,204,141,0.32)', 'rgba(210,118,82,0.15)', 'transparent'],
    veil: 'rgba(255,214,165,0.045)',
  },
  night: {
    base: ['#090711', '#1c1224', bg0],
    horizon: ['rgba(96,58,58,0.24)', 'rgba(47,28,38,0.18)', 'transparent'],
    veil: 'rgba(8,4,10,0.18)',
  },
};

function seasonalOverlay(state: AtmosphericState): string {
  if (state.seasonStrength < -0.25) return 'rgba(28,12,18,0.22)';
  if (state.seasonStrength > 0.25) return 'rgba(255,179,103,0.075)';
  return 'rgba(255,221,184,0.024)';
}

function brightnessOverlay(state: AtmosphericState): string {
  const alpha = Math.max(0, Math.min(0.1, state.brightness * 0.09));
  return `rgba(255,255,255,${alpha.toFixed(3)})`;
}

function Atmosphere({ state }: AtmosphereProps) {
  const palette = PALETTES[state.phase];

  return (
    <View
      testID="bonfire-atmosphere"
      nativeID={`bonfire-atmosphere-${state.mode}-${state.phase}`}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <LinearGradient
        testID="atmosphere-base-gradient"
        colors={palette.base}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        testID="atmosphere-horizon-gradient"
        colors={palette.horizon}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.horizon}
      />
      <View
        testID="atmosphere-seasonal-veil"
        style={[styles.fill, { backgroundColor: seasonalOverlay(state) }]}
      />
      <View style={[styles.fill, { backgroundColor: palette.veil }]} />
      <View
        testID="atmosphere-brightness-veil"
        style={[styles.fill, { backgroundColor: brightnessOverlay(state) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: StyleSheet.absoluteFillObject,
  horizon: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '56%',
  },
});

export default React.memo(Atmosphere);

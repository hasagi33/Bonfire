/**
 * FireScene.tsx — one Skia surface for flame + embers.
 *
 * Flame and Embers still expose standalone Canvas wrappers for compatibility,
 * but the main screen uses this combined surface to avoid compositing two
 * full-screen canvases over the same scene.
 */

import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { FireState } from '../../domain/fire';
import type { FireHealthState } from './emberMood';
import type { FlameStyle } from '../../domain/flames';
import type { FlamePulseState } from '../../domain/flamePulses';
import type { Palette } from '../../theme/palettes';
import { EmbersLayer } from './Embers';
import { FlameLayer } from './Flame';

interface FireSceneProps {
  fire: FireState;
  activeStyle?: FlameStyle;
  palette: Palette;
  width: number;
  height: number;
  intensity: number;
  clock: SharedValue<number>;
  flameDim?: number;
  flameVisibleBottomFromBottom?: number;
  health?: FireHealthState;
  pulse?: FlamePulseState;
}

function FireScene({
  fire,
  activeStyle,
  palette,
  width,
  height,
  intensity,
  clock,
  flameDim = 1,
  flameVisibleBottomFromBottom,
  health,
  pulse,
}: FireSceneProps) {
  return (
    <Canvas style={{ width, height }} pointerEvents="none">
      <FlameLayer
        fire={fire}
        activeStyle={activeStyle}
        palette={palette}
        width={width}
        height={height}
        dim={flameDim}
        visibleBottomFromBottom={flameVisibleBottomFromBottom}
        clock={clock}
        health={health}
        pulse={pulse}
      />
      <EmbersLayer
        width={width}
        height={height}
        intensity={intensity}
        palette={palette}
        activeStyle={activeStyle}
        clock={clock}
        pulse={pulse}
      />
    </Canvas>
  );
}

export default React.memo(FireScene);

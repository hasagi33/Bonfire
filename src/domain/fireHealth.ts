/**
 * fireHealth.ts — pure Fire Health derivation for the bonfire scene.
 *
 * Input is the existing score history plus current fire state. Output is a
 * bounded, visual-only health state for rendering. This module never writes to
 * storage and never feeds back into streak survival, strength, or unlock math.
 */

import { addDays, type DateKey } from './dates';
import { isScore, type Entries, type FireState, type Score } from './fire';

export const FIRE_HEALTH_WINDOW_SIZE = 7;
export const FIRE_HEALTH_MIN_SAMPLES = 3;

export type FireHealthName = 'faint' | 'steady' | 'bright' | 'radiant';
export type FireHealthLabel = 'Faint' | 'Steady' | 'Bright' | 'Radiant';

export interface FireHealthSample {
  date: DateKey;
  score: Score;
  weight: number;
  quality: number;
}

export interface FireHealthState {
  name: FireHealthName;
  label: FireHealthLabel;
  qualityIndex: number;
  visible: boolean;
  visualWeight: number;
  sampleCount: number;
}

export interface FireHealthVisualModifiers {
  glow: number;
  warmth: number;
  energy: number;
  density: number;
  captionTone: FireHealthName;
}

const HEALTH_LABELS: Record<FireHealthName, FireHealthLabel> = {
  faint: 'Faint',
  steady: 'Steady',
  bright: 'Bright',
  radiant: 'Radiant',
};

const VISUAL_WEIGHTS: Record<FireHealthName, number> = {
  faint: 0,
  steady: 0.38,
  bright: 0.7,
  radiant: 1,
};

const MODIFIERS: Record<FireHealthName, FireHealthVisualModifiers> = {
  faint: { glow: 0.72, warmth: 0.82, energy: 0.72, density: 0.8, captionTone: 'faint' },
  steady: { glow: 1, warmth: 1, energy: 1, density: 1, captionTone: 'steady' },
  bright: { glow: 1.18, warmth: 1.1, energy: 1.14, density: 1.08, captionTone: 'bright' },
  radiant: { glow: 1.38, warmth: 1.22, energy: 1.32, density: 1.16, captionTone: 'radiant' },
};

const DEFAULT_HEALTH: FireHealthState = {
  name: 'steady',
  label: 'Steady',
  qualityIndex: 0.5,
  visible: false,
  visualWeight: VISUAL_WEIGHTS.steady,
  sampleCount: 0,
};

function stateForQuality(qualityIndex: number): FireHealthName {
  if (qualityIndex < 0.34) return 'faint';
  if (qualityIndex < 0.52) return 'steady';
  return 'bright';
}

function toQuality(score: Score): number {
  return (score - 1) / 4;
}

function withVisibility(state: FireHealthState, fire: FireState): FireHealthState {
  return { ...state, visible: fire.state === 'lit' };
}

/**
 * Select the latest scored days, newest first, and attach descending weights.
 * Newer entries carry more influence while the window stays capped at 7 samples.
 */
export function fireHealthSamples(entries: Entries, today: DateKey): FireHealthSample[] {
  const maxDate = addDays(today, -1);
  return Object.keys(entries)
    .filter(date => isScore(entries[date]) && date <= maxDate)
    .sort()
    .slice(-FIRE_HEALTH_WINDOW_SIZE)
    .reverse()
    .map((date, index) => {
      const score = entries[date] as Score;
      return {
        date,
        score,
        weight: FIRE_HEALTH_WINDOW_SIZE - index,
        quality: toQuality(score),
      };
    });
}

/**
 * Derive one of Faint/Steady/Bright/Radiant from recent score quality.
 * Sparse histories default to Steady to avoid noisy early extremes.
 */
export function deriveFireHealth(
  entries: Entries,
  fire: FireState,
  today: DateKey,
): FireHealthState {
  const samples = fireHealthSamples(entries, today);
  if (samples.length < FIRE_HEALTH_MIN_SAMPLES) {
    return withVisibility({ ...DEFAULT_HEALTH, sampleCount: samples.length }, fire);
  }

  const totals = samples.reduce(
    (acc, sample) => ({
      weightedQuality: acc.weightedQuality + sample.quality * sample.weight,
      weight: acc.weight + sample.weight,
    }),
    { weightedQuality: 0, weight: 0 },
  );
  const qualityIndex = totals.weight === 0 ? DEFAULT_HEALTH.qualityIndex : totals.weightedQuality / totals.weight;
  const name = stateForQuality(qualityIndex);

  return withVisibility(
    {
      name,
      label: HEALTH_LABELS[name],
      qualityIndex,
      visible: false,
      visualWeight: VISUAL_WEIGHTS[name],
      sampleCount: samples.length,
    },
    fire,
  );
}

/**
 * Convert the named health state into small render multipliers. Suppressed
 * health renders neutral modifiers so unlit/out fires never look healthier.
 */
export function fireHealthVisualModifiers(health?: FireHealthState): FireHealthVisualModifiers {
  if (!health?.visible) return MODIFIERS.steady;
  return MODIFIERS[health.name];
}

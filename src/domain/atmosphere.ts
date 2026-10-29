/**
 * atmosphere.ts - derives a calm sky mood from local date/time.
 *
 * Inputs are plain `Date` and optional timezone hints; output is a small state
 * object that render code can consume. No storage, timers, network, or location
 * permission are involved.
 */

export type AtmospherePhase = 'morning' | 'day' | 'dusk' | 'night';
export type AtmosphereHemisphere = 'north' | 'south';
export type AtmosphereMode = 'focus' | 'open';

export interface AtmosphericState {
  phase: AtmospherePhase;
  brightness: number;
  warmth: number;
  seasonStrength: number;
  hemisphere: AtmosphereHemisphere;
  mode: AtmosphereMode;
}

export interface DeriveAtmosphereOptions {
  date?: Date;
  mode?: AtmosphereMode;
  timeZone?: string;
  locale?: string;
}

interface SeasonalCurve {
  dayOfYear: number;
  hemisphereMultiplier: 1 | -1;
  lightSpan: number;
  nightSpan: number;
}

const SOUTHERN_TIME_ZONE_HINTS = [
  'africa/johannesburg',
  'america/argentina',
  'america/santiago',
  'antarctica/',
  'australia/',
  'indian/mauritius',
  'pacific/auckland',
  'pacific/fiji',
];

const SOUTHERN_LOCALE_REGIONS = new Set([
  'AR',
  'AU',
  'BO',
  'BR',
  'CL',
  'FJ',
  'MU',
  'NZ',
  'PY',
  'UY',
  'ZA',
]);

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function rounded(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function localDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function localeRegion(locale: string | undefined): string | undefined {
  return locale?.split('-').find(part => /^[A-Z]{2}$/i.test(part))?.toUpperCase();
}

/**
 * Infer hemisphere from coarse timezone/locale names.
 *
 * The heuristic is intentionally conservative: when the signal is unknown, it
 * defaults north so the atmosphere still behaves predictably without prompting
 * for location access.
 */
export function inferHemisphere(
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
  locale = Intl.DateTimeFormat().resolvedOptions().locale,
): AtmosphereHemisphere {
  const zone = timeZone.toLowerCase();
  if (SOUTHERN_TIME_ZONE_HINTS.some(hint => zone.includes(hint))) return 'south';

  const region = localeRegion(locale);
  if (region && SOUTHERN_LOCALE_REGIONS.has(region)) return 'south';

  return 'north';
}

function seasonalCurve(date: Date, hemisphere: AtmosphereHemisphere): SeasonalCurve {
  const dayOfYear = localDayOfYear(date);
  const hemisphereMultiplier = hemisphere === 'north' ? 1 : -1;
  const summerPeak = 172;

  // Cosine gives a smooth annual signal: +1 near local summer, -1 near winter.
  const seasonStrength =
    Math.cos(((dayOfYear - summerPeak) / 365) * Math.PI * 2) * hemisphereMultiplier;
  const lightSpan = seasonStrength * 1.35;

  return {
    dayOfYear,
    hemisphereMultiplier,
    lightSpan,
    nightSpan: -lightSpan,
  };
}

function phaseForHour(hour: number, lightSpan: number): AtmospherePhase {
  const morningStart = 6 - lightSpan;
  const dayStart = 9 - lightSpan * 0.45;
  const duskStart = 17 + lightSpan * 0.75;
  const nightStart = 20 + lightSpan;

  if (hour >= morningStart && hour < dayStart) return 'morning';
  if (hour >= dayStart && hour < duskStart) return 'day';
  if (hour >= duskStart && hour < nightStart) return 'dusk';
  return 'night';
}

function toneForPhase(phase: AtmospherePhase): { brightness: number; warmth: number } {
  switch (phase) {
    case 'morning':
      return { brightness: 0.62, warmth: 0.76 };
    case 'day':
      return { brightness: 0.86, warmth: 0.48 };
    case 'dusk':
      return { brightness: 0.48, warmth: 0.34 };
    case 'night':
      return { brightness: 0.18, warmth: 0.28 };
  }
}

/**
 * Derive the current atmosphere in one cheap pass.
 *
 * Seasonal strength subtly biases brightness but never overrides the clear
 * time-of-day identity needed for screenshots.
 */
export function deriveAtmosphere(options: DeriveAtmosphereOptions = {}): AtmosphericState {
  const date = options.date ?? new Date();
  const mode = options.mode ?? 'open';
  const hemisphere = inferHemisphere(options.timeZone, options.locale);
  const curve = seasonalCurve(date, hemisphere);
  const hour = date.getHours() + date.getMinutes() / 60;
  const phase = phaseForHour(hour, curve.lightSpan);
  const tone = toneForPhase(phase);
  const seasonalBrightness = curve.lightSpan * 0.035;
  const winterNightPull = phase === 'night' && curve.nightSpan > 0 ? curve.nightSpan * 0.035 : 0;

  return {
    phase,
    brightness: rounded(clamp01(tone.brightness + seasonalBrightness - winterNightPull)),
    warmth: rounded(clamp01(tone.warmth + curve.lightSpan * 0.025)),
    seasonStrength: rounded(curve.lightSpan / 1.35),
    hemisphere,
    mode,
  };
}

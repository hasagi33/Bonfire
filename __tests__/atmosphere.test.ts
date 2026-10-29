/**
 * atmosphere.test.ts - deterministic coverage for the derived sky model.
 *
 * Tests pass fixed dates into the pure helper so they never depend on the
 * machine clock, current timezone, or device locale.
 */

import { deriveAtmosphere, inferHemisphere } from '../src/domain/atmosphere';

function localDate(month: number, day: number, hour: number, minute = 0): Date {
  return new Date(2026, month - 1, day, hour, minute, 0);
}

test('derives daytime, dusk, and night from local time with screenshot-friendly brightness', () => {
  const day = deriveAtmosphere({ date: localDate(3, 20, 12), timeZone: 'America/New_York' });
  const dusk = deriveAtmosphere({ date: localDate(3, 20, 19), timeZone: 'America/New_York' });
  const night = deriveAtmosphere({ date: localDate(3, 20, 2), timeZone: 'America/New_York' });

  expect(day.phase).toBe('day');
  expect(day.brightness).toBeGreaterThan(0.75);
  expect(dusk.phase).toBe('dusk');
  expect(night.phase).toBe('night');
  expect(night.brightness).toBeLessThan(0.3);
});

test('reads as morning with a bright, warm sunrise', () => {
  const morning = deriveAtmosphere({ date: localDate(3, 20, 6, 30), timeZone: 'America/New_York' });
  const dusk = deriveAtmosphere({ date: localDate(3, 20, 19), timeZone: 'America/New_York' });

  expect(morning.phase).toBe('morning');
  expect(morning.warmth).toBeGreaterThan(dusk.warmth);
  expect(morning.brightness).toBeGreaterThan(0.55);
});

test('smooth annual curve makes summer and winter feel different', () => {
  const summer = deriveAtmosphere({ date: localDate(6, 21, 6), timeZone: 'America/New_York' });
  const winter = deriveAtmosphere({ date: localDate(12, 21, 6), timeZone: 'America/New_York' });

  expect(Math.abs(summer.seasonStrength)).toBeGreaterThan(0.9);
  expect(Math.abs(winter.seasonStrength)).toBeGreaterThan(0.9);
  expect(Math.sign(summer.seasonStrength)).not.toBe(Math.sign(winter.seasonStrength));
  expect(summer.phase).not.toBe(winter.phase);
});

test('southern hemisphere flips the seasonal curve without location prompts', () => {
  const northSummer = deriveAtmosphere({ date: localDate(6, 21, 6), timeZone: 'America/New_York' });
  const southWinter = deriveAtmosphere({ date: localDate(6, 21, 6), timeZone: 'Australia/Sydney' });

  expect(northSummer.hemisphere).toBe('north');
  expect(southWinter.hemisphere).toBe('south');
  expect(southWinter.seasonStrength).toBeCloseTo(-northSummer.seasonStrength, 1);
  expect(southWinter.phase).not.toBe(northSummer.phase);
});

test('hemisphere inference falls back north for unknown regions', () => {
  expect(inferHemisphere('Europe/Sarajevo', 'bs-BA')).toBe('north');
  expect(inferHemisphere('Pacific/Auckland', 'en-NZ')).toBe('south');
});

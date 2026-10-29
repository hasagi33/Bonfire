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
  const day = deriveAtmosphere({ date: localDate(6, 15, 12), timeZone: 'America/New_York' });
  const dusk = deriveAtmosphere({ date: localDate(6, 15, 20), timeZone: 'America/New_York' });
  const night = deriveAtmosphere({ date: localDate(6, 15, 2), timeZone: 'America/New_York' });

  expect(day.phase).toBe('day');
  expect(day.brightness).toBeGreaterThan(0.75);
  expect(dusk.phase).toBe('dusk');
  expect(night.phase).toBe('night');
  expect(night.brightness).toBeLessThan(0.3);
});

test('reads as morning with a bright, warm sunrise', () => {
  const morning = deriveAtmosphere({ date: localDate(6, 15, 5), timeZone: 'America/New_York' });
  const dusk = deriveAtmosphere({ date: localDate(6, 15, 20), timeZone: 'America/New_York' });

  expect(morning.phase).toBe('morning');
  expect(morning.warmth).toBeGreaterThan(dusk.warmth);
  expect(morning.brightness).toBeGreaterThan(0.55);
});

test('smooth annual curve makes northern winter more night-leaning than summer', () => {
  const summer = deriveAtmosphere({ date: localDate(6, 21, 6), timeZone: 'America/New_York' });
  const winter = deriveAtmosphere({ date: localDate(12, 21, 6), timeZone: 'America/New_York' });

  expect(summer.seasonStrength).toBeGreaterThan(0.9);
  expect(winter.seasonStrength).toBeLessThan(-0.9);
  expect(summer.phase).toBe('morning');
  expect(winter.phase).toBe('night');
  expect(winter.brightness).toBeLessThan(summer.brightness);
});

test('southern hemisphere flips the seasonal curve without location prompts', () => {
  const northSummer = deriveAtmosphere({ date: localDate(6, 21, 6), timeZone: 'America/New_York' });
  const southWinter = deriveAtmosphere({ date: localDate(6, 21, 6), timeZone: 'Australia/Sydney' });

  expect(northSummer.hemisphere).toBe('north');
  expect(southWinter.hemisphere).toBe('south');
  expect(southWinter.seasonStrength).toBeLessThan(-0.9);
  expect(southWinter.phase).toBe('night');
});

test('hemisphere inference falls back north for unknown regions', () => {
  expect(inferHemisphere('Europe/Sarajevo', 'bs-BA')).toBe('north');
  expect(inferHemisphere('Pacific/Auckland', 'en-NZ')).toBe('south');
});

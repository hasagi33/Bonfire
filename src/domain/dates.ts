/**
 * dates.ts — small, pure helpers for working with calendar dates.
 *
 * The whole app reasons about "days" using a string key "YYYY-MM-DD" (e.g.
 * "2026-06-11"). Centralising date logic here means the "what counts as today /
 * a past day" rule is defined exactly once and is easy to unit-test.
 *
 * Important rule (from the spec, mirroring `BonfireDesign/logic.js`): a day is
 * only "past" — and therefore can be a "missed" day — once its local calendar
 * date has fully elapsed. Today, while it has no score yet, is NEVER a miss.
 *
 * All functions use the device's LOCAL time. Keys are built from local
 * year/month/day parts (not `toISOString()`, which is UTC) so the fire never
 * jumps a day across time zones.
 */

// A date key is a string like "2026-06-11". This alias documents intent.
export type DateKey = string;

// Pad a number to 2 digits, e.g. 6 -> "06".
function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Convert a Date to a local "YYYY-MM-DD" key. (design: `ymd`) */
export function ymd(date: Date): DateKey {
  // getMonth() is 0-based (January = 0), so add 1 for a human month number.
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Parse a "YYYY-MM-DD" key into a local Date at midnight. (design: `parseYmd`) */
export function parseYmd(key: DateKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  // month - 1 because the Date constructor expects a 0-based month.
  return new Date(year, month - 1, day);
}

/** Today's local date as a key. */
export function todayKey(): DateKey {
  return ymd(new Date());
}

/** Is `key` strictly before `today`? Zero-padded keys compare as calendar order. */

/** Is `key` strictly after `today`? Used to reject scoring future days. */
export function isFuture(key: DateKey, today: DateKey): boolean {
  return key > today;
}

/** Return the key `n` days after `key` (negative n goes backwards). */
export function addDays(key: DateKey, n: number): DateKey {
  const d = parseYmd(key);
  d.setDate(d.getDate() + n); // setDate handles month/year roll-over
  return ymd(d);
}

/** Whole-day difference `a - b` (positive when `a` is later). */
export function diffDays(a: DateKey, b: DateKey): number {
  const ms = parseYmd(a).getTime() - parseYmd(b).getTime();
  return Math.round(ms / 86400000);
}

/**
 * Return the Monday that starts the local calendar week containing `key`.
 *
 * Week-based achievements (e.g. "every day of one calendar week scored") need a
 * stable, agreed-upon week boundary. We use Monday–Sunday: JS `getDay()` returns
 * 0 for Sunday and 1–6 for Mon–Sat, so we shift Sunday to "7" and subtract
 * `weekday - 1` days to land on that week's Monday.
 */
export function startOfWeek(key: DateKey): DateKey {
  const weekday = parseYmd(key).getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const isoWeekday = weekday === 0 ? 7 : weekday; // treat Sunday as the 7th day
  return addDays(key, -(isoWeekday - 1)); // back up to Monday
}

/**
 * One cell in a month grid: a real day key, or `null` for the blank padding
 * cells before the 1st / after the last day.
 */
export type MonthCell = DateKey | null;

/**
 * Build a 6-row × 7-column grid (42 cells) for the given month, weeks starting
 * on Sunday. Leading/trailing cells outside the month are `null` so real days
 * line up under the correct weekday column and the grid height stays stable.
 *
 * @param year  full year, e.g. 2026
 * @param month 0-based month (January = 0), matching JS Date
 */
export function monthGrid(year: number, month: number): MonthCell[] {
  const firstOfMonth = new Date(year, month, 1);
  // 0 = Sunday ... 6 = Saturday: this many blanks go before day 1.
  const leadingBlanks = firstOfMonth.getDay();
  // Day 0 of the *next* month is the last day of this month.
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: MonthCell[] = [];
  for (let i = 0; i < leadingBlanks; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(ymd(new Date(year, month, day)));
  }
  while (cells.length < 42) {
    cells.push(null);
  }
  return cells;
}

/**
 * streakBadge.ts — picks the badge label shown next to a streak.
 */

export type BadgeMode = 'compact' | 'full' | 'muted';

export function streakBadge(days: number, best: number, mode: BadgeMode, paused: boolean): string {
  let label = '';
  if (paused && days > 0) {
    label = 'paused';
  } else if (days <= 0) {
    label = best > 0 ? 'rekindle' : 'unlit';
  } else if (days === 1) {
    label = 'spark';
  } else if (days < 3) {
    label = 'ember';
  } else if (days < 7) {
    label = best > days ? 'ember+' : 'glow';
  } else if (days < 14) {
    label = best > days ? 'glow+' : 'flame';
  } else if (days < 30) {
    label = days === best ? 'flame*' : 'blaze';
  } else if (days < 60) {
    label = days >= best ? 'inferno*' : 'inferno';
  } else if (days < 100) {
    label = 'wildfire';
  } else if (days < 365) {
    label = 'beacon';
  } else {
    label = 'eternal';
  }
  switch (mode) {
    case 'compact':
      return label.length > 6 ? label.slice(0, 6) : label;
    case 'muted':
      return paused || days <= 0 ? '' : label.toLowerCase();
    case 'full':
    default:
      return best > 0 ? `${label} (${days}/${best})` : label;
  }
}

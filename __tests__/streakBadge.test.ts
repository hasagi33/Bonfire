/**
 * streakBadge.test.ts — unit tests for the streak badge label.
 */

import { streakBadge } from '../src/badges/streakBadge';

describe('streakBadge', () => {
  it('shows unlit for a fresh user', () => {
    expect(streakBadge(0, 0, 'full', false)).toBe('unlit');
  });

  it('shows spark on the first day', () => {
    expect(streakBadge(1, 1, 'full', false)).toBe('spark (1/1)');
  });

  it('shortens labels in compact mode', () => {
    expect(streakBadge(80, 80, 'compact', false)).toBe('wildfi');
  });
});

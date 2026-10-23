<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `habit/streak tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `GPU-rendered animation and visual effects`.
- In-domain: `local-first on-device data persistence`.
- In-domain: `calendar and daily journaling`.
- Capability: Log an integer productivity score from 1 to 5 for any day that is today or in the past.
- Capability: Add, change, or clear a previously assigned score for past or current days.
- Capability: Derive fire strength as the cumulative sum of per-day contributions in the current lit run (1 adds 0, 2-5 add increasing strength, 5 adds the most).
- Capability: Keep the fire lit on a single missed day and extinguish it after two consecutive missed days.
- Capability: Relight an extinguished fire with any score 1-5; a fully reset fire returns to zero strength rather than dormant.
- Capability: Recompute fire state from the full calendar against the current date, independent of score entry order, whenever any score changes.
- Capability: Soft-cap the visual flame size while underlying strength keeps increasing.
- Capability: Animate the bonfire across unlit/spark, lit at varying sizes, and gone-out states, with reduced-motion support that stops flame, ember, and coal loops.
- Capability: Swipe-up calendar sheet (hidden by default, revealed by upward swipe, hidden by downward swipe) with the flame lifting and dimming as the sheet opens.
- Capability: Month-focused calendar that pages back through any number of past months and is capped at the current month.
- Capability: Visually mark scored days versus missed days on the calendar.
- Capability: Persist all scores locally between sessions using AsyncStorage.
- Capability: Show a loading placeholder on cold start until entries and settings load, without discarding a score entered during loading.
- Capability: Flame color selection (Amber, Crimson, Sapphire) from a top-right settings button, with immediate recolor and persistence; defaults to Amber.
- Capability: Settings store with v1-to-v2 migration (flameColor to flameStyle) and fallback to 'amber' for unknown or corrupt ids.
- Capability: Catalog of 20 flame styles (1 base Amber, 8 streak-based, 11 time-based) with defined conditions and windows, each tied to one achievement.
- Capability: Streak-specific achievements: unlocked only while the current alive run satisfies the condition (e.g., N-day run, unbroken chain), relocked when the fire goes out or an edit breaks the condition.
- Capability: Time-specific achievements: unlock from the latest completion day D and stay unlocked through D+W inclusive while the fire is lit; expired flames relock and can be re-earned.
- Capability: Equip any unlocked flame; locked equipped flames render as a dim 'embered' variant.
- Capability: Flame gallery showing locked flames with name, colors, requirement, live progress, and how to re-earn expired time flames.
- Capability: Visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Accessibility labels and adequate touch targets on day cells, picker, settings, flame, and swipe handle.
- Capability: Optional short per-day notes that do not affect score or fire logic (per README).
- Capability: GPU-rendered flame, embers, and glows via React Native Skia; frame timing, gestures, and sheet animation via Reanimated and Gesture Handler.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `gamification / achievements`.
- In-domain: `GPU-rendered 2D graphics and animation`.
- In-domain: `local on-device persistence`.
- In-domain: `calendar and date-based history`.
- Capability: Log a daily productivity score from 1 to 5 for a given date.
- Capability: Reject score entries outside 1..5 or dated in the future.
- Capability: Clear a logged score for a day.
- Capability: Convert daily scores into a bonfire strength value via a pure, deterministic fire engine (contribution = max(0, score - 1)).
- Capability: Derive fire state (unlit, lit, extinguished) from the calendar evaluated against a passed-in today date.
- Capability: Allow one missed past day without extinguishing the fire; two consecutive missed past days extinguish it.
- Capability: Track whether a fire has ever been lit.
- Capability: Render an animated flame with React Native Skia, scaled by a soft-capped intensity model that asymptotes toward 1.
- Capability: Render visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) from recent score quality.
- Capability: Show a swipe-up calendar sheet (React Native Gesture Handler and Reanimated) for logging, editing, clearing, and reviewing scores.
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Unlock collectible flame styles/palettes from streak and time-based achievements.
- Capability: Apply a calendar heat color ramp indexed by score, using design theme tokens.
- Capability: Let the user choose a flame color, with an enum-validated setting that falls back to Amber on invalid input.
- Capability: Persist entries and settings locally via AsyncStorage behind isolated storage modules with versioned keys.
- Capability: Expose entries and settings through React hooks (useEntries, useSettings) with ready-state and optimistic local updates.

## Out-of-Domain Examples

- Multi-user accounts, login, or authentication
- Cloud sync, backend servers, or remote data storage
- Social features such as sharing, friends, leaderboards, or feeds
- Task management, to-do lists, or project tracking
- Charts, analytics dashboards, or statistical trend graphs beyond the calendar and fire state
- Push notifications or reminder scheduling
- Payments, subscriptions, or in-app purchases
- Web-first or desktop layouts, multi-screen navigation beyond the single-screen experience
- Scores that are averaged to penalize low scores or that reward intentionally low or lowered ratings
- Editable or manually set fire state (fire state must always be derived from the calendar)
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 057dd252f6 058efddc2d 0da3ed249d 103364254b 14b15c31a6 16544295ec 1bd5129793 2a379df87e 3079aace1d 38133b21b5 39e0621d31 3dda028bbd 52bf31b20e 574e7ecce0 57e324edd8 5edda6a831 657df14419 6690187c1e 6f15121903 7209797433 76952803fc 7e06c4259d 7f621cdd71 8324e01df2 89b2b50e6f 8a3093907a 8bbce2476e 8ffd2d5a3c 9691a0ae9e 9be8fc7706 9f952c1a92 afd842bb84 b16da04726 c0c8905585 c8f5e33be9 cb19b46d2a cb290b974a cf08bf549b d1d97f530c d7e7cf93cf de660d76e1 f62488e590 fedf054c9f -->

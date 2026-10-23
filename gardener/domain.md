<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile productivity tracking`.
- In-domain: `habit and streak tracking via gamification`.
- In-domain: `local-first data persistence`.
- In-domain: `2D/GPU animated visualization (flame rendering)`.
- In-domain: `calendar-based daily logging`.
- In-domain: `achievement and unlock systems`.
- In-domain: `user settings and personalization`.
- Capability: Record one integer productivity score from 1 to 5 per day, for today or any past date, with one entry per date.
- Capability: Change or clear a previously assigned score for any past or current day; future dates cannot be scored.
- Capability: Convert scores into cumulative fire strength (1→+0, 2→+1, 3→+2, 4→+3, 5→+4) over the current alive run.
- Capability: Extinguish the fire after two consecutive missed past days; a single missed day is tolerated; an unscored today is not a miss.
- Capability: Fully reset strength to zero when the fire goes out, and relight it from zero on any new score (a 1 relights as a minimal lit flame at strength 0).
- Capability: Soft-cap the on-screen flame size while the underlying strength keeps increasing without limit.
- Capability: Render an animated bonfire flame with React Native Skia and Reanimated, including rising particles whose intensity may scale with strength.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Flame-only main screen with a top-right settings button and a hidden calendar.
- Capability: Reveal the calendar with a full-screen swipe-up gesture from the closed main view and hide it with swipe-down (Gesture Handler and Reanimated sheet).
- Capability: Month-focused calendar that pages backward through any number of past months but not into future months, showing scored days, intensity, and missed days.
- Capability: Edit any past day's score from the calendar, with the fire and unlock states recomputed.
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Persist scores, notes, settings, and the selected flame locally via AsyncStorage; retain all past entries indefinitely with no automatic purge.
- Capability: Load saved entries on cold start behind a brief loading placeholder; loading never throws, and corrupt data falls back to empty entries or default settings.
- Capability: Choose a flame color (Amber default, Crimson, Sapphire) from settings that persists across restarts and recolors the flame immediately.
- Capability: Maintain a catalog of 20 flame styles (1 base, 8 streak, 11 time) with each style tied to one achievement; Amber is always unlocked.
- Capability: Unlock streak-specific flames while the current alive run satisfies their condition, relocking when the fire goes out or an edit breaks the condition.
- Capability: Unlock time-specific flames for a window of days from the most recent completion day, gated on the fire being lit; backfilled days whose window has elapsed stay locked.
- Capability: Recompute all unlock states deterministically and order-independently from calendar history rather than persisting unlock state.
- Capability: Equip any flame, including locked ones; locked equipped flames render as a dim, desaturated embered variant, and they burst to full color when earned.
- Capability: Show a flame gallery from settings listing every flame with colors, requirement, unlock status, live progress, and days remaining for time flames.
- Capability: Give brief in-app feedback when a flame newly unlocks and a brief rejection cue when tapping a locked flame (no dialogs or push notifications).
- Capability: Migrate settings from v1 flameColor to v2 flameStyle, preserving existing color choices and never throwing on corrupt data.
- Capability: Keep achievement conditions positive: reward stronger scores, cumulative strength, and longer continuity, never low averages or intentionally low scores.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `productivity tracking`.
- In-domain: `gamification / achievements`.
- In-domain: `GPU-rendered 2D graphics and animation`.
- In-domain: `local on-device persistence`.
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
- Capability: Unlock collectible flame styles/palettes from streak and time-based achievements.
- Capability: Apply a calendar heat color ramp indexed by score, using design theme tokens.
- Capability: Let the user choose a flame color, with an enum-validated setting that falls back to Amber on invalid input.
- Capability: Persist entries and settings locally via AsyncStorage behind isolated storage modules with versioned keys.
- Capability: Expose entries and settings through React hooks (useEntries, useSettings) with ready-state and optimistic local updates.

## Out-of-Domain Examples

- Task or to-do list management
- Pomodoro or focus timers and stopwatches
- Push notifications or reminder alerts
- Cloud sync, user accounts, or multi-device sign-in
- Social features such as sharing, friends, leaderboards, or feeds
- Financial, expense, or budgeting tracking
- Analytics dashboards with charts and graphs as the primary view
- Multi-user team collaboration or shared bonfires
- Rewarding low scores, lowered scores, or deliberately breaking streaks
- Server-side backend, REST APIs, or remote databases for scores
- Web-only dashboards or desktop-specific UI
- Payments, in-app purchases, or ad monetization of flame styles
- Health tracking beyond the visual-only Fire Health tier (e.g., medical or fitness metrics)
- Automatic purging or expiry of historical entries
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 05961333c0 0dfd2e0053 1d1270ef6a 1eb7432f61 1f40b78546 20b242cb4a 261a271eb9 2f49cf7181 36b3d974b1 38e3fbb4d6 3a86a2b8e1 3e276396b1 3ebe6799ca 4529ebbe47 469c7a6422 4c48566ca5 501636585a 574e7ecce0 58731477df 59d7deed03 5a7732fea8 62f213ecdc 66c962c602 6ecbb2b805 6f4ea30dfa 76952803fc 7a3cdf50c2 7c8b0d5bcf 824c1cb2ff 87496c390c 87e404d98f 8a3093907a 8a37882791 a5fdd3b027 b26cb2b8d8 b9ce0510a8 bfc60febff c501434dae c6b38a2c24 ced1c1dc58 d0dee21c7c d286153d38 d7f1599c52 db87edae68 de17ebb7bc e513ebeb60 efb47f513a f3d4e3ff2c -->

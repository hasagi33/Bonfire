<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `habit/streak tracking via gamification`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `animated 2D graphics and visual effects`.
- In-domain: `local-first on-device data persistence`.
- In-domain: `calendar and date-based history review`.
- Capability: Record one daily productivity score per calendar day as an integer from 1 to 5.
- Capability: Add, change, backfill, or clear scores for any past or current day.
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current alive run (score 1 adds nothing; 2-5 add increasing amounts).
- Capability: Apply a streak rule: one missed past day keeps the fire lit, two consecutive missed past days extinguish it fully, and any new score relights it.
- Capability: Render the fire in lit, out, and unlit states, with embers, hearth logs, coals, grey logs, and smoke wisp for the out state.
- Capability: Show a full-screen animated bonfire flame as the main view that grows with logged days, with a settings control in the top-right.
- Capability: Display a swipe-up bottom-sheet calendar hidden by default, revealed by swiping up and hidden by swiping down, with the flame lifting and dimming as the sheet opens.
- Capability: Provide a month-focused calendar grid with heat-ramp day cells, distinct scored/today/missed/future/blank day states, and an inline 1-5 score picker with Clear.
- Capability: Page backward through unlimited past months while blocking navigation into future months.
- Capability: Store short per-day notes that do not affect score or fire logic.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Choose flame colors (Amber, Crimson, Sapphire) that persist across restarts and recolor the flame immediately.
- Capability: Maintain a catalog of achievement-locked flame styles, each tied to one achievement, with Amber always unlocked as the default.
- Capability: Unlock streak-specific flames while the current alive run satisfies their condition, relocking them when the fire goes out or the condition breaks.
- Capability: Unlock time-specific flames on their achievement day and keep them available through a window of D through D+W inclusive while the fire is lit, resetting on re-completion without banking days.
- Capability: Render a locked but equipped flame in a dim, desaturated embered variant, bursting to full when earned (Amber never embers).
- Capability: Provide a flame gallery reached from settings listing every flame with unlock status, name, colors, required achievement, and live progress or days remaining.
- Capability: Give brief in-app feedback when a flame newly unlocks (no push notifications).
- Capability: Recompute all unlock states deterministically and order-independently from the stored date-to-score map whenever any day is edited.
- Capability: Persist the date-to-score map, notes, and active flame-style id on device via AsyncStorage, with full offline operation.
- Capability: Migrate the former flame color preference to the new flame-style id on upgrade.
- Capability: Show a loading placeholder until stored scores and settings load.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Render flame, embers, glows, and effects with React Native Skia, and animate frames, gestures, and sheet motion with Reanimated and Gesture Handler.
- Capability: Enforce touch-target sizing and gesture rules so the calendar swipe does not conflict with taps on the settings gear, day cells, and score buttons.
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

- Cloud sync, user accounts, or multi-device data sharing
- Server-side APIs, backend storage, or remote databases
- Push notifications or reminders
- General task or to-do management
- Charts, analytics dashboards, or statistics beyond the fire and its health tiers
- Social features such as friends, leaderboards, or sharing
- Payments, subscriptions, or in-app purchases for flame styles
- Time tracking, Pomodoro timers, or calendar event scheduling
- Web-browser-first UI or desktop-specific layouts
- Ingesting data from third-party health, fitness, or productivity services
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

<!-- gardener-generated: 06b26659f0 072df1a7eb 10a5339b1f 1a0d560b39 252bf26368 2d9b47365c 2f31214a2d 3392792f6c 3793064f70 3b84910611 4989311149 574e7ecce0 57ed901dd1 58731477df 5e6efad5cd 60381b4ec3 610b74576d 6686183325 6e473f6d02 6f15121903 72c585d68e 7c37a98b20 8010e2080a 8138d31f0a 84ac574f64 8a3093907a 8f30b1e028 a032edf176 b36967f72a bd3656e55d c223ae2447 c23251b3f5 c392eb9365 c6a067496b c9b194fdce cb19b46d2a dc3bc8a73d de660d76e1 e5fa1461cd e82702fe07 fa59a35400 fc9e24fe10 -->

<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app development`.
- In-domain: `productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `GPU-accelerated 2D graphics and animation`.
- In-domain: `local-first on-device data storage`.
- In-domain: `calendar and daily logging UI`.
- Capability: Log a daily productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear a previously assigned score for any past or current day.
- Capability: Convert cumulative per-day scores into a single bonfire strength value (score 1 contributes 0; scores 2-5 contribute max(0, score-1)).
- Capability: Keep the fire lit across a single missed past day; two consecutive missed past days extinguish it and reset strength to zero.
- Capability: Treat an unscored today as not a miss.
- Capability: Relight an extinguished fire when any score is logged.
- Capability: Derive fire state deterministically from stored scores and the current local date, recomputed on every change and independent of entry order.
- Capability: Render an animated bonfire on a single main screen with Skia gradients, blur, glow, embers, smoke, and logs, with rising particles that may scale with strength.
- Capability: Show a swipe-up calendar bottom sheet (swipe-down to hide) for logging, editing, clearing, and reviewing scores.
- Capability: Full-screen upward swipe to open the calendar, without interfering with taps on the settings gear and day cells.
- Capability: Month calendar that pages backward through any number of past months and is capped at the current month going forward.
- Capability: Calendar visually indicates which days have scores and which were missed.
- Capability: Settings screen/button (top-right gear) to choose flame color from Amber, Crimson, and Sapphire, defaulting to Amber, persisted across restarts.
- Capability: Flame style gallery reached from settings listing every flame with name, colors, required achievement, unlocked or locked status, and live progress or days remaining.
- Capability: Streak-based achievements that stay unlocked only while the current run satisfies the condition and relock when the fire goes out.
- Capability: Time-based achievements that unlock on the achievement day, stay unlocked through D+W inclusive while the fire is lit, expire afterward, and reset on re-completion.
- Capability: Equip any flame, including locked ones; locked equipped flames render as a dim embered variant and switch to full style automatically when earned.
- Capability: Amber flame never renders embered.
- Capability: Brief in-app feedback when a flame newly unlocks, computed from state without persisting it.
- Capability: Visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Scene atmosphere adapted from local time without continuous JS timers.
- Capability: Persist scores, the selected flame style, and the chosen color on-device using AsyncStorage.
- Capability: Show a loading placeholder on cold start until saved scores load, without discarding scores entered during loading.
- Capability: Operate fully offline with no network calls at runtime.
- Capability: Optional short per-day notes that do not affect score or fire logic (described in README).
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
- Capability: Adapt scene atmosphere from local time without continuous JS timers.

## Out-of-Domain Examples

- task or to-do list management
- charts, graphs, or analytics dashboards beyond the calendar and fire visualization
- cloud sync, user accounts, or multi-device sharing
- social features, leaderboards, or sharing achievements with others
- push notifications or reminders
- network-backed APIs or server-side data storage
- payments, subscriptions, or in-app purchases
- pomodoro or time-tracking timers
- habit-tracking features beyond the bonfire score model
- web-only UI or desktop layouts
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 04252fddbb 1062b7c087 112850da9a 14b15c31a6 19357ed6c8 2a2b2c881a 361cc78d6a 484664fd00 5674b103e4 574e7ecce0 57e324edd8 5d0dd34bcd 6092110c3e 692d5c477e 6aaa51dd75 6cd06604be 6f15121903 6fecfbb24e 708c47dec6 7c88092f61 80e9163214 8b031f4792 8f30b1e028 935af9eddd 958f9cd6e1 9746154e1c 9be8fc7706 9e3743873a a5fdd3b027 b0beb62b29 b6a018b55f b96ca6fd71 bff31c9bbf c96c759d5f cdab4d927d d0c07ea747 e58102a978 e68f71b55e eadac94da7 ed13458a6f ed242bbbde fa23beeba2 -->

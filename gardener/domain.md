<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `React Native`.
- In-domain: `productivity habit tracking`.
- In-domain: `gamification / achievements`.
- In-domain: `GPU 2D graphics and animation`.
- In-domain: `local-first on-device storage`.
- Capability: Log one integer daily productivity score from 1 to 5 for the current or any past day, with ability to change or clear it.
- Capability: Convert cumulative daily scores into bonfire strength (score 1 adds 0; 2-5 add increasing strength).
- Capability: Allow a single missed past day without extinguishing the fire; extinguish after two consecutive missed past days, resetting strength to zero.
- Capability: Relight an extinguished fire on any new score 1-5 (a 1 relights as a minimal lit flame at strength 0).
- Capability: Soft-cap the on-screen flame size toward a maximum while underlying strength keeps increasing.
- Capability: Render the animated flame with React Native Skia and Reanimated, including embers, glows, and visual effects.
- Capability: Show charred logs and a dissipating smoke wisp when the fire is out, with no flame or embers.
- Capability: Swipe-up calendar bottom sheet (React Native Gesture Handler) for logging, editing, clearing, and reviewing scores; swipe down hides it; flame lifts and dims as the sheet opens.
- Capability: Month-focused calendar that pages backward through past months but never into future months.
- Capability: Backfill and edit past days, with deterministic recomputation of the flame regardless of entry order.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Settings button (top-right) and settings sheet for choosing the flame style.
- Capability: Flame catalog of collectible styles (Amber default, plus Crimson, Sapphire, and others), with Amber always unlocked and all others achievement-gated.
- Capability: Each flame tied to exactly one achievement; achievements classified as streak-specific or time-specific.
- Capability: Streak-specific achievements stay unlocked only while the current run satisfies the condition and relock when the fire goes out.
- Capability: Time-specific achievements unlock on a achievement day, remain unlocked for a window of days while the fire is lit, expire afterward, and can be re-earned with no banking of days.
- Capability: Embered (dimmed, desaturated) render of locked-but-equipped flames; unlocked equipped flame renders full color.
- Capability: Flame gallery reached from settings showing every flame's status, name, colors, requirement, and live progress or time days remaining / re-earn prompt.
- Capability: In-app feedback highlight/animation when a flame newly unlocks (no push notifications).
- Capability: Fire Health visual-only indicator from recent score quality: Faint, Steady, Bright, or Radiant.
- Capability: Scene atmosphere adapted from local time of day without continuous JS timers.
- Capability: Loading placeholder until saved scores and settings load, without discarding scores entered during loading.
- Capability: Local-only persistence of scores, notes, and selected flame via AsyncStorage, persisted across app restarts; versioned settings store with migration from earlier flame-color setting.
- Capability: Fully offline operation with no network dependency.
- Capability: Targets 120 FPS rendering for all flame styles including multicolor ones.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `productivity tracking`.
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

- Task or to-do list management
- Multi-user accounts, login, or cloud sync
- Push notifications or reminders
- Charts, streak counters, or analytics dashboards as primary views
- Payments, in-app purchases, or subscriptions
- Social sharing or leaderboards
- Calendar integration with external calendar services (Google Calendar, iCloud)
- Pomodoro or time-tracking timers
- Backend server APIs or remote databases
- Web-only or desktop-only UI targets
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

<!-- gardener-generated: 1659d1784b 1a4aa6a80b 1f97a1abbb 2294c19fb1 2afc8c80e7 2c1f3b79aa 2f46fb1089 304d3a3329 321a7cca5f 48ebe0cd0b 51713fbd59 574e7ecce0 5ae63ece49 5d0dd34bcd 70e1dae326 772e5523ec 7748170036 7796a2c1ba 834fd5339a 8d1168abb5 8f30b1e028 946ba6d8f3 9aa927cc6a a53b987ef8 a5fdd3b027 a619d7684d a79b66dd5a b616921af4 b650416bff bac331c3b2 bce1096e7f bed6ba940b c60930c26f c6693cade1 c795c20ed3 d026ad4ee2 d71de4e971 e27252cd5a e6842ea6f4 f34747cfb6 f3fd0cd525 fdb7b1d7f3 -->

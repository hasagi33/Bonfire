<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `React Native / Expo`.
- In-domain: `gamified productivity tracking`.
- In-domain: `on-device persistence`.
- In-domain: `GPU-rendered 2D animation`.
- In-domain: `gesture-driven UI`.
- In-domain: `achievement/unlock system`.
- Capability: Log a daily productivity score (integer 1–5) for today or any past day, one entry per date.
- Capability: Change or clear a previously assigned score for any past or current day.
- Capability: Convert cumulative daily scores into fire strength (score 1 adds 0, 2 adds 1, 3 adds 2, 4 adds 3, 5 adds 4) over the current alive run.
- Capability: Keep the fire lit through a single missed past day; two consecutive missed past days extinguish it (today being unscored is not a miss).
- Capability: Fully reset fire to zero when extinguished and relight it as a fresh run on any new score.
- Capability: Render an animated bonfire flame with rising particles, embers, hearth logs, and glows via React Native Skia and Reanimated.
- Capability: Soft-cap the on-screen flame size while underlying strength keeps increasing.
- Capability: Display an out-state with charred logs and a smoke wisp, with no flame or embers.
- Capability: Show a fire caption (word and sub-text) derived from fire state and strength.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Swipe-up bottom-sheet calendar with month grid, heat-ramp day cells, and inline 1–5 score picker.
- Capability: Page back through any number of past months; no paging into future months; future-dated scores rejected.
- Capability: Visually mark scored and missed days on the calendar.
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Settings screen with a settings button in the top-right corner of the main view.
- Capability: Flame gallery listing all flame styles with locked/unlocked status, colors, required achievement, and live progress.
- Capability: Catalog of 20 flame styles (1 base Amber, 8 streak-based, 11 time-based), each tied to one achievement, with embered variants for locked flames.
- Capability: Streak-specific flames unlock while the current run satisfies their condition and relock when the fire goes out or an edit breaks the condition.
- Capability: Time-specific flames unlock on an achievement day and stay available for a fixed window (D through D+W), with re-earn prompts on expiry and window reset on re-completion.
- Capability: Select any unlocked flame as the active style; active selection persists across restarts.
- Capability: Amber is always unlocked and is the default style; all other flames start locked.
- Capability: Persist scores, notes, and the selected flame on device with AsyncStorage; no backend or network at runtime.
- Capability: Deterministically recompute fire state, achievements, and health from stored history.
- Capability: Loading placeholder until stores finish loading.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `productivity tracking`.
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
- Capability: Unlock collectible flame styles/palettes from streak and time-based achievements.
- Capability: Apply a calendar heat color ramp indexed by score, using design theme tokens.
- Capability: Let the user choose a flame color, with an enum-validated setting that falls back to Amber on invalid input.
- Capability: Persist entries and settings locally via AsyncStorage behind isolated storage modules with versioned keys.
- Capability: Expose entries and settings through React hooks (useEntries, useSettings) with ready-state and optimistic local updates.

## Out-of-Domain Examples

- Multi-user accounts, login, or cloud sync
- Backend APIs or server-side storage
- Task lists, to-do items, or task management
- Charts, graphs, or streak counter dashboards as primary views
- Push notifications or reminders
- Social sharing, leaderboards, or friend features
- Purchases, in-app payments, or monetization
- Network-fetched content or remote configuration
- Calendar integrations with external services (Google Calendar, iCloud)
- Time tracking or pomodoro timers
- Web or desktop build targets as a primary product surface
- Data export/import to third-party services
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage

<!-- gardener-generated: 0a1518a592 0f185cf31b 13210ca462 1a4aa6a80b 1e88e3e122 24f6dfdb0a 254e5d16ab 28ab74aa5b 2d13a235c0 2dad1b950a 3716a3b9ac 462131d252 48ebe0cd0b 4a6ee42624 4c4cf1b012 574e7ecce0 58731477df 68bfa51eaa 6b92e0653f 6e616d79fe 78d0043c5e 7f29283ec2 7f5a4ec40e 8a3093907a 8f30b1e028 961499e063 96d2f9d239 9d7dafce34 a56bd4c65a a903b9e0db aa14c7efa0 bc176fa400 bdbab231ac c76febbd23 c8ba05334e cb33723664 cb90b3ef3d de17ebb7bc e2b15c05bd e93fb91349 e9b3c98c73 ed242bbbde ed9d9686ee edf85ee2db ff60c43abb -->

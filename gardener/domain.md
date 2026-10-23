<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `productivity tracking`.
- In-domain: `gamification`.
- In-domain: `local-first data persistence`.
- In-domain: `GPU graphics and animation`.
- In-domain: `gesture-driven UI`.
- In-domain: `accessibility`.
- Capability: Log an integer productivity score from 1 to 5 for today or any past day.
- Capability: Clear, change, or backfill scores for past days, with fire state recomputed from the full calendar in an order-independent way.
- Capability: Convert cumulative per-day contributions (score 1 adds 0, 2 adds 1, 3 adds 2, 4 adds 3, 5 adds 4) into fire strength over the current alive run.
- Capability: Extinguish the fire after two consecutive missed past days; a single missed day or an unscored today does not extinguish it.
- Capability: Reset fire to zero when it goes out and relight it as a fresh run when any score (including 1) is logged.
- Capability: Render a flame that grows with strength, with a soft-capped on-screen size.
- Capability: Render an out state with charred logs and a faint smoke wisp, with no flame or embers until relit.
- Capability: Show a loading placeholder on cold start until saved scores load.
- Capability: Swipe-up calendar bottom sheet with month paging across any number of past months, heat-ramp day cells, inline 1-5 score picker, and swipe-down to hide.
- Capability: Full-screen upward swipe gesture to open the calendar, while taps on the settings gear, dev pill, and day cells still work.
- Capability: Settings button and settings sheet for flame style selection.
- Capability: Achievement-locked catalog of 20 flame styles (1 base, 8 streak, 11 time) with Amber always unlocked and default.
- Capability: Streak-based achievements tied to continuous run length, strength, and strong days, relocking when the fire goes out or an edit breaks the condition.
- Capability: Time-windowed achievements that unlock on a derived achievement day, stay available for a fixed window, can be re-earned, and never bank days.
- Capability: Flame gallery grouped by tier showing every flame's name, colors, required achievement, unlock status, and live progress or countdown.
- Capability: Embered dimmed/desaturated rendering of locked active flames, with Amber exempt.
- Capability: Brief in-app feedback when a flame newly unlocks.
- Capability: Persist scores, per-day notes, and the selected flame style on-device with AsyncStorage across restarts.
- Capability: Migrate v1 Amber/Crimson/Sapphire setting to the v2 flame style setting, defaulting to Amber on missing or corrupt data.
- Capability: Visual-only fire health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Local-time-based scene atmosphere without continuous JS timers.
- Capability: GPU-rendered flame, embers, glows, and coal effects via React Native Skia.
- Capability: Frame-timed gesture and sheet animation via React Native Reanimated and Gesture Handler.
- Capability: Reduced-motion preference honored by stopping flame, ember, and coal animation loops.
- Capability: Accessibility labels and adequate touch targets for day cells, picker, settings, flame, and swipe handle.
- Capability: Memoized achievement computation kept outside the Skia render and flicker loop to avoid dropped frames.
- Capability: Fully offline operation with no network dependency.
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

- Cloud sync or multi-device accounts
- Task lists, to-do items, or task management
- Charts, graphs, or analytics dashboards beyond the flame and calendar
- Traditional streak counters or numeric streak badges as the primary view
- Social features, sharing, leaderboards, or friend comparison
- Push notifications or reminder scheduling
- Server-side APIs, backend storage, or authentication
- Payment, purchases, or ads
- Calendar integrations with external services (Google Calendar, iCal)
- Pomodoro timers, focus sessions, or time tracking
- Habit tracking beyond the 1-5 daily score
- Web-only dashboards or desktop-specific UI
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

<!-- gardener-generated: 010e8be57c 05338d8d6f 05961333c0 0b5a96ef9f 14b15c31a6 19eb4e295b 1a4aa6a80b 1a615c298d 1ebe5b1392 1f8a93d2b4 2512bacc7d 2a5045ce2f 2d7d8fed5b 2dad1b950a 2f49cf7181 30e520ee93 3d9dd5f611 44a9b63756 4e217930b1 55e5bfdbb5 574e7ecce0 6043fffd2b 634248a5f7 6f15121903 73d11a4cbf 7f29283ec2 89b2b50e6f 951fdb5bb6 9598cd8eb4 ab73944a9f b20380a595 b23f79902e bac331c3b2 bd5bfb9acf bfedb5ec7c c90c5bfa83 d0240406bd d8b2554dd0 dfc80856cf dfe85c3075 e27252cd5a e3e3899622 e6444a5382 e6d7ff5949 eb2132ba2b eedf871012 f999ba59aa fa728e45d6 -->

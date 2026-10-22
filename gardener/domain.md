<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `personal productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `animated 2D/GPU graphics and visual effects`.
- In-domain: `local-first on-device data persistence`.
- In-domain: `calendar and date-based history`.
- In-domain: `gesture-driven UI`.
- In-domain: `settings and preferences`.
- Capability: Log one integer productivity score from 1 to 5 per day, for today or any past date, with one entry per date.
- Capability: Add, change, or clear the score for any past or current day; future dates cannot be scored.
- Capability: Compute fire strength as the cumulative sum of per-day contributions (1 adds 0, 2 adds 1, 3 adds 2, 4 adds 3, 5 adds 4) over the current alive run.
- Capability: Keep the fire alive across a single missed past day; two consecutive missed past days extinguish it, with today being unscored not counted as a miss.
- Capability: Fully reset strength to zero when the fire goes out, and relight it from zero on any new score (a 1 relights as a minimal lit flame at strength 0).
- Capability: Recompute fire state deterministically from stored history so edits and backfills always yield the same result.
- Capability: Render a GPU-drawn animated flame (React Native Skia) and animate it with Reanimated, where on-screen size soft-caps while underlying strength keeps growing.
- Capability: Emit rising particles from the lit flame, with intensity that may scale with strength.
- Capability: Display visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Show a flame-only main screen with a settings button in the top-right corner.
- Capability: Reveal a month-focused calendar sheet via full-screen swipe up and hide it via swipe down, using React Native Gesture Handler and Reanimated sheet animation.
- Capability: Calendar shows which days have scores and their intensity, which days were missed, and can page back through any number of past months but not into future months.
- Capability: Support short per-day notes that do not affect score or fire logic.
- Capability: Persist all scores, notes, and selected flame locally via AsyncStorage, retained indefinitely with no automatic purge.
- Capability: Load saved entries on cold start behind a brief loading placeholder; loading never throws, and corrupt or missing data falls back to an empty map or default settings.
- Capability: Offer flame colors Amber (default), Crimson, and Sapphire, persisted across restarts and applied to the flame immediately.
- Capability: Migrate the settings schema from v1 flameColor to v2 flameStyle, preserving existing color choices.
- Capability: Catalog of exactly 20 flame styles (1 base, 8 streak-achievement, 11 time-achievement) with kinds, parameters, and unlock windows, each tied to one achievement; Amber is always unlocked.
- Capability: Classify achievements as streak-specific (active only while the current run meets the condition) or time-specific (a window of days from the most recent completion day, gated on the fire being lit).
- Capability: Recompute achievement unlock states from the calendar on every edit, including relocking streak flames when a score is cleared, and keep time flames unlocked only within their window.
- Capability: Show a locked equipped flame as a dim, desaturated embered variant; Amber never renders embered; out-state visuals take precedence when the fire is out.
- Capability: Flame gallery reached from settings listing every flame with name, colors, requirement, unlock status, and live progress or days remaining, grouped by tier, with accessibility roles and states.
- Capability: Users may equip any flame, including locked ones, which auto-bursts to full color once earned; the active selection persists across restarts.
- Capability: Tapping a locked gallery row gives a brief rejection cue and leaves the active flame unchanged, with no dialog.
- Capability: Give brief in-app feedback when a flame newly unlocks.
- Capability: Achievement rules reward stronger scores, higher cumulative strength, and longer continuity, and never reward low averages, low scores, or breaking streaks.
- Capability: Re-earning is possible indefinitely; no flame is consumed permanently.
- Capability: Automated tests (under __tests__) covering domain rules, store behavior, and UI interactions.
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
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Unlock collectible flame styles/palettes from streak and time-based achievements.
- Capability: Apply a calendar heat color ramp indexed by score, using design theme tokens.
- Capability: Let the user choose a flame color, with an enum-validated setting that falls back to Amber on invalid input.
- Capability: Persist entries and settings locally via AsyncStorage behind isolated storage modules with versioned keys.
- Capability: Expose entries and settings through React hooks (useEntries, useSettings) with ready-state and optimistic local updates.

## Out-of-Domain Examples

- Push or local notifications and reminders
- Cloud sync, user accounts, login, or multi-device sharing
- Social features, leaderboards, friends, or sharing scores publicly
- Task or to-do list management, project tracking, or pomodoro timers
- Classic streak counters, charts, or analytics dashboards as the primary view
- Server-side APIs, backends, or remote databases for storing entries
- Payments, in-app purchases, or premium flame sales
- Health data integration (e.g. HealthKit, step counts) or wearable sensors
- Calendar integration with external calendars (Google Calendar, iCal sync)
- Web-only admin dashboards or desktop-specific UI
- Ratings or reviews of other users' productivity
- Monetized or randomized loot boxes for flames
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

<!-- gardener-generated: 06d2ea1e58 145cce365e 18fbf40d70 1dfb152451 2172730188 25c88f0de5 329b558269 33c6ec6bea 3aef011bdd 3f575ed1c7 469c7a6422 4dbd4b429a 553be0a030 56d0b09bf1 574e7ecce0 57e324edd8 68b2f57dc3 6e2902f239 70046328e8 70a595d13a 75a49f77f7 76285d5822 7bf443baa7 7f29283ec2 812a90cc2f 8a3093907a 9379a169ca 9926a72c14 9d5b4da6d6 9df2e33487 a4d7b5d670 ad99f7c596 b167a16cbc b2d601cd92 be7178a4e5 cde85f59ee d14644db99 d31899b6e2 de660d76e1 e01bff1168 e085be35eb e32a11aeff e40e4275f8 e442ce5d0e e4cef79acc e5c5ec2e21 e7a9535e4f edaa672c3c f378e3b747 f4b39d4374 -->

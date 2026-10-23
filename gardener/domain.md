<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app (React Native / Expo, iOS and Android)`.
- In-domain: `personal productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `local-first data storage`.
- In-domain: `2D graphics and animation for a flame visual`.
- In-domain: `calendar-based daily logging`.
- Capability: Log an integer productivity score from 1 to 5 for any day that is today or in the past.
- Capability: Add, change, or clear a previously assigned score for past or current days.
- Capability: Convert daily scores into cumulative fire strength: a score of 1 keeps the day active with no added strength, and scores 2-5 add strictly increasing strength.
- Capability: Keep the fire alive across missed days: one missed past day does not extinguish it, two consecutive missed days do, resetting strength to zero.
- Capability: Relight an extinguished fire with any score from 1 to 5.
- Capability: Soft-cap the flame's visual size while the underlying strength keeps increasing.
- Capability: Derive fire state deterministically from the full calendar against the current date, independent of entry order, and recompute whenever a score changes.
- Capability: Render an animated flame with distinct unlit/spark, lit-at-varying-sizes, and gone-out states using React Native Skia and Reanimated.
- Capability: Show a single-screen main view with an animated bonfire, a top-right settings control, and an on-demand calendar.
- Capability: Reveal a swipe-up calendar sheet and hide it with swipe-down, with the flame lifting and dimming as the sheet opens.
- Capability: Month-focused calendar that pages back through any number of past months and cannot page into future months.
- Capability: Calendar visually marks which days have scores and which were missed.
- Capability: Persist all scores and the selected flame locally with AsyncStorage across app sessions.
- Capability: Show a loading placeholder on cold start until saved entries and settings load, without losing a score entered during loading.
- Capability: Let users choose a flame color (Amber, Crimson, Sapphire) in settings with immediate recolor and persistence, defaulting to Amber.
- Capability: Maintain a catalog of 20 flame styles (1 base Amber, 8 streak-based, 11 time-based), each tied to one achievement, with Amber always unlocked.
- Capability: Lock all flame styles except Amber until their achievement is met; locked equipped flames render as a dim 'embered' variant.
- Capability: Evaluate streak-specific achievements: unlocked only while the current alive run satisfies the condition, relocked when the fire goes out or an edit breaks the condition.
- Capability: Evaluate time-specific achievements: unlocked from the completion day D through D+W inclusive while the fire is lit, relocked after expiry, and re-earnable.
- Capability: Distinguish 'N-day run' (scored days within the current alive run) from 'unbroken chain' (consecutive scored days with no gaps) for achievement conditions.
- Capability: Flame gallery showing every catalog flame: unlocked flames are equippable, locked flames show requirements, colors, and live progress, and expired time flames show how to re-earn them.
- Capability: Equip any unlocked flame from the gallery; setFlameStyle accepts any catalog id and ignores unknown ones.
- Capability: Migrate v1 flameColor settings to v2 flameStyle and fall back to 'amber' for unknown or corrupt ids.
- Capability: Support gesture-driven interaction via React Native Gesture Handler, including full-screen upward swipe to open the calendar without stealing taps on the gear or day cells.
- Capability: Honor reduced-motion preference by stopping flame, ember, and coal animation loops.
- Capability: Provide accessibility labels and adequate touch targets on day cells, picker, settings, flame, and swipe handle.
- Capability: Sustain high frame rates (target 120 FPS on capable devices) during flame switching.
- Capability: Derive visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) from recent score quality, per the README.
- Capability: Support short per-day notes that do not affect score or fire logic, per the README.
- Capability: Adapt scene atmosphere from local time without continuous JS timers, per the README.
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
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Unlock collectible flame styles/palettes from streak and time-based achievements.
- Capability: Apply a calendar heat color ramp indexed by score, using design theme tokens.
- Capability: Let the user choose a flame color, with an enum-validated setting that falls back to Amber on invalid input.
- Capability: Persist entries and settings locally via AsyncStorage behind isolated storage modules with versioned keys.
- Capability: Expose entries and settings through React hooks (useEntries, useSettings) with ready-state and optimistic local updates.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.

## Out-of-Domain Examples

- Task or to-do management with checklists, due dates, or reminders
- Cloud sync, backend servers, or multi-device data sharing
- User accounts, authentication, or social features such as friends, leaderboards, or sharing
- Team or manager dashboards that aggregate other people's productivity
- Primary charts, analytics dashboards, or statistical reports as the main view
- Traditional streak counters as the headline UI element
- Pomodoro timers or time-tracking of work sessions
- Payments, in-app purchases, or ad monetization
- Web-only desktop layouts or landscape-first UI
- Push notification scheduling and calendar-app integrations
- Editing fire strength or health directly rather than deriving it from the calendar
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

<!-- gardener-generated: 0f1c5b6541 12dfeae47d 1842165135 1cc663b002 1f78b8fd96 299e66b53b 2c71d7b6c5 32bd5a1a08 3cd74a368e 4166711987 4dbd4b429a 51067d68f4 574e7ecce0 57e324edd8 5d03f9b129 62c389503e 6c38098944 6df8977c39 7163a65156 72e93597b3 78b0fdf7a6 7c6a6f6864 7d089c85b5 7e0ec1a315 826a5e408f 83d596519a 8611f1746c 8bbce2476e 8d102adce6 9167a1f730 9327f974bf 93e92e8f3d 9ad628527a 9d96d5a016 9f72136e62 ac858a5dde b16da04726 b5793a0805 bbacbd0280 ca0d0ad5e7 d8d81fc00f e30f66f1d4 e513ebeb60 e874f62c60 eeef9f2db3 efb6f47c7f f42f415258 fb63ae5100 -->

<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `productivity tracking`.
- In-domain: `gamification / achievements`.
- In-domain: `GPU 2D graphics and animation (React Native Skia, Reanimated)`.
- In-domain: `local-only on-device data persistence (AsyncStorage)`.
- In-domain: `calendar and day-journaling UI`.
- In-domain: `gesture-driven UI (swipe sheets)`.
- In-domain: `theming and atmosphere (time-of-day and seasonal visuals)`.
- Capability: Log a daily productivity score of 1-5 for today and any past day, with edits and backfill that recompute the fire from the full calendar history.
- Capability: Derive fire strength as a cumulative sum of per-day score contributions over the current alive run, with on-screen size soft-capped while underlying strength keeps growing.
- Capability: Extinguish the fire after two consecutive missed past days (reset to zero) while a single missed day keeps it lit; any score 1-5 relights it; today unscored is not a miss.
- Capability: Render an animated Skia flame with embers, glows, halos, ground glow, and hearth wash, plus an out state of charred logs and a smoke wisp.
- Capability: Offer a catalog of 20 collectible flame styles that mirror BonfireDesign profiles (silhouette, tongues, edge, motion, aura, particles, opacity, inversion, core scale, labels) with rarity grouping and palette intent.
- Capability: Unlock flames via streak-specific and time-specific achievements, with time-based unlocks expiring after a window and restarting on re-completion.
- Capability: Show locked flames as dim embered previews in a flame gallery listing unlock status, name, colors, required achievement, and live progress or days remaining.
- Capability: Allow selecting any catalog flame (locked ones render embered and auto-switch to full when earned); reject locked selections with a brief cue.
- Capability: Provide in-app feedback when a flame newly unlocks, recomputing unlock states live without restart.
- Capability: Flame color choice among Amber (default), Crimson, and Sapphire from settings, persisted across restarts.
- Capability: Compute a visual-only Fire Health state (Faint, Steady, Bright, Radiant) from the latest 7 scored days with recency weighting and a sparse-history fallback, shown as a label and in flame visuals.
- Capability: Swipe-up calendar sheet (opened from anywhere on the main view, dismissed by swipe-down or scrim tap) with month-focused view, backward-only paging capped at the current month, tappable day cells, and score buttons colored by value.
- Capability: Optional short personal note per day that can be added, viewed in day detail, edited, replaced, and persisted without affecting score or fire logic.
- Capability: Top-right settings button (enlarged cog) opening flame and settings selection without opening the calendar.
- Capability: Time-of-day and seasonal background atmosphere (day, dusk, night; winter with clearest night identity; southern-hemisphere inversion) that keeps the fire dominant and panels readable.
- Capability: Persist all scores, notes, selected flame, and flame color locally between sessions; fully offline with no network dependency.
- Capability: Loading placeholder on cold start until saved scores and settings load (cold start under 3 seconds).
- Capability: Frame-rate targets: flame rendering at 120 FPS on 120 Hz devices with no quality-reduction fallback, UI at 60 FPS, no regression during flame switching.
- Capability: Short getting-started handbook page in docs.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
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
- Cloud sync, user accounts, login, or multi-device backup
- Social features such as sharing, friends, leaderboards, or multiplayer
- Server-side backend, REST APIs, or remote databases
- Analytics dashboards, charts, or streak counters as the primary view
- Push notifications or background scheduling of reminders
- Pomodoro or time-tracking timers
- Payments, in-app purchases, or subscriptions
- Web-only DOM/CSS pages or web browser deployment targets
- Calendar integrations with Google Calendar or Outlook
- Ability to hide the score-to-fire logic behind networked AI coaching or recommendations
- Per-day calendar views for future months or paging into future dates
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

<!-- gardener-generated: 01839460b7 0ff06a4676 10f7f7eef9 1957c53ae2 1dc51299a3 1f97a1abbb 2f30d85130 32cd5c5eb3 3cd74a368e 558911891c 5603c79e89 56617a09d7 574e7ecce0 5d0dd34bcd 65274d62a1 6e2fee9141 6f15121903 7664714e18 77838b99d1 7afd14a0df 81098dd511 82ba1a1306 8de7973ea3 907e673d79 916b4872a0 9373910d3c 9805d5e3c7 99e00c0bf6 9ccbb2f5fc a0b6ab7c06 a57af9e141 adb0fdec0b af34f4f3a4 b9e8db27f5 cb19b46d2a e47eb31cc3 e8b73406e2 f3fd0cd525 f80201ea6e f976b8200a -->

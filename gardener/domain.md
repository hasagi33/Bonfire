<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile UI and animation (Expo, React Native, Skia, Reanimated)`.
- In-domain: `local on-device persistence`.
- In-domain: `calendar and daily logging`.
- Capability: Record one integer productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear a previously assigned score for any past or current day, which marks the day missed.
- Capability: Recompute fire strength as the cumulative sum of per-day contributions over the current alive run.
- Capability: Allow a single missed past day without extinguishing the fire.
- Capability: Extinguish the fire after two consecutive missed past days and reset its strength to zero.
- Capability: Relight an extinguished fire with any score from 1 to 5, with a score of 1 relighting at strength 0.
- Capability: Render an animated bonfire flame whose size reflects accumulated strength, with a soft cap on on-screen size.
- Capability: Show charred logs and a thin smoke wisp, with no flame or embers, when the fire is out.
- Capability: Show a swipe-up calendar bottom sheet over the fire, hidden by swipe-down, opened by a full-screen upward swipe on the closed view.
- Capability: Page the calendar backward through any number of past months, with no navigation into future months.
- Capability: Log, score, edit, and clear days from the calendar sheet using a 1-5 heat-colored picker with Clear.
- Capability: Store short per-day notes that do not affect score or fire logic.
- Capability: Derive Fire Health (Faint, Steady, Bright, Radiant) from recent score quality as a visual-only indicator.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Unlock streak-specific flame styles that stay unlocked only while the current alive run meets their condition and relock when the fire goes out.
- Capability: Unlock time-specific flame styles from a completion day D within a window W, available through D+W inclusive while the fire is lit, with days remaining shown.
- Capability: Keep time-flame windows from banking days across completions, and never shorten an in-window availability on re-completion.
- Capability: Maintain a flame catalog in which each flame maps to one achievement, with Amber always unlocked as the free default.
- Capability: Show a flame gallery from the settings gear listing every flame's status, name, colors, requirement, and live progress or days remaining.
- Capability: Equip any flame, including locked previews, which render in a dimmed, desaturated embered variant until earned.
- Capability: Show brief in-app feedback when a flame newly unlocks, without push notifications.
- Capability: Recompute all unlock states and update the gallery and fire on any score add, change, or clear, without an app restart.
- Capability: Offer a settings gear with flame-style selection in place of the earlier simple flame color picker.
- Capability: Migrate the v1 flameColor setting to the v2 flameStyle key, defaulting to amber on missing or corrupt data without throwing.
- Capability: Persist scores, notes, and the selected flame across app restarts using AsyncStorage.
- Capability: Show a loading placeholder until saved scores and settings finish loading, without discarding scores entered during loading.
- Capability: Render flames, embers, glows, and effects with React Native Skia, and drive frame timing, gestures, and sheet animation with Reanimated and Gesture Handler.
- Capability: Derive fire state, achievements, and health deterministically from stored score history.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `gamification / achievements`.
- In-domain: `GPU-rendered 2D graphics and animation`.
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

- Push notifications or reminders
- Cloud sync, accounts, or multi-device sharing
- Multi-user, social, or leaderboard features
- Task lists, to-do management, or project tracking
- Charts, analytics dashboards, or statistical reports as the primary view
- Backend APIs or server-side data storage
- Time tracking or pomodoro timers
- Web or desktop deployment beyond the iOS and Android Expo targets
- Landscape or tablet-specific layouts
- Payments, purchases, or paid flame unlocks
- Generic code-review or token-saving tooling as product features
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage

<!-- gardener-generated: 06de00dfa2 072df1a7eb 0f105dd5df 12fd73538a 1ef41513ff 2252f006d8 28710f4910 2a2f3dffb2 2e91cb7969 2ffc6d653b 336fdfc9a3 3c70ff38a7 4647d3c4f7 48ba4bb462 49e82b04ef 4d596c7044 574e7ecce0 57e324edd8 5aeb710df1 64e0cb5cb8 6f15121903 7139c5a142 75a0f0de86 76037940e9 863ef44531 899e4f1a59 8a3093907a 8f30b1e028 98e3cbbd8e 9f73bd5a99 a6c094df5e a9be7dbc06 aa14c7efa0 ab858cd885 bebe9e5f4b cb1144c49b cc5d67828a d6414bb4d9 dbbec3d74b dc16a4e2ef dd4f91c042 de1b07af74 e2866dffa1 ec44e6d40b fc1cf6aeee -->

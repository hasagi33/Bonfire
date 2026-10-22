<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `personal productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `offline-first local persistence`.
- In-domain: `gesture-driven UI`.
- In-domain: `GPU-rendered 2D graphics and animation`.
- In-domain: `habit and streak tracking`.
- Capability: Assign each calendar day a personal productivity score from 1 to 5, or clear it.
- Capability: Compute fire strength as the cumulative sum of per-day contributions (score 1 adds 0; scores 2-5 add strictly increasing amounts).
- Capability: Apply the streak rule: one missed past day keeps the fire lit, two consecutive missed past days extinguish it fully, and any new score relights it.
- Capability: Render unlit, lit, and out fire states, with out showing grey logs, smoke, and no flame or embers.
- Capability: Render an animated full-screen flame with embers, hearth logs with coals, and a caption derived from the fire label.
- Capability: Show a visual-only fire health tier (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Provide a swipe-up bottom-sheet calendar, hidden by default, with a month grid, heat-ramp day cells, and an inline 1-5 score picker with Clear.
- Capability: Page backward through any number of past months while blocking navigation into future months.
- Capability: Backfill, change, or clear scores for any past or current day, with the fire and unlock states recomputed from the full history.
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Define a catalog of collectible flame styles, with Amber always unlocked and other styles (e.g. Crimson, Sapphire) achievement-locked.
- Capability: Classify achievements as streak-specific (unlocked while the current run meets a condition) or time-specific (unlocked within a window D through D+W while the fire is lit).
- Capability: Relock non-Amber flames when the fire goes out, and re-earn them indefinitely without banking days.
- Capability: Show a flame gallery from settings listing each flame's status, name, colors, required achievement, and live progress or days remaining.
- Capability: Let users equip any flame, including locked ones; locked equipped flames render a dim, desaturated embered variant that bursts to full when earned.
- Capability: Give brief in-app feedback when a flame newly unlocks (no push notifications).
- Capability: Recolor the flame immediately when the equipped style changes.
- Capability: Persist scores, notes, and the active flame style on-device via AsyncStorage, fully offline, with migration of the legacy flameColor setting.
- Capability: Show a loading placeholder until stored scores and settings load.
- Capability: Keep fire and achievement state deterministic and order-independent, recomputed from stored history.
- Capability: Handle gestures for the calendar sheet (swipe up to open, swipe down to close) while plain taps on the settings gear and day cells still resolve as taps.
- Capability: Enforce touch-target sizing for the settings gear (at least 44pt, 52x52 pt).
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `gamification / achievements`.
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

- Task or to-do list management
- Cloud sync, user accounts, or multi-device backend storage
- Social features such as sharing, friends, or leaderboards
- Push notifications or reminders
- Analytics dashboards, charts, or streak counters as the primary view
- Payments, in-app purchases, or monetized flame unlocks
- Calendar event scheduling or integration with external calendars
- Team or collaborative productivity features
- Time tracking or pomodoro timers
- Web or desktop-specific layouts beyond the mobile app
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage

<!-- gardener-generated: 0321faf0ba 0c3039f987 19356ff819 1a0d560b39 1a4aa6a80b 25e0af342d 2685fa9b91 3b84910611 4bb7cab861 4dbd4b429a 574e7ecce0 57e324edd8 66343e8df5 7c945ea9a9 7f29283ec2 83590d5385 8a3093907a 8b7ef19d26 8deee21a08 8f30b1e028 8f5e71d5bc 91d8dc8c5c 9effed60c3 9f01812479 a4f39a3979 a5fdd3b027 a83b520bc0 aa14c7efa0 ad7e5670d6 adb0fdec0b be8004696b c1a1f2e8bb c781079f20 c7f8471b3b c9c6e15cbb cbbd04f4e7 de17ebb7bc f2bd5ec7ec fa31a5b92a fbab61067c ffd73a657f -->

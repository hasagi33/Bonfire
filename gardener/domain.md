<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `productivity tracking`.
- In-domain: `gamification`.
- In-domain: `habit/streak tracking`.
- In-domain: `local-first data persistence`.
- In-domain: `2D/GPU visual rendering`.
- In-domain: `gesture-driven UI`.
- Capability: Log one integer productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear a previously assigned score for any past or current day.
- Capability: Map scores to fire contributions where a score of 1 adds 0 and scores 2 to 5 are strictly increasing.
- Capability: Compute fire size as the cumulative sum of per-day contributions while lit, recomputed deterministically from the full calendar.
- Capability: Allow one missed day without extinguishing the fire; extinguish after two consecutive missed past days.
- Capability: Relight an extinguished fire on any logged score, and reset fully to zero when it goes out.
- Capability: Render out-state visuals (charred logs, thin smoke wisp, no flame or embers) until relit.
- Capability: Animated bonfire rendering with React Native Skia and Reanimated frame timing.
- Capability: Swipe-up calendar sheet (full-screen upward swipe) to reveal, and swipe-down to hide, a month-focused calendar.
- Capability: Page backward through any number of past months, with no navigation into future months.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Settings button in the top-right corner for flame selection and settings access.
- Capability: Achievement engine classifying achievements as streak-specific or time-specific, with harder achievements mapping to more exotic flames.
- Capability: Catalog of flame styles (base Amber always unlocked; streak flames such as Crimson, Sapphire, Sodium, Strontium, Emerald, Lilac, Magenta, Ghostlight; time flames such as Toxic, Wisp, Ember, Spectral, Frostfire, Conflagration, Solfire, Voidfire, Aurora, Phoenix, Nebula).
- Capability: Streak flame unlock that holds only while the current alive run satisfies the condition, relocking on fire-out or a breaking edit.
- Capability: Time flame unlock tied to an achievement day with a D through D+W inclusive window, resetting on re-completion without banking days.
- Capability: Flame gallery grouped by tier, showing unlocked and locked flames with colors, requirements, live progress, and re-earn hints.
- Capability: Equip any flame including locked ones; locked equipped flames render as dim embered variants and become full vibrancy automatically when earned.
- Capability: Brief in-app unlock feedback when a flame newly unlocks, without persisting it.
- Capability: Visual-only Fire Health indicator (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Scene atmosphere adapted from local time without continuous JS timers.
- Capability: Local persistence of scores, notes, and the selected flame via AsyncStorage across app sessions.
- Capability: Loading placeholder shown until saved entries and settings load, avoiding an unlit-fire flash.
- Capability: Deterministic, order-independent recomputation of fire and unlock state from stored history.
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

- Cloud sync, user accounts, or multi-device synchronization
- Backend API or server-side data storage
- Push notifications or reminder scheduling
- Task management, to-do lists, or project tracking
- Charts, analytics dashboards, or detailed statistics views
- Social features such as sharing, leaderboards, or friends
- Payments, in-app purchases, or premium flame sales
- Multi-user collaboration or team bonfires
- Hourly or minute-based productivity timers or Pomodoro sessions
- Web deployment or desktop-specific UI
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

<!-- gardener-generated: 037d6fcaf8 05961333c0 0b330a0588 0ce1fdbe0e 13cb422565 15b8a50abe 187154ab0b 1a4aa6a80b 1bfe3fd1fa 2c58fcac24 361cc78d6a 38133b21b5 393c0ce93c 3dda028bbd 40c57a78e4 4850bd1736 488aee7cbd 520793b8ee 574e7ecce0 67d11947bc 6e2902f239 6f15121903 71dd7968c2 7a44fd8ea6 7f29283ec2 878bb238ed 89956d508e 89b2b50e6f 8e008d6b9d 910ff477c8 a88f40935c a9d030ed83 abd549a6c3 b6615cfe6d bac331c3b2 bd29e59a85 c90c5bfa83 cdf60f337b d01609eac3 d4b27bfe59 e05cca4fd4 ed242bbbde -->

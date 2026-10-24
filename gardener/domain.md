<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `skia and animation-driven visual rendering`.
- In-domain: `local-first on-device storage`.
- In-domain: `calendar and journaling`.
- Capability: Score each day from 1 to 5 via a calendar, for today or any past day.
- Capability: Edit, change, or clear past day scores and backfill any past day across any number of months.
- Capability: Compute fire strength as the cumulative sum of per-day contributions (score 1 adds 0, score 5 adds 4) over the current alive run.
- Capability: Allow one missed past day without extinguishing the fire; two consecutive missed past days extinguish it and reset strength to zero.
- Capability: Relight an extinguished fire with any score; a score of 1 relights at strength 0 and counts the day as active.
- Capability: Soft-cap the on-screen flame size toward a maximum while underlying strength keeps increasing.
- Capability: Render an animated flame with caption; render charred logs and a dissipating smoke wisp with no flame or embers when the fire is out.
- Capability: Calendar sheet revealed by full-screen upward swipe and dismissed by downward swipe, with month navigation that can page back indefinitely but not into future months.
- Capability: Unlock collectible flame styles through run-based streak achievements and window-based time achievements (completion within D+W days), with the base Amber flame always unlocked.
- Capability: Flame gallery listing all flame styles with colors, requirement text, live progress, and days remaining for time flames; locked flames browsable but not equippable.
- Capability: Equip unlocked flames to recolor the bonfire immediately; locked equipped flames render an embered variant; selection persists across restarts.
- Capability: Render 20 flame visual profiles (shape, motion, particles, aura, accents, palette) via React Native Skia and Reanimated, including particle variants sparks, motes, ash, bubbles, shards, wisps, and stars.
- Capability: Derive glow and particle colors from the active flame's palette and update them on flame change.
- Capability: Calendar score buttons with a fixed white-to-red heat ramp and legible labels.
- Capability: Add optional short per-day personal notes after scoring, viewable and editable from day detail, persisted locally and not affecting score or fire logic.
- Capability: Show visual-only Fire Health (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Persist all scores, notes, and settings locally with AsyncStorage and show a loading placeholder until saved data loads.
- Capability: Choose flame color settings (Amber, Crimson, Sapphire) that persist on-device.
- Capability: Honor the OS reduced-motion setting by stopping flame, ember, and coal animation loops.
- Capability: Enforce a 44 pt minimum touch target for the settings gear and keep it above the full-screen swipe surface.
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

## Out-of-Domain Examples

- Task or to-do list management
- Charts, graphs, or streak counter dashboards as the primary view
- Cloud sync, user accounts, or multi-device data sharing
- Server-side backend or remote APIs for storing scores
- Social features such as sharing, leaderboards, or friends
- Push notifications or reminder scheduling
- Time tracking or pomodoro timers
- Web-only or desktop-only UI targets outside the Expo mobile app
- Purchases, paywalls, or monetization of flame styles
- Payment or subscription handling
- Generic code-review or token-saving tooling features
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage

<!-- gardener-generated: 01a4294a22 18bfdc132a 2bdc566d51 31ababb1ed 574e7ecce0 57e324edd8 58ead8ffef 615784aabe 673b658d1e 69d13d5646 6f15121903 7a57720663 7ffd71a323 89956d508e 89b2b50e6f 8a3093907a 8b38644705 8d9aecbf68 905ba54f96 9915849f22 9f29e37b8d a3e673a5a7 a529a33608 a5fdd3b027 aa14c7efa0 be7529734e bed6ba940b c6a067496b c795c20ed3 c7ba80035a c9117fca1e cb19b46d2a d2e8c0d8d6 d3054dcccd ddfd04135f e0536e8562 eed6509a39 f03a6b5096 f6d882f007 -->

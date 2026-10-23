<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app development`.
- In-domain: `React Native / Expo`.
- In-domain: `productivity tracking`.
- In-domain: `gamification via achievements`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `local-first on-device persistence`.
- In-domain: `gesture-driven UI`.
- Capability: Log one integer daily productivity score from 1 to 5 per calendar day, for today or any past day.
- Capability: Reject out-of-range scores and future-dated scores.
- Capability: Change or clear a previously assigned score on any past or current day, which recomputes the fire.
- Capability: Derive fire state deterministically from the full score history evaluated against the current date, independent of entry order.
- Capability: Convert scores into bonfire strength: a score of 1 keeps the fire alive without adding strength; scores 2-5 add strictly increasing strength with 5 adding the most.
- Capability: Relight an extinguished fire with any score, with a 1 relighting it at strength 0.
- Capability: Allow a single unscored past day without extinguishing the fire; two consecutive unscored past days extinguish it and reset strength to zero.
- Capability: Render flame on-screen size with a soft cap while underlying strength grows without limit.
- Capability: Render unlit/spark, lit, and gone-out fire states; gone-out shows charred logs and a dissipating smoke wisp with no flame or embers.
- Capability: Show a clean main view with only the flame and a top-right settings button, with the calendar hidden by default.
- Capability: Reveal and hide a swipe-up/swipe-down calendar sheet, with the flame lifting and dimming as it opens.
- Capability: Month-focused calendar that pages back through any number of past months but not into the future, marking scored and missed days.
- Capability: Add, edit, clear, and review scores through the calendar; supports short per-day notes that do not affect score or fire logic.
- Capability: Show a loading placeholder on cold start until saved data loads, without discarding scores entered during loading.
- Capability: Persist scores, notes, selected flame, and settings on-device via AsyncStorage across app restarts; fully offline with no runtime network calls.
- Capability: Maintain a catalog of flame styles, each tied to one achievement, with Amber always free and unlocked by default and the rest achievement-locked.
- Capability: Unlock streak-specific achievements that remain satisfied only while the current lit run meets their condition, and time-specific achievements that stay unlocked for a window of days from their completion day.
- Capability: Show a flame gallery from settings listing all flames with unlocked or locked status, requirements, live progress, and time-remaining or re-earn guidance.
- Capability: Allow equipping any flame; locked equipped flames render as a dimmed, desaturated embered variant that returns to full vibrancy when earned.
- Capability: Recompute all unlock states on any score change and update gallery and fire without restart; all flames re-earnable indefinitely.
- Capability: Persist the active flame selection across restarts.
- Capability: Render flame profiles with React Native Skia and animate them with React Native Reanimated, including shape, motion, particles, aura, and accents per flame.
- Capability: Provide data-driven visual profiles for each of the 20 flame styles (Amber through Nebula) matching BonfireDesign silhouettes, motion families, particle variants, and core-scale intent, without changing unlock or fire math.
- Capability: Display visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Support swipe-up calendar gesture via React Native Gesture Handler while keeping other taps such as the settings button working.
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
- Charts, graphs, or analytics dashboards as primary views
- Cloud sync, user accounts, or server-side storage
- Social features such as sharing, friends, or leaderboards
- Network-dependent features such as remote APIs or online flame catalogs
- Push notifications or reminders
- Multi-user or team productivity tracking
- Time tracking or pomodoro timers
- Web or desktop browser deployment targets beyond the Expo mobile app
- Purchasing or monetization of flame styles
- Settings beyond flame selection and the documented flame-related options
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage

<!-- gardener-generated: 1571aca76d 19192d617b 288cd40562 328c104e4c 353c483b15 3716a3b9ac 3c4279c2b4 42cefdb760 4647663d40 486a38310c 48cd1349f7 4cf15718e8 574e7ecce0 5ac6353e16 675329d596 69e6790747 6a9bbf6c11 6ed5aab653 6f15121903 75a49f77f7 77fa18a451 786b26033d 7d82504b37 7f29283ec2 83590d5385 8a3093907a 8b9eeb30b4 8f30b1e028 9086281f13 9a6f3994a3 a5fdd3b027 a93819255b aa14c7efa0 b7833e084f c23715ab5a cb066d2242 cf60feed2b d1b78c7817 d21b0a138f d3fa3b6863 f179a581cf f592ec382f fa1440959a fa23beeba2 fd871a92c8 -->

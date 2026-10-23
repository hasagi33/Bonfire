<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `productivity tracking`.
- In-domain: `habit/streak tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `GPU-rendered animation (Skia/Reanimated)`.
- In-domain: `local-first on-device persistence`.
- In-domain: `calendar UI`.
- In-domain: `cross-platform React Native`.
- Capability: Record one integer productivity score from 1 to 5 per calendar day, at most one per date.
- Capability: Reject scores for future dates and non-integer or out-of-range scores.
- Capability: Add, change, or clear scores for any past day or today.
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current lit run (score 1 adds 0, scores 2-5 add increasing amounts).
- Capability: Allow one unscored past day without extinguishing the fire; two consecutive missed past days extinguish it and reset strength to zero.
- Capability: Relight an extinguished fire with any score, with a score of 1 relighting at strength 0.
- Capability: Derive fire state deterministically from the full score calendar and today's date, independent of entry order; never store fire state itself.
- Capability: Soft-cap the visual flame size while the underlying strength keeps increasing.
- Capability: Render a lit flame with react-native-skia (blur, gradients, screen blend, glow) and emitting rising embers/sparks that may scale with strength.
- Capability: Render unlit spark, lit-at-various-sizes, and gone-out states; gone-out shows only charred logs and a dissipating smoke wisp.
- Capability: Drive flame animation on the UI thread via Reanimated with a target of 120 FPS and full visual fidelity.
- Capability: Show a loading placeholder until saved scores and settings finish loading; avoid premature unlit state and keep scores entered during load.
- Capability: Persist all scores and settings locally with AsyncStorage across app sessions with no data loss.
- Capability: Run fully offline with no runtime network calls.
- Capability: Main view showing only the flame and a settings button by default, with calendar hidden.
- Capability: Full-screen upward swipe (Reanimated/Gesture Handler) reveals the calendar bottom sheet; downward swipe hides it, with flame lifting and dimming as the sheet opens.
- Capability: Month-focused calendar that pages back through any number of past months and cannot page into future months.
- Capability: Calendar day cells colored by raw score on a heat ramp, showing missed, today, and future states, with an inline 1-5 score picker.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Settings to choose flame color from Amber (default), Crimson, and Sapphire, with immediate recolor and persistence.
- Capability: Achievement catalog of collectible flame styles, each tied to exactly one achievement, with Amber always unlocked.
- Capability: Streak-specific achievements unlocked exactly while the current lit run satisfies the condition and relocked when the fire goes out or an edit breaks it.
- Capability: Time-specific achievements tied to an achievement day and a window of days/weeks measured from calendar completion, expiring after the window and resetting on re-completion without banking days.
- Capability: Relock all non-Amber flames when the fire goes out; restore time flames still within their window on relight.
- Capability: Flame gallery grouped by tier showing unlock state, live progress, requirements, and equip actions.
- Capability: Embered (dim, desaturated) rendering of an equipped flame when its achievement is no longer satisfied while the fire is lit.
- Capability: Positive-only achievement guardrails: no rewards for keeping scores low, averages below thresholds, lowering scores, or avoiding high scores, and no requirement to break or reset a streak.
- Capability: Visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Scene atmosphere adapted from local time without continuous JS timers.
- Capability: Spec-driven development workflow with spec kit skills for specify, clarify, checklist, constitution, implement, and agent context updates.
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

- Task management, to-do lists, or task scheduling
- Charts, graphs, or analytics dashboards beyond the calendar and fire visuals
- User accounts, authentication, or cloud sync of scores
- Backend API, server-side storage, or multi-user/social features
- Leaderboards, friend comparisons, or sharing to social networks
- Push notifications or reminder scheduling
- Pomodoro or time-tracking timers
- Payments, purchases, or in-app store for flames
- Rewarding low scores or streak-breaking behavior
- Editing non-productivity data such as expenses or health metrics beyond the fire health visual
- Web (browser) deployment or desktop-specific UI
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

<!-- gardener-generated: 02dca2a700 039b5ef4b7 14b15c31a6 1a4aa6a80b 1c3d8799a5 1f78b8fd96 202c886f03 253c5d8261 361cc78d6a 3aa74818e1 3ade36efac 3dda028bbd 4007d78c07 474e4e5e0a 53f41319b0 55d8cac061 56aeb7204f 574e7ecce0 57e324edd8 5d0dd34bcd 63a38a2e97 6e89a4aed3 6f15121903 73ad4f0e6b 85f5d815b5 8769165e43 8843d43c17 89b2b50e6f 98d38ac1d1 9c4fa98975 9e05f4cd2e 9f1cff91e9 a47613c94e a93819255b aa193210c4 b2df17a071 b3d471758a b97157bd08 bac331c3b2 ca764b7b17 ce5445b43d d2680adb6d d4b95e37d9 dc5862bb4d e068a592a8 e3d4d595ce e5cbb9d86b e72495cc92 e74f7c1010 ee1413bc94 -->

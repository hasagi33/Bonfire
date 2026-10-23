<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `daily habit/streak tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile UI (React Native / Expo)`.
- In-domain: `GPU-rendered animation and visual effects`.
- In-domain: `local on-device persistence`.
- In-domain: `calendar review and editing`.
- Capability: Record one integer productivity score from 1 to 5 per calendar day, with at most one entry per date.
- Capability: Reject scores for future dates and reject non-integer or out-of-range scores.
- Capability: Add, change, or clear scores for any past day, including backfilling.
- Capability: Compute fire strength as the cumulative sum of per-day contributions in the current lit run (score 1 adds 0; scores 2-5 add increasing amounts, with 5 adding the most).
- Capability: Keep the fire alive across a single missed past day and extinguish it after two consecutive missed past days, resetting strength to zero.
- Capability: Relight an extinguished fire from zero with any score from 1 to 5.
- Capability: Derive fire state (unlit/spark, lit at varying sizes, gone-out) deterministically from the full score calendar and today's date, without storing the fire state itself.
- Capability: Soft-cap the visual flame size toward a maximum while the underlying strength keeps increasing.
- Capability: Render the flame with react-native-skia at full visual fidelity (blur, gradients, screen blend, glow), driven by Reanimated on the UI thread.
- Capability: Emit rising embers/sparks while the fire is lit, with amount optionally scaling with strength.
- Capability: Show only charred logs and a dissipating smoke wisp when the fire is out, with no flame or embers until relit.
- Capability: Show a loading placeholder until saved scores and settings finish loading, and avoid premature unlit states or discarded early input.
- Capability: Persist all scores, selected flame, and per-day notes locally with AsyncStorage across app sessions.
- Capability: Provide a swipe-up bottom-sheet calendar (react-native-gesture-handler) that is hidden by default and dismissed by swipe-down.
- Capability: Month-focused calendar that pages back through any number of past months and cannot page into future months.
- Capability: Color calendar day cells from raw score using a heat ramp, with missed, today, and future states and an inline 1-5 score picker.
- Capability: Indicate scored and missed days on the calendar.
- Capability: Allow short per-day notes that do not affect score or fire logic.
- Capability: Choose a flame color from Amber (default), Crimson, or Sapphire in settings, with immediate recoloring and persistence.
- Capability: Maintain a catalog of collectible flame styles, each tied to exactly one achievement, with Amber always unlocked.
- Capability: Classify achievements as streak-specific (unlocked while the current lit run satisfies the condition) or time-specific (unlocked for a window of days measured from the achievement day).
- Capability: Expire time-specific flames when their window elapses, and relock all non-Amber flames when the fire goes out.
- Capability: Show a flame gallery grouped by tier with unlock state, live progress, and equip actions; locked flames display their name, colors, and required achievement.
- Capability: Render an embered (dim, desaturated) variant of an equipped flame when its achievement is no longer satisfied while the fire is lit.
- Capability: Compute visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) from recent score quality.
- Capability: Adapt scene atmosphere from local time using Reanimated without continuous JS timers.
- Capability: Use a framework-free domain layer for fire, streak, and achievement rules, testable separately from UI.
- Capability: Run fully offline with no network calls at runtime; design files serve only as a build-time reference.
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
- Capability: Adapt scene atmosphere from local time without continuous JS timers.

## Out-of-Domain Examples

- Task or to-do list management
- Server-side API, backend services, or cloud sync
- User accounts, authentication, or social/leaderboard features
- Multi-user sharing or team productivity dashboards
- Charts, analytics, or statistics dashboards beyond the calendar and fire state
- Paid store, in-app purchases, or ad integrations
- Rewards that incentivize lowering scores, keeping averages low, or deliberately breaking a streak
- Pomodoro timers or time-tracking of work sessions
- Web-only or desktop-only UI targets
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

<!-- gardener-generated: 06d4a479b9 087add8461 08de2ddba6 103364254b 1d53a4f1d7 1da5724498 1f78b8fd96 2e997abc05 40aa18288a 4cf3545f1c 4e9939bb58 551ec15aee 574e7ecce0 57e324edd8 5eb04f492c 6b156e3018 6f15121903 7139c5a142 728cd0b8d6 74c4fe7338 7ec208a250 8cd9b0148d 8d102adce6 90a708aa55 91adfbf225 97affecc7b 9a7e2ce4d0 a5fdd3b027 b3a3dae575 b661617791 ba77c82ca3 baf2921cfe c1b29fead4 c2933f1626 c4bd490440 c69de0b331 cccaea7e31 ccd4b1ec4b d0b8c78ae8 d68faa103c db8870b679 e6842ea6f4 edae1656b7 f650258e70 f68ae4ac28 -->

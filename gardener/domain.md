<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app development`.
- In-domain: `React Native / Expo`.
- In-domain: `personal productivity tracking`.
- In-domain: `gamified habit tracking`.
- In-domain: `GPU graphics and animation (Skia, Reanimated)`.
- In-domain: `on-device local storage`.
- Capability: Score each local calendar day with an integer 1-5, rejecting future dates.
- Capability: Assign, change, clear, and backfill scores for any past or current day.
- Capability: Compute fire strength as a cumulative sum of per-day contributions over the current alive run (score 1 adds 0; scores 2-5 add strictly increasing amounts).
- Capability: Keep the fire lit through a single missed past day and extinguish it fully after two consecutive missed past days; today being unscored is not a miss.
- Capability: Relight an extinguished fire from zero with any score 1-5.
- Capability: Render the flame with React Native Skia: tongue shapes with gradients, blurred glow, halo, ground glow, embers whose spawn rate scales with intensity.
- Capability: Soft-cap flame display size while the underlying strength keeps increasing.
- Capability: Show only charred logs and a smoke wisp when the fire is out.
- Capability: Show a loading placeholder on cold start until saved scores and settings load.
- Capability: Swipe-up calendar sheet (hidden by default, revealed by upward swipe, closed by downward swipe) using React Native Gesture Handler and Reanimated.
- Capability: Month-focused calendar paging backward without limit and forward only to the current month.
- Capability: Score buttons and day cells using a white-to-red heat ramp.
- Capability: Per-day short notes that do not affect score or fire logic.
- Capability: Visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Collectible flame styles (catalog with Amber as the free default; others achievement-locked) with a flame gallery grouped by tier.
- Capability: Streak-specific achievements that unlock while the current run satisfies a condition and void when the fire goes out.
- Capability: Time-specific achievements that unlock for a window of days from the completion day, gated on the fire being lit, with re-completion resetting the window without banking.
- Capability: Embered dim/desaturated rendering of locked active flames (Amber never embered).
- Capability: Equipping any unlocked flame; rejecting taps on locked flames with a brief cue.
- Capability: Palette-derived glow, halo, ground pool, hearth wash, and particle colors per active flame.
- Capability: Persist scores, notes, active flame selection, and settings locally via AsyncStorage with v1-to-v2 settings migration and fallback to defaults on corrupt values.
- Capability: Deterministically recompute fire state, achievements, and health from stored history.
- Capability: Fully offline operation with no network calls and no accounts or multi-device sync.
- Capability: 44 pt minimum touch targets for the settings gear (52x52 pt).
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

- Task lists, to-do items, or task management
- Charts, graphs, or analytics dashboards as primary views
- User accounts, authentication, or cloud sync across devices
- Multi-user social features, leaderboards, or sharing
- Network-backed APIs or server-side storage of scores
- Push notifications or reminder scheduling
- Time tracking or pomodoro timers
- Payments, in-app purchases, or subscriptions for flames
- Scores on a scale other than integers 1-5
- Editing or scoring future dates
- Continuous background JS timers driving animation state
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage

<!-- gardener-generated: 044d8c1d7d 07e96656e9 084fda5b1c 0ce6aec5a8 11fab8624d 125dfa97b5 14b15c31a6 1bb1d96004 2dad1b950a 3716a3b9ac 400a665043 42b266a4c3 4647663d40 4c052a8cee 4dbd4b429a 4dd616f5bf 5658f4f57c 574e7ecce0 67bf9c1154 7f5a4ec40e 89b2b50e6f 8a3093907a 8b20f3de0c 92c7c4f101 92dafb9a19 96c6e1321c 9ac311fd41 a132771972 a31b93ece9 a7ff4bb28c a836b7fb1a aa14c7efa0 af2fd44b57 c51d70be68 c5b0517fc9 c80381395b cc7ab791cc cd7d8460fd d06dd39926 d9f7498e0d df3a905143 e9c7fd418c fa23beeba2 -->

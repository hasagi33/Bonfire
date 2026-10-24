<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `productivity tracking`.
- In-domain: `gamification / habit tracking`.
- In-domain: `data visualization of streaks`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `offline-first local storage`.
- Capability: Log an integer productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear previously assigned scores for past or current days.
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current alive run, with a score of 1 keeping a lit fire at the same size and 2-5 growing it.
- Capability: Allow one missed past day without extinguishing the fire; two consecutive missed days extinguish it.
- Capability: Reset fire to zero when extinguished and relight it from zero with any score 1-5.
- Capability: Soft-cap flame display size toward a maximum while the underlying strength value keeps increasing.
- Capability: Render an animated flame with embers, hearth, glows, and caption using React Native Skia and Reanimated.
- Capability: Show a clean flame-only main view with a charred-log and smoke-wisp state when the fire is out.
- Capability: Swipe-up bottom sheet month calendar with heat-ramp day cells, missed/today/future states, and inline 1-5 score picker.
- Capability: Page backward through unlimited past months, never into future months.
- Capability: Distinct fixed colors for score buttons 1 through 5 with legible labels and selected state.
- Capability: Swipe-down dismissal of the calendar and swipe-up opening from the main screen without breaking taps.
- Capability: Optional short per-day notes that do not affect score or fire logic.
- Capability: Unlock collectible flame styles via streak-based achievements (recomputed from the current alive run) and time-window achievements (window of days from completion, restarted on re-completion, not banked).
- Capability: Flame gallery grouped by tier showing unlock requirements, live progress, time-window countdowns, and re-earn prompts.
- Capability: Equip any flame, including locked ones, which render as a dim desaturated embered variant until earned; Amber always unlocked as default.
- Capability: Reject taps on locked flames with a brief visible cue and no dialog.
- Capability: Select flame color/theme (Amber, Crimson, Sapphire and other catalog flames) from a top-right settings button, applied immediately and persisted.
- Capability: Per-flame visual profiles covering shape, motion, particles, aura, accents, palette, and strength response for all 20 flame ids, with glow and particle colors derived from the active flame's palette.
- Capability: Derive fire health (Faint, Steady, Bright, Radiant) visually from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Persist scores, notes, settings, and selected flame on-device via AsyncStorage; work fully offline.
- Capability: Deterministic derivation of fire state, achievements, and health from stored history, recomputed on every change and not stored.
- Capability: Loading placeholder on cold start until saved data loads, avoiding unlit flash or overwritten taps.
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

## Out-of-Domain Examples

- Multi-user accounts, login, or cloud sync of scores
- Social features such as friends, leaderboards, or sharing streaks
- Task lists, to-do items, or project management
- Charts or analytics dashboards as a primary view
- Push notifications or reminder scheduling
- Server-side backend APIs or remote databases
- Payments, in-app purchases, or subscriptions
- Calorie, fitness, or health-metric tracking beyond visual fire health
- Web-only pages, desktop UI, or non-Expo native modules unrelated to rendering and storage
- Automatic productivity detection from device or app usage data
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 05ffcd2fdc 1310327ee7 1319715a4e 19eb4e295b 1a4aa6a80b 202601cd58 2861a647ff 2911bc5f7a 2cee807a0a 357cf6bc1e 35c2cd3b6b 3674e2a196 3742644850 3b97f88baa 3c4279c2b4 4264c8c855 44c456552b 574e7ecce0 5d1ce6b868 67611575e6 6f15121903 7f0e7cba2b 89b2b50e6f 8a3093907a 9ca570e9fb 9fbad24492 a0e76c771a a429b92a69 a945fbddcc ad1b74ce0f ae11fffbfb baf3f6ef4e c2e737dc09 c3912ea812 c71b9b2682 c916229404 d4c37dfe75 dc51ab59ea ef97bad04b f3fd0cd525 fb0ca4231c -->

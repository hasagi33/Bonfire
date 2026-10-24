<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `habit/streak gamification`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `GPU-rendered animation and visual effects`.
- In-domain: `local-first on-device data persistence`.
- In-domain: `calendar and journaling`.
- Capability: Log a daily productivity score from 1 to 5 for today and any past day.
- Capability: Backfill or change scores for past days, with the fire recomputed from the full calendar.
- Capability: Convert cumulative per-day scores into bonfire strength over the current alive run, with on-screen size soft-capped.
- Capability: Allow one missed past day; two consecutive missed past days extinguish the fire and reset it to zero; any score relights it.
- Capability: Render an out state with charred logs and a thin smoke wisp.
- Capability: Animated flame rendering via React Native Skia and Reanimated, with GPU effects for flame, embers, and glows.
- Capability: Choose flame color (Amber, Crimson, Sapphire) from settings, persisted across restarts, defaulting to Amber.
- Capability: Collectible flame styles (20 flame profiles) matching BonfireDesign profiles, with order, names, rarity grouping, and palette intent preserved.
- Capability: Unlock flame styles via streak-based and time-based achievements; time-window achievements expire and restart on re-completion.
- Capability: Show locked flames in a gallery as embered previews that are non-selectable until earned.
- Capability: Flame gallery reached from settings listing unlock status, colors, required achievement, and progress or days remaining.
- Capability: Brief in-app feedback when a flame newly unlocks.
- Capability: Calendar sheet revealed by swipe-up gesture and hidden by swipe-down, with month-focused paging backward only, capped at current month.
- Capability: Day-cell, score-button, and clear interactions coexisting with swipe gestures via React Native Gesture Handler.
- Capability: Settings gear (top-right) opening flame selection and flame gallery.
- Capability: Optional short per-day personal notes, viewable and editable in day detail, persisted, not affecting score or fire logic.
- Capability: Fixed score heat-ramp colors by score value (1 white through 5 red).
- Capability: Visual-only Fire Health indicator from recent score quality: Faint, Steady, Bright, or Radiant.
- Capability: Time-of-day atmosphere (day, dusk, night, with smooth transitions) and subtle seasonal variation for both hemispheres, without continuous JS timers.
- Capability: Loading placeholder on cold start until scores and settings load.
- Capability: Fully offline, local-only persistence of date-to-score map, notes, and active flame selection via AsyncStorage.
- Capability: Deterministic recomputation of fire state, achievements, and health from stored history.
- Capability: 120 FPS rendering target for flames, including multicolor styles and during flame switching.
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

- Task or to-do list management
- Cloud sync, user accounts, or multi-device sharing
- Server-side backend or remote APIs
- Charts, streak counters, or analytics dashboards as primary UI
- Push notifications or reminder scheduling
- Social features, leaderboards, or sharing to other users
- In-app purchases or monetization of flames
- Pomodoro or time tracking timers
- Calendar integration with external calendars (Google, iCloud)
- Rich-text or multimedia note attachments
- Web or desktop targets beyond the Expo mobile app
- Continuous JS-timer-driven animation loops for atmosphere
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

<!-- gardener-generated: 01a4294a22 0371a1148a 0577a4c1ad 0680dfa9f3 103364254b 114276e3e6 15683183ef 275c4b9297 2b683e6aff 33513c2073 4319462fb2 574e7ecce0 585e9ab5ba 697ea8770a 6c9742e404 6f15121903 6fecfbb24e 7c84b11347 89b2b50e6f 8ab55617b0 8bdf93659f 8e8fcd30f5 8f453726fd 908d195fde 94f2d178d1 951fdb5bb6 a5fdd3b027 a668064a2f b7b8865a5d c47bedf21d cb19b46d2a d744064fe5 dac4811003 de660d76e1 df3742e9e2 e2620ea370 ed6a5b0b8c f159142bbb f85344ab95 f8aafe7d81 facc1018f9 fe05622a93 -->

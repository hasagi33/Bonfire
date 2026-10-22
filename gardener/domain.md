<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `personal productivity tracking`.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `gamification and achievements`.
- In-domain: `offline-first local data persistence`.
- In-domain: `GPU-rendered 2D animation and visual effects (Skia, Reanimated)`.
- In-domain: `calendar and day-level score editing`.
- In-domain: `gesture-driven UI (swipe-up sheet)`.
- Capability: Log an integer productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear a previously assigned score for any past or current day.
- Capability: Convert scores into fire strength as a cumulative sum of per-day contributions (1→+0, 2→+1, 3→+2, 4→+3, 5→+4) over the current alive run.
- Capability: Allow one missed past day without extinguishing; two consecutive missed past days extinguish the fire; an unscored today is not a miss.
- Capability: Relight an extinguished fire as a fresh run from 0 on any new score 1-5.
- Capability: Render a single-screen animated bonfire whose on-screen size soft-caps while underlying strength grows without limit.
- Capability: Show charred logs and a thin smoke wisp with no flame or embers when the fire is out.
- Capability: Emit rising flame particles while the fire is lit, with intensity possibly scaling with strength.
- Capability: Swipe-up full-screen calendar sheet (opened by upward swipe, closed by downward pan) with a settings gear that remains tappable.
- Capability: Month-focused calendar that pages backward through any number of past months (no future months) and visually marks scored and missed days.
- Capability: Short per-day notes that do not affect score or fire logic (README).
- Capability: Choose flame color from Amber, Crimson, or Sapphire via settings, defaulting to Amber, with the choice applied immediately and persisted.
- Capability: Maintain a catalog of flame styles, each unlocked by exactly one achievement, with Amber always unlocked.
- Capability: Classify achievements as streak-specific (unlocked while the current alive run meets the condition) or time-specific (unlock on an achievement day, stay available within a window D through D+W while lit, then expire).
- Capability: Reset time-flame windows on re-completion without banking days; time flames completed only by an already-expired backfilled day stay locked.
- Capability: Render a locked active flame as a dim, desaturated embered variant that returns to full vibrancy automatically when earned.
- Capability: Flame gallery reached from settings listing every flame with name, colors, required achievement, unlock status, and live progress or days remaining.
- Capability: Reject taps on locked flames in the gallery with a visual cue and never equip or persist them.
- Capability: Brief in-app feedback when a flame newly unlocks (no push notifications, nothing persisted for the feedback itself).
- Capability: Re-earn flames indefinitely after loss.
- Capability: Visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality (README).
- Capability: Scene atmosphere adapting to local time of day without continuous JS timers (README).
- Capability: Palette-derived glow, halo, ground glow, and hearth wash driven by the active flame's colors.
- Capability: Shared score heat color ramp used by score buttons and calendar day cells, meeting 4.5:1 text contrast.
- Capability: Persist scores, flame color or selected flame id, and settings locally with AsyncStorage, including v1-to-v2 settings migration with fallback to Amber for invalid ids.
- Capability: Keep all past daily entries indefinitely with no automatic purge.
- Capability: Brief loading placeholder on cold start until saved entries load.
- Capability: Derive fire state, achievements, and health deterministically from stored history.
- Capability: Dev-only (__DEV__) control to advance the day for testing extinguish behavior.
- Capability: Fully offline operation with no runtime network calls.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `productivity tracking`.
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

- User accounts, login, or authentication
- Multi-device sync or cloud backup
- Server-side APIs, remote databases, or network-fetched content
- Push notifications or reminders
- Task or to-do list management
- Social sharing, leaderboards, or friend comparison
- Analytics, telemetry, or crash reporting services
- Payments, purchases, or in-app store for flames
- Time-tracking or pomodoro timers
- Charts, graphs, or streak counters as the primary view
- Future-dated score entry or calendar navigation beyond the current month
- Automatic purging or expiry of historical daily entries
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

<!-- gardener-generated: 06d1ff4e36 0e177d18ba 0fd2a6014d 12ff63ffa6 13da63fa4e 18228e92d9 19eb4e295b 253c5d8261 2749aee458 3062da40c8 36d0050202 3e5b009f11 474a6c0e4a 4dbd4b429a 55e6ce124b 574e7ecce0 57e324edd8 595275ae77 5ee797d634 617331c8b7 62714b5576 633ea86a20 6eb360c400 70f48e00ce 7be766baa0 7d0524a907 8177fa2321 89cbf64a19 8f30b1e028 94fe842899 96431182db 9d16908893 a2f83f9cef a5fdd3b027 aa266261ee ae95e06236 b282957d0f c4a3570282 c4a74f7758 c57772a09d cb7a530c0b d5787b80b9 dcef0a2a50 de556bc889 dec9c8a3b0 e09a94675c ed242bbbde edaa672c3c fc0efe674a fcf8c61051 -->

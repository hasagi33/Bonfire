<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app development`.
- In-domain: `React Native / Expo front-end`.
- In-domain: `GPU-rendered 2D graphics and animation`.
- In-domain: `gamified habit / productivity tracking`.
- In-domain: `local-first on-device persistence`.
- In-domain: `calendar and date-based data management`.
- In-domain: `achievement and unlock systems`.
- Capability: Log one integer productivity score from 1 to 5 per local date for today and past days, with one entry per date.
- Capability: Reject future-dated entries and out-of-range scores.
- Capability: Add, edit, change, or clear scores for any past or current day.
- Capability: Compute fire strength as a cumulative sum of per-day contributions (score 1 adds 0, 2 adds 1, 3 adds 2, 4 adds 3, 5 adds 4) over the current alive run.
- Capability: Tolerate a single missed past day; extinguish the fire fully after two consecutive missed past days; an unscored today is not a miss.
- Capability: Relight an extinguished fire from zero on any new score 1-5.
- Capability: Soft-cap the on-screen flame size while underlying strength keeps increasing.
- Capability: Render an out state with only charred logs and a faint smoke wisp, no flame or embers.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Swipe-up gesture on the closed main view opens a calendar sheet; swipe-down dismisses it, with the flame lifting and dimming as it opens; gear and day-cell taps are unaffected.
- Capability: Month-focused calendar that pages backward through any number of past months, capped at the current month going forward, marking scored and missed days.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Flame gallery grouped by tier showing every flame with name, colors, required achievement, unlocked/locked status, and live progress or days remaining.
- Capability: Catalog of 20 flame styles (one base flame, eight streak flames, eleven time flames), each tied to one achievement; Amber is the always-unlocked default.
- Capability: Streak-specific achievements that stay unlocked only while the current run satisfies the condition and relock when the fire goes out or an edit breaks it.
- Capability: Time-specific achievements that unlock on the achievement day and remain available for a window of W days while the fire is lit, then expire; re-completion resets the window without banking; backfilled completions whose window has elapsed grant nothing.
- Capability: Equip any flame, including locked ones; locked equipped flames render as a dim, desaturated embered variant, while Amber never embers.
- Capability: Full-style rendering of the active flame when unlocked, with per-flame glow, halo, ground pool, hearth warm wash, and ember particles recolored to the flame's palette.
- Capability: Locked-flame selection guard that rejects taps on locked flames with a brief cue and leaves them unequipped.
- Capability: Brief in-app feedback when flames unlock, without persisting that transition; no push notifications.
- Capability: Live recomputation of all unlock states, gallery, and fire on any day score change, without app restart.
- Capability: Persist the date-to-score map, notes, and active flame-style id locally with AsyncStorage across restarts; app works fully offline with no backend or network calls.
- Capability: Cold-start loading placeholder until scores and settings load; loaders never throw on corrupt data.
- Capability: Full-fidelity GPU flame rendering via React Native Skia and Reanimated frame timing and gestures, with no quality-reduction degrade path.
- Capability: Deterministic recomputation of fire state, achievements, and health from stored history.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
- In-domain: `productivity tracking`.
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
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Unlock collectible flame styles/palettes from streak and time-based achievements.
- Capability: Apply a calendar heat color ramp indexed by score, using design theme tokens.
- Capability: Let the user choose a flame color, with an enum-validated setting that falls back to Amber on invalid input.
- Capability: Persist entries and settings locally via AsyncStorage behind isolated storage modules with versioned keys.
- Capability: Expose entries and settings through React hooks (useEntries, useSettings) with ready-state and optimistic local updates.

## Out-of-Domain Examples

- Task or to-do list management
- Multi-user accounts, login, or cloud sync
- Backend API calls or server-side storage
- Push notifications or reminder scheduling
- Charts, graphs, or statistical dashboards as primary views
- Social sharing or leaderboards
- Payments, in-app purchases, or subscriptions
- Web or desktop-specific layouts unrelated to the mobile app
- Continuous JS timers driving animation or state
- Device-tiered rendering quality degradation
- Time-tracking or Pomodoro timers
- Generic code-review or token-saving tooling as product features
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

<!-- gardener-generated: 0a85ccf13b 0c413e5aa4 138a96dc91 23a6c7c055 244bcdd7ba 261a271eb9 2685fa9b91 3a2de2eaac 418080115b 41bff85366 48ebe0cd0b 49e82b04ef 4a6ee42624 4ba246e1fd 50a8776fdd 512fa0a6cd 55f2eea2be 574e7ecce0 58731477df 6016ef677f 6e1f4b4fd7 70e1dae326 768b92880d 772870423a 78051ff69b 87845b0a56 89b2b50e6f 8a3093907a 911c7a2e02 97669b0804 a5fdd3b027 a82e27ea5d a93819255b ab2fa019a3 ac40ecdd85 ae95e06236 bac331c3b2 c570f4d894 ca717a0849 d744064fe5 dc2502e020 e0a3dd9d0e f01567572c f1615ed1c8 f3fd0cd525 fa23beeba2 -->

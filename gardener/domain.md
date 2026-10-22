<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `personal productivity tracking`.
- In-domain: `gamification and collectible achievements`.
- In-domain: `offline-first mobile app`.
- In-domain: `calendar and daily logging UI`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `on-device persistence`.
- Capability: Record one integer productivity score from 1 to 5 per calendar day, with one entry per date.
- Capability: Allow scores for today and past days only; block future-date entries.
- Capability: Add, change, or clear scores for past or current days, with recomputation of fire state.
- Capability: Convert cumulative per-day contributions into bonfire strength (score 1 adds 0, scores 2-5 add 1-4), with strength growing monotonically while lit.
- Capability: Tolerate one missed past day; two consecutive missed past days extinguish the fire and reset strength to zero; an unscored today is not a miss.
- Capability: Relight an extinguished fire with any logged score, where a score of 1 relights it as a minimal lit flame at strength 0.
- Capability: Derive fire state deterministically and order-independently from all stored entries and today's date.
- Capability: Render an animated flame with React Native Skia, with embers, coals, logs, smoke, and glows, driven by Reanimated on the UI thread.
- Capability: Show an out state with no flame or embers while logs and smoke remain visible.
- Capability: Honor the OS reduced-motion setting by stopping flame, ember, and coal animation loops.
- Capability: Display a clean main view containing the animated flame and a settings button, with a loading placeholder until stored data loads.
- Capability: Open a swipe-up calendar bottom sheet over the flame via gesture handling, and hide it on swipe-down.
- Capability: Navigate the calendar month by month, paging backward through any number of past months but not into future months, and visually mark scored and missed days.
- Capability: Store scores, selected flame, and related data locally with AsyncStorage so the app works fully offline and persists across restarts.
- Capability: Provide a settings screen for choosing the flame color or style.
- Capability: Ship a catalog of exactly 20 flame styles (1 base, 8 streak-specific, 11 time-specific) with defined gradients and achievement requirements, with Amber always unlocked as the free default.
- Capability: Lock all non-Amber flames by default and unlock each through its achievement (streak-specific or time-specific).
- Capability: Unlock a streak flame while the current alive run satisfies its condition and relock it when the fire goes out or an edit breaks the condition.
- Capability: Unlock a time flame on its achievement day, keep it available through its window while the fire is lit, expire it afterward, and reset the window on re-completion without banking days.
- Capability: Show an embered, desaturated variant of a locked equipped flame while the fire is lit; Amber never renders embered.
- Capability: Provide a flame gallery listing every flame with its colors, requirement, unlock status, and live progress or days remaining, and let users equip any unlocked flame.
- Capability: Give brief in-app feedback when a flame newly unlocks, and allow flames to be re-earned indefinitely.
- Capability: Support optional short per-day notes that do not affect score or fire logic.
- Capability: Show visual-only fire health (Faint, Steady, Bright, or Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JavaScript timers.
- Capability: Support accessibility labels and adequate touch targets on day cells, pickers, settings, the flame, and the swipe handle.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
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

- Push notifications or reminder alerts
- Cloud sync, user accounts, or multi-device backend storage
- Social features such as friends, leaderboards, or sharing feeds
- Task lists, to-do items, or task management
- Charts, graphs, or analytics dashboards as the primary view
- Scoring of future dates or pre-planned days
- Paid flame purchases, subscriptions, or in-app store monetization
- Time tracking, pomodoro timers, or calendar event sync with external calendars
- Web or desktop front-end targets beyond the Expo React Native mobile app
- Server-side fire computation or remote API integrations
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

<!-- gardener-generated: 0a1518a592 0e1d9a58da 121e9c3c28 2196843c6d 21f84e9166 2c35e7845b 2dad1b950a 34ca2cbac5 3c4279c2b4 3ede95ba07 409ba37e88 42bb1a3a8d 48dfb9ee64 4dbd4b429a 541251b9c1 574e7ecce0 5c5f690730 5de29ce58e 5e7f63bc9f 69d13d5646 869ce82503 8deee21a08 8f262b869c a4a999d969 a8860d6aa6 a8d1932151 bd1f635fe1 c2ad23a327 c70815a466 cbb6c216ca cdb1d8ed48 cff628c2a0 d0dee21c7c dd330267a4 dfe8c023e1 e668aa3aaf eadac94da7 f278c09f9f f569a354df f5d73d6829 f91131781e fad77ec16d fc561b7243 -->

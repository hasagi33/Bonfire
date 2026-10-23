<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `habit and streak tracking via visual gamification`.
- In-domain: `mobile app (Expo React Native, single screen)`.
- In-domain: `GPU-rendered 2D animation and visual effects (React Native Skia, Reanimated)`.
- In-domain: `local-first on-device persistence (AsyncStorage)`.
- In-domain: `calendar-based score logging and review`.
- In-domain: `achievement-based cosmetic unlocks (flame styles)`.
- Capability: Record one integer productivity score from 1 to 5 per calendar day, with at most one score per date.
- Capability: Reject scores for future dates and reject non-integer or out-of-range scores.
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current lit run (score 1 adds 0; scores 2-5 add strictly increasing amounts, 5 the most).
- Capability: Keep the fire alive through a single missed past day; extinguish it after two consecutive missed past days, resetting strength to zero.
- Capability: Relight an extinguished fire from any score 1-5, with a score of 1 relighting it at strength 0.
- Capability: Derive fire state (unlit/spark, lit at varying sizes, gone-out) deterministically from the full score calendar and today's date, never storing fire state itself.
- Capability: Soft-cap the visual flame size toward a maximum while the underlying strength keeps increasing.
- Capability: Render an animated flame with Skia (blur, gradients, screen blend, glow) and rising embers/sparks whose amount may scale with strength.
- Capability: Show only charred logs and a dissipating smoke wisp when the fire is out, with no flame or embers until relit.
- Capability: Show a loading placeholder on cold start until saved scores and settings finish loading, without discarding scores entered during loading.
- Capability: Display a main view with only the flame and a settings button by default, with the calendar hidden.
- Capability: Reveal or hide a month-focused calendar bottom sheet via swipe up and swipe down gestures.
- Capability: Color calendar day cells from raw score using a heat ramp and mark missed, today, and future states.
- Capability: Provide an inline 1-5 score picker to add, change, or clear scores on today or any past day.
- Capability: Page back through any number of past months while blocking navigation into future months.
- Capability: Backfill or edit past-day scores and recompute the fire from the full calendar afterward.
- Capability: Persist all scores and the selected flame style locally across app restarts without data loss.
- Capability: Let the user choose a flame style (Amber default, Crimson, Sapphire, and further styles) with immediate recoloring.
- Capability: Maintain a catalog of achievement-locked flame styles, each tied to exactly one achievement; Amber is always unlocked.
- Capability: Classify achievements as streak-specific (unlocked while the current lit run satisfies the condition) or time-specific (unlocked for a fixed window from the achievement day, expiring afterward).
- Capability: Relock non-Amber flames when the fire goes out, and restore time-based flames still inside their window when relit.
- Capability: Show a flame gallery grouped by tier with unlock state, live progress toward each achievement, and equip actions.
- Capability: Render an embered (dim, desaturated) variant of an equipped flame when its achievement is no longer satisfied while the fire is lit.
- Capability: Open the calendar with a full-screen upward swipe from anywhere while taps still reach the settings button.
- Capability: Attach short per-day text notes to days that do not affect score or fire logic (README-described).
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality (README-described).
- Capability: Adapt scene atmosphere from local time without continuous JavaScript timers (README-described).
- Capability: Maintain a framework-free domain logic layer separate from UI rendering, with no network calls or API tier at runtime.
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
- Server-side API, backend services, or cloud sync of scores
- User accounts, authentication, or multi-user/social features
- Network-dependent features such as online leaderboards or remote flame catalogs
- Charts, analytics dashboards, or statistical reports beyond the calendar and fire visuals
- Reminders, push notifications, or scheduled background jobs
- Rewards that incentivize lowering scores, keeping averages low, or deliberately breaking a streak
- Reduced-quality rendering fallbacks that trade flame fidelity for frame rate
- Web or desktop targets beyond the Expo mobile app
- Payments, purchases, or monetized flame unlocks
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

<!-- gardener-generated: 0152cb68f8 06d4a479b9 097d12805c 114276e3e6 1d4e049f2d 1da5724498 227fdcdc05 2418410833 2a996fffab 303bca02e1 3f40da9533 40aa18288a 43ea17dd73 49f471155f 4d6c3ccab3 5225115f5b 574e7ecce0 60f71f26b0 6694b87a04 6deb03265f 6f15121903 749b2f59d8 7d2b40519e 7d782e2940 887ea7416e 896eb899ad 90a708aa55 a39a5e2f6e a541c1410b a5fdd3b027 a9ead175f0 b58974ac7b c32788afe1 c4bd490440 c77055b413 cc9954fe9d d047184470 d2375fcd0a d54fd28fdd db77d8e2bf e18c643003 e3e5cfb3b4 e8d71b1ba7 ec577553ae f3878a21ef f57ef03f8b -->

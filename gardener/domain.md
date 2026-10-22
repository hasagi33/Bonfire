<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `personal productivity tracking`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `gamification and achievements`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `local-first on-device data persistence`.
- In-domain: `calendar-based daily journaling`.
- Capability: Record one integer productivity score from 1 to 5 per day for today or any past date.
- Capability: Reject future-dated entries and out-of-range scores.
- Capability: Change or clear any past or current day's score.
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current alive run (score 1 adds 0, scores 2-5 add increasing strength).
- Capability: Keep a lit fire lit on a score of 1 without increasing its size.
- Capability: Allow a single missed past day without extinguishing the fire; two consecutive missed past days extinguish it and reset strength to zero.
- Capability: Treat an unscored current day as not a miss.
- Capability: Relight an extinguished fire from zero on any new score.
- Capability: Derive fire state deterministically and order-independently from the full calendar of scores against the current date.
- Capability: Recompute fire state after each backfill or edit of a past day.
- Capability: Render an animated bonfire whose on-screen size soft-caps while underlying strength keeps increasing.
- Capability: Show charred logs and a thin smoke wisp with no flame or embers when the fire is out.
- Capability: Show a brief loading placeholder on cold start until saved scores and settings load.
- Capability: Provide a swipe-up, full-screen-gesture calendar sheet (hidden by default, dismissed by swipe-down) that does not block taps on the settings gear, dev pill, or day cells.
- Capability: Provide a month-focused calendar that pages backward through any number of past months but not into future months.
- Capability: Provide a settings button on the main view.
- Capability: Let users pick the flame color from Amber, Crimson, and Sapphire, with an immediate recolor and persistence across restarts (default Amber).
- Capability: Define a catalog of flame styles where each flame is tied to exactly one achievement; Amber is always unlocked and is the default.
- Capability: Unlock non-Amber flames through streak-specific achievements that stay unlocked only while the current run satisfies the condition and relock when the fire goes out or an edit breaks the condition.
- Capability: Unlock time-specific achievements that stay unlocked through a window of D+W days inclusive from the most recent completion day (determined from the calendar, not the current date), only while the fire is lit, and that are not bankable.
- Capability: Reset time-flame windows on re-completion without shortening remaining availability; leave the flame locked if a condition is completed only by a backfilled day whose window has already elapsed.
- Capability: Make every flame re-earnable indefinitely through earn-lose-earn cycles.
- Capability: Provide a flame gallery reached from settings showing every flame's unlock status, name, colors, required achievement, live progress, and window countdown for unlocked time flames.
- Capability: Render a locked active flame as a dim, desaturated embered variant; never render Amber as embered; out-state visuals take precedence over the equipped flame.
- Capability: Give brief in-app feedback when a flame newly unlocks, without push notifications.
- Capability: Persist recorded scores and the active flame selection locally between app sessions using AsyncStorage.
- Capability: Store achievement state only as derived data, not persisted.
- Capability: Support short per-day notes that do not affect score or fire logic.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local device time without continuous JS timers.
- Capability: Render flames, embers, glows, and effects with React Native Skia and animate frames, gestures, and sheets with React Native Reanimated and Gesture Handler.
- Capability: Hold at least 120 FPS on 120 Hz devices for every flame style, including multicolor styles.
- Capability: Operate fully offline with no backend or runtime network calls.
- Capability: Maintain spec-driven development artifacts (specs, plans, contracts, tasks, checklists) under the specs directory, with tests under __tests__.

## Out-of-Domain Examples

- Backend services, cloud sync, or user accounts
- Runtime network calls, remote APIs, or telemetry
- Push notifications or reminder scheduling
- Multi-user sharing, social features, or leaderboards
- Task lists, to-do management, or project tracking
- Charts, graphs, or statistical dashboards as a primary view
- Conventional streak counters as the main UI
- Payment, in-app purchases, or real-money flame sales
- Server-side achievement or score validation
- Continuous background timers driving the animation loop from JS
- Web-only UI, desktop-specific layouts, or non-Expo native builds unrelated to the bonfire scene
- Generic code-review or token-saving tooling as product features

<!-- gardener-generated: 0076d49ea5 155eaf56ce 17d6c99291 1e0380cbe6 252fb6eb44 2749aee458 3091a5338b 31f7c75f34 326a337bfc 3c4279c2b4 4034073cd1 41d1736d00 4698b90b28 49e82b04ef 4c8dfe3a64 4dbd4b429a 5078c5409e 574e7ecce0 57e324edd8 58731477df 58eb732bc3 6c277378df 7549913b49 7ac4c63f0a 7ba682bf69 841601d182 85e775bddb 89b2b50e6f 939970a71f 9a3d580480 9c9053b460 9fe2c9adbf ab858cd885 ac40ecdd85 acddf33669 b28265239e b2d601cd92 b5f9456d1f ba0d1e6658 bb4c022bf1 bb8ae4d739 c62e892f43 cb19b46d2a d00666a8a8 d174112759 d7346627a0 da9235a1fe de660d76e1 df9369b47d e604a2e4ff f249d6293f fa44d895ba fbcb31b1c5 -->

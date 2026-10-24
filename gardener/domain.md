<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `personal productivity tracking`.
- In-domain: `habit and daily-score logging`.
- In-domain: `gamified progress visualization`.
- In-domain: `animated GPU-rendered graphics (React Native Skia, Reanimated)`.
- In-domain: `offline local-first mobile app`.
- In-domain: `on-device data persistence (AsyncStorage)`.
- In-domain: `calendar and date review`.
- In-domain: `gesture-driven mobile UI`.
- In-domain: `flame visual design and theming`.
- In-domain: `time-of-day and seasonal visual atmosphere`.
- In-domain: `in-app user help and handbook`.
- Capability: Assign integer productivity scores of 1 to 5 to today or any past day, and change or clear them.
- Capability: Derive fire strength as the cumulative sum of per-day contributions over the current alive run.
- Capability: Allow one missed past day; two consecutive missed past days extinguish the fire and reset it to zero.
- Capability: Relight an extinguished fire when any new score is logged; today unscored is not counted as a miss.
- Capability: Backfill or edit past scores and recompute fire state deterministically from the full calendar history.
- Capability: Soft-cap the flame's on-screen size while the underlying strength keeps increasing.
- Capability: Render the animated flame with React Native Skia and drive frame timing and sheet animation with Reanimated.
- Capability: Render an out state of charred logs and a thin smoke wisp with no flame or embers until relit.
- Capability: Show a brief loading placeholder on cold start until saved scores and settings load.
- Capability: Show a swipe-up calendar sheet (React Native Gesture Handler) that is hidden by default and dismissed by swipe-down.
- Capability: Page backward through past months in the calendar, capped at the current month, with no future-month navigation.
- Capability: Show fixed score button colors by value (1 white, 2 light yellow, 3 yellow, 4 orange, 5 red).
- Capability: Provide a top-right settings button (gear) that opens flame selection without opening the calendar.
- Capability: Select among a catalog of 20 collectible flame styles (BonfireDesign profiles with silhouette, tongues, aura, particles, motion, and palette traits).
- Capability: Unlock flames through streak-based and time-based achievements, with time-based unlocks expiring after a window and restarting on re-completion.
- Capability: Show a flame gallery listing each flame's unlock status, name, colors, required achievement, and live progress or days remaining.
- Capability: Allow equipping locked flames, which render in a dim embered form until earned and then switch to full style automatically.
- Capability: Give brief in-app feedback when a flame newly unlocks, without requiring an app restart.
- Capability: Persist the date-to-score map, selected flame style, and flame color choice locally across restarts.
- Capability: Let users add, view, edit, and replace an optional personal note per day that does not affect score or fire logic.
- Capability: Derive visual-only Fire Health (Faint, Steady, Bright, Radiant) from the latest 7 scored days, weighted toward newer scores, with a sparse-history fallback for 0 to 2 scored days.
- Capability: Display the Fire Health label in the flame scene and reflect it in flame visuals.
- Capability: Adapt the background atmosphere to local time of day (day, dusk, night) with smooth transitions and subtle seasonal variation for both hemispheres.
- Capability: Keep the fire and fixed panels readable and visually dominant across all background states.
- Capability: Ship a getting-started handbook page on the in-app help screen.
- Capability: Maintain the flame rendering performance target of at least 120 FPS on 120 Hz devices, including during flame switches.
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

- Backend services, user accounts, or cloud sync of scores or notes
- Runtime network calls or remote data fetching
- Logging scores for future dates or values outside 1 to 5
- Task lists, to-do items, or project management features
- Charts, graphs, or streak counters as the primary screen content
- Showing flame or embers in the out state of the fire
- Social sharing, leaderboards, or multi-user features
- Paging the calendar into future months
- Using a quality-reduction fallback that degrades flame fidelity on low-end devices
- Monetization, ads, or in-app purchases
- Multi-device or cross-platform data sharing beyond on-device storage
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

<!-- gardener-generated: 09f8259459 0dc5f3de66 0f7d4e5a1e 12d1094106 144b986a4a 2053790d16 206247ebf8 2223329cc3 244fda1989 33a4f8bbcc 35b9a9e274 399306f2ac 3cbf6e998d 4dbd4b429a 4f308aafc0 521c33ae60 574e7ecce0 62a377cc78 799c3fd525 7aed37684f 7d3beffdd6 837661eb86 936c0989fa 93ca41fb0f 94966ad7ae 991ff01aa1 9e0e4d55e6 ae32015b28 b4d449caf8 b77699869e b83f5287f5 be8060a840 c471739bf5 c6e7987a42 c801f9337e c8a268d105 cd88810479 d7346627a0 d9b7e9da46 dc2d3e0e5a e386933fd8 e38cbf7bc9 e61c24f02d e731e18723 ed48d72551 efa48fda64 f26c68791b f2f7d0e7fb f94d45f761 -->

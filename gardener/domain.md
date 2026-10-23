<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `personal productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `calendar and date-based history`.
- In-domain: `data visualization of personal activity`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `local-first on-device persistence`.
- In-domain: `gesture-driven UI`.
- In-domain: `accessibility of interactive lists`.
- Capability: Record one integer productivity score from 1 to 5 per calendar day, for today or any past day, with one entry kept per date..
- Capability: Add, edit, or clear a score for any past or current day; scores may not be set on future dates..
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current alive run (1 gives +0, 2 gives +1, 3 gives +2, 4 gives +3, 5 gives +4)..
- Capability: Extinguish the fire after two consecutive missed past days; a single missed day keeps it alive, and today being unscored is not a miss..
- Capability: Fully reset strength to zero when the fire goes out, and relight it from zero when any score 1-5 is logged..
- Capability: Render the flame size with a soft cap that levels off toward a maximum while underlying strength keeps increasing..
- Capability: Show an animated bonfire flame whose visual state is derived deterministically from stored history..
- Capability: Emit rising particles from the lit flame, with intensity that may scale with strength..
- Capability: Derive visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) from recent score quality..
- Capability: Adapt scene atmosphere from local time without continuous JS timers..
- Capability: Present a clean flame-only main screen with a settings button in the top-right corner..
- Capability: Reveal a swipe-up calendar sheet and hide it with a swipe-down gesture; a full-screen upward swipe from anywhere on the closed view opens the calendar while taps on the gear and day cells still work..
- Capability: Provide a month-focused calendar that shows scored days, their intensity, and missed days, and can page backward through any number of past months but not into future months..
- Capability: Attach short per-day notes that are stored and displayed without affecting score or fire logic..
- Capability: Persist all scores, notes, and selected flame locally on device with AsyncStorage across app restarts, with no automatic purge of history..
- Capability: Show a brief loading placeholder on cold start until saved entries load; loading never throws, and corrupt or missing data resolves to an empty state or defaults..
- Capability: Maintain a catalog of 20 flame styles (one base, eight streak-based, eleven time-based), each tied to one achievement, with Amber always unlocked by default..
- Capability: Classify achievements as streak-specific (unlocked only while the current alive run satisfies the condition) or time-specific (unlocked on the achievement day and held within a window while the fire is lit)..
- Capability: Recompute unlock states deterministically and order-independently from the calendar, so backfills and edits can relock streak flames and re-completion resets time windows..
- Capability: Give locked flames a dim, desaturated embered preview when equipped, which bursts to full color once earned; Amber never renders embered and out-of-fire visuals take precedence..
- Capability: Let users equip any flame, including locked ones, and recolor the bonfire immediately without restart..
- Capability: Provide a flame gallery from the settings button listing every flame with name, colors, requirement, unlock status, and live progress or days remaining, grouped by tier..
- Capability: Reject taps on locked gallery flames with a brief cue and no dialog, leaving the active flame unchanged; locked rows expose disabled accessibility state and descriptive labels..
- Capability: Show brief in-app feedback when a flame newly unlocks..
- Capability: Migrate stored settings from the v1 flameColor key to the v2 flameStyle key, preserving Amber, Crimson, and Sapphire choices and defaulting safely..
- Capability: Render flame profiles, embers, glows, and effects with React Native Skia (GPU)..
- Capability: Drive frame timing, gestures, and sheet animation with React Native Reanimated and Gesture Handler..
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `productivity tracking`.
- In-domain: `gamification / achievements`.
- In-domain: `GPU-rendered 2D graphics and animation`.
- In-domain: `local on-device persistence`.
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

- Push notifications or reminder scheduling (explicitly excluded from scope).
- Task or to-do list management, project boards, or subtasks.
- Primary charts, graphs, or analytics dashboards as the main view.
- Traditional streak counters or gamified point totals as headline metrics.
- Cloud sync, user accounts, authentication, or multi-device sharing (the app is intentionally local-first).
- Backend server APIs or remote databases for storing scores.
- Social features such as friends, leaderboards, or sharing progress with others.
- Habit tracking with arbitrary custom metrics or multiple scores per day.
- Calendar event scheduling, meetings, or time-blocking.
- Expense, finance, or budget tracking.
- Permanent deletion or automatic purging of historical entries.
- Future-dated score entry or planning ahead on the calendar.
- Low-average or lowered-score rewards that incentivize intentionally low effort.
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

<!-- gardener-generated: 0375916b29 06a6d3e8de 08abbd01d7 0a36017b2b 0b89e99fdd 0cc1cfaf09 0e368d3ffc 1436ad9c70 14552b23f9 1796ae5ff5 19edd1fba8 1de348962d 24f2b29130 262cff82ce 287d73622b 2bf2ae3779 3290539a5c 34e2b107b1 36261b875c 3807fbde27 3c4279c2b4 42930798a5 4bdfe4a593 4dbd4b429a 55499bf796 56d0b09bf1 574e7ecce0 57e324edd8 5e68e25ce9 632ac41aff 6574901252 69003028c4 6e4e414f73 7b213ea358 7f29283ec2 883bcc31cc 8bb2817ce3 8ece75c9dc 8fe7da1fe8 948139eae2 a55c84cd34 a93819255b b0be50a23b bbbf54cb4c be96642442 c91cc91b88 cb19b46d2a cba96e716c f178e6052e fb69f77241 -->

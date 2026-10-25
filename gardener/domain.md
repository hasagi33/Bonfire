<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `animated graphics rendering`.
- In-domain: `local-first persistence`.
- In-domain: `habit streak tracking`.
- In-domain: `calendar and date-based history`.
- Capability: Log one integer productivity score (1-5) per calendar day for today or past days, with one entry per date.
- Capability: Reject scores outside 1-5 and scores for future dates.
- Capability: Change or clear any day's score, and backfill past days.
- Capability: Compute fire strength cumulatively over the current alive run (score 1 adds 0; scores 2-5 add increasing amounts).
- Capability: Keep the fire alive through a single missed past day; extinguish it after two consecutive missed past days, resetting strength to zero.
- Capability: Relight an extinguished fire with any logged score, treating a logged day as active.
- Capability: Recompute fire state deterministically from the full stored calendar history.
- Capability: Render an animated bonfire as the main view with flame, embers, rising particles, halo, ground glow, and hearth wash.
- Capability: Scale the visual flame size with a soft cap while underlying strength keeps increasing.
- Capability: Show an out-state with charred logs and a faint smoke wisp, with no flame or embers, until relit.
- Capability: Swipe-up calendar sheet (gesture-driven via React Native Gesture Handler and Reanimated) that opens from the main view and closes on downward swipe, clearing the selected day.
- Capability: Month-focused calendar that pages back through any number of past months but not into future months.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Score picker buttons and calendar day cells colored by a white-to-red heat ramp (1 white with outline, through 5 red), sourced from one shared token set.
- Capability: Choose fire color (Amber, Crimson, Sapphire) from a top-right settings button, applied immediately and persisted, defaulting to Amber.
- Capability: Catalog of collectible flame styles, each tied to exactly one achievement; Amber always unlocked as default.
- Capability: Classify achievements as streak-specific (unlocked while current lit run satisfies condition, relocks when fire goes out or an edit breaks it) or time-specific (unlocked on the calendar-based achievement day and held through a window, with re-completion resetting the window and no day banking).
- Capability: Flame gallery in settings listing all flames with unlock status, name, colors, required achievement, live progress, and days remaining or re-earn prompts for locked/expired flames.
- Capability: Embered rendering (dim, desaturated) of the active flame while it is locked; automatic switch to full style on unlock; Amber never embered.
- Capability: Reject selection of locked flames with immediate visible feedback; only currently unlocked flames can become active, enforced at gallery and screen level.
- Capability: Persist the selected flame and scores locally across restarts.
- Capability: Derive halo, ground glow, hearth wash, and particle colors from the active flame palette, updating on switch.
- Capability: Visual-only Fire Health label derived from recent score quality: Faint, Steady, Bright, or Radiant.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Show a brief loading placeholder on cold start until saved data loads, without discarding scores entered during loading.
- Capability: Operate fully offline with local-only persistence via AsyncStorage.
- Capability: Brief in-app highlight when a new flame unlocks; no push notifications.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
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

- Multi-user accounts, login, or cloud sync of scores
- Social features such as sharing, friends, or leaderboards
- Task lists, to-do items, or pomodoro timers
- Charts, graphs, or analytics dashboards as primary views
- Push notifications or reminder scheduling
- Payments, subscriptions, or in-app purchases for flame styles
- Backend server APIs or remote databases
- Scores on a scale other than 1-5 or multiple scores per day
- Permanently consumed or expiring-forever flame rewards
- Web-only dashboards or desktop-specific UI
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

<!-- gardener-generated: 004378b327 1a4aa6a80b 1d9739ab3b 1f6350647b 221313b72e 2911bc5f7a 2f49cf7181 3392792f6c 39ecd6a426 3c548b8b61 3c87bae5d5 3ee196d21d 437e79a29d 43f749567e 4647663d40 53f357dae3 56d0b09bf1 574e7ecce0 57e324edd8 5bcfcbc215 5ce6d62774 636cf20937 683019f090 6f15121903 772e5523ec 7df14aa4f9 80e489c696 82a73540bf 83590d5385 89b2b50e6f 8a3093907a 8c2cba9f02 96bb4d8e49 a39a5e2f6e a6eaf2edbd bac331c3b2 c7b81d5aec d2eefe60d8 d4c8366a5b dc076fc605 dd69f12ded e34adfba96 ea61e91cbe edc0b892ba f784bc88e5 -->

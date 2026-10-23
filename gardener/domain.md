<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `habit/streak gamification`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `animated graphics and visual effects`.
- In-domain: `local-first data persistence`.
- In-domain: `calendar-based daily logging`.
- Capability: Log an integer daily productivity score from 1 to 5 for the current or any past day, with future dates rejected.
- Capability: Edit, change, or clear scores for past days (backfill) across any number of months, with the fire recomputed deterministically.
- Capability: Convert scores into fire strength: score 1 keeps a lit fire at the same size with strength 0, scores 2-5 contribute 1-4 and strictly increase.
- Capability: Extinguish the fire when two consecutive past days are missed; a single missed day is tolerated; an unscored today after a lit run is not a miss.
- Capability: Relight an extinguished fire from zero with any score 1-5, and render a charred-logs and smoke-wisp state while the fire is out.
- Capability: Swipe-up month calendar sheet (full-screen upward gesture, hidden by swipe-down) that marks scored and missed days and pages backward through past months but not future months.
- Capability: Short per-day notes that are stored with the day but do not affect score or fire logic.
- Capability: Visual-only Fire Health indicator (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Soft-capped on-screen flame size while underlying strength keeps increasing.
- Capability: Achievement system with streak-based (N-day runs within the alive run, unbroken chains) and time-based (window of W days from completion day, gated on lit fire) conditions.
- Capability: Catalog of collectible flame styles, each tied to one achievement, with Amber as the default unlocked style and all others locked initially.
- Capability: Flame gallery reached from settings showing each flame's name, colors, requirement, and live progress, with equip for unlocked flames and teasers for locked ones.
- Capability: Dim, desaturated embered rendering of the selected flame while locked, returning to full vibrancy when unlocked.
- Capability: Per-flame visual profiles covering silhouette/shape variants, motion (flicker, sway, stretch, pulse, warp), particle mixes (ash, sparks, stars, motes, wisps), aura, accents, and palette.
- Capability: Strength response per flame profile layered on the unchanged fire strength math.
- Capability: Reduced-motion support that freezes or minimizes animated flame loops.
- Capability: Flame color/style selection persisted across restarts, with a loading placeholder until saved data loads.
- Capability: Local-only persistence of scores, notes, achievements state, and the selected flame via AsyncStorage, working fully offline.
- Capability: Scene atmosphere adapted from local time without continuous JS timers.
- Capability: GPU-rendered flame, embers, glows, and effects with React Native Skia, and frame timing, gestures, and sheet animation with Reanimated and Gesture Handler.
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

- Task or to-do list management with due dates and assignments
- Pomodoro or focus-session timers
- Multi-user accounts, team sharing, or social leaderboards
- Cloud sync, server-side backend, or remote data storage
- Charts, analytics dashboards, or statistical reports as the primary view
- Payments, in-app purchases, or ad monetization of flame styles
- Calendar integration with external services such as Google Calendar
- Push notification reminders or scheduled background jobs
- Web-only admin panels or desktop-specific UI
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

<!-- gardener-generated: 0371a1148a 037d6fcaf8 05961333c0 07aeeaaf81 0dfd2e0053 0ec7d4d964 17c0cfc3d9 248ec638b2 2f186bb5f6 352cba1259 361cc78d6a 3f80d2655a 48ba4bb462 51172c38cc 54e150b7f1 5504082ca0 574e7ecce0 61849d2a4c 6277a3bdea 6864f5d97f 6f15121903 70bab94303 7312ef3f4c 739b7c383c 79e1565c7f 7ac8b7eced 97dbc1f1da a1577c35cc a3a5d69427 a52c322f9e ba653be854 c8ad19a8d4 cb19b46d2a de367a2704 e4fda3c344 e513ebeb60 -->

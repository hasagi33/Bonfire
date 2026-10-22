<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile productivity tracking`.
- In-domain: `habit and streak gamification`.
- In-domain: `offline-first local storage`.
- In-domain: `React Native / Expo mobile UI`.
- In-domain: `GPU 2D rendering and animation (Skia, Reanimated)`.
- In-domain: `gesture-driven calendar UI`.
- In-domain: `deterministic state derivation from history`.
- In-domain: `user settings and personalization`.
- Capability: Record one integer productivity score from 1 to 5 per day for today or any past date, rejecting future dates and out-of-range values.
- Capability: Change or clear any past or current day's score.
- Capability: Derive fire strength as the cumulative sum of per-day contributions over the current alive run (score 1 adds 0, scores 2 to 5 add increasing strength).
- Capability: Keep the fire lit through a single missed past day and extinguish it after two consecutive missed past days, resetting strength to zero; an unscored today is not a miss.
- Capability: Relight an extinguished fire from zero on any new score, including a score of 1.
- Capability: Recompute fire state deterministically and order-independently from the full calendar of scores against the current date, including after backfills.
- Capability: Soft-cap the on-screen flame size while underlying strength keeps increasing.
- Capability: Render an animated bonfire with Skia and Reanimated, including embers, glows, and visual effects.
- Capability: Show a charred-log and thin smoke-wisp out-state with no flame or embers when the fire is out.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Provide a month-focused calendar revealed by swipe-up and hidden by swipe-down, with a full-screen upward swipe gesture that still lets taps reach the settings gear and day cells.
- Capability: Page backward through any number of past months but not into future months.
- Capability: Allow short per-day notes that do not affect score or fire logic.
- Capability: Let users choose a flame color (Amber default, Crimson, Sapphire) from a settings button, with an immediate recolor.
- Capability: Maintain a catalog of collectible flame styles where Amber is always unlocked and all others are achievement-locked by default.
- Capability: Unlock streak-specific flames while the current alive run satisfies their condition, relocking when the fire goes out or an edit breaks the condition.
- Capability: Unlock time-specific flames on their achievement day, keep them available through a bounded window while the fire is lit, reset windows on re-completion without banking days, and leave them locked when only an already-elapsed backfilled day satisfies them.
- Capability: Render locked active flames as a dim, desaturated embered variant (never for Amber), with out-state visuals taking precedence over any equipped style.
- Capability: Provide a flame gallery reached from settings showing every flame's status, name, colors, requirement, live progress, and window countdown.
- Capability: Show brief in-app feedback when a flame newly unlocks, without push notifications.
- Capability: Re-earn any achievement-based flame indefinitely through earn-lose-earn cycles.
- Capability: Persist scores, notes, and the selected flame (and color) locally with AsyncStorage across restarts.
- Capability: Show a loading placeholder on cold start until saved scores and settings load, with no unlit flash and no early taps.
- Capability: Run fully offline with no backend, accounts, or runtime network calls.
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

## Out-of-Domain Examples

- Cloud sync, user accounts, or multi-device backend storage
- Social features such as sharing streaks or leaderboards with other users
- Push notifications or reminder scheduling
- Task lists, to-do items, or project management
- Primary charts, graphs, or statistics dashboards as the main view
- Payments, in-app purchases, or paid flame unlocks
- Analytics or telemetry sending data over the network
- Calendar integrations with external calendars such as Google or iCloud
- Continuous JS timers driving animation or atmosphere
- Web-only UI or server-side rendering
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 0e778a15d0 0f105dd5df 1eb7432f61 24118c365f 3fa47a51ab 4264c8c855 47cd539929 48f7f373f8 4a6ee42624 4ddd850e6e 5357f246ba 553c615828 574e7ecce0 58731477df 5d0d6a402b 6046b71431 734e3c2d71 742f8c71cb 7713d78bb8 77a88758d8 78699222d7 7b129035be 7ef472927d 89b2b50e6f 8a29a27f72 8a3093907a 8deee21a08 9f3625e512 a10c774049 a429b92a69 a6fc3ef7da bf6e8aa5ed c250f6534d c31bf70df9 c90d8149ee ced1c1dc58 d7f1599c52 db8870b679 dc546f1de3 e68277768e eb69c42a4a ec30c51ddf f249d6293f f481e1416a -->

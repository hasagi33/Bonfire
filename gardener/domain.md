<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity habit tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile app UI (React Native / Expo)`.
- In-domain: `GPU-rendered 2D graphics and animation`.
- In-domain: `local-first on-device data persistence`.
- In-domain: `gesture-driven calendar UI`.
- In-domain: `visual theming and color palettes`.
- Capability: Record one integer productivity score from 1 to 5 per local calendar date.
- Capability: Reject scores for future dates.
- Capability: Allow scores to be assigned to any past or current day, then changed or cleared.
- Capability: Backfill missed past days and recompute the fire from the full calendar.
- Capability: Compute fire strength as a cumulative sum over the current alive run (score 1 adds 0; scores 2 to 5 add strictly increasing amounts).
- Capability: Keep the fire lit through a single missed past day and extinguish it after two consecutive missed past days, resetting strength to zero.
- Capability: Treat an unscored current day as not a miss.
- Capability: Relight an extinguished fire from any score 1-5 (a score of 1 relights at strength 0).
- Capability: Render the flame with size soft-capped while underlying strength keeps increasing.
- Capability: Render the out state as charred logs and a thin smoke wisp with no flame or embers.
- Capability: Render flames with React Native Skia (tongue shapes, gradients, blurred glow, halo, ground glow) and Reanimated frame timing.
- Capability: Scale ember spawn rate with fire intensity.
- Capability: Show a brief loading placeholder until saved scores and settings load, avoiding an unlit flash.
- Capability: Show a visual-only Fire Health tier (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Swipe-up calendar sheet revealed from the closed main view, hidden by swipe-down, with the flame lifting and dimming when open.
- Capability: Month-focused calendar that pages backward through any number of past months and forward only to the current month.
- Capability: Score buttons and day cells in a white-to-red heat ramp, with an outlined score-1 button.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Top-right settings button (52x52 pt gear meeting the 44 pt touch target).
- Capability: Fire color selection from Amber, Crimson, and Sapphire with Amber as default, recoloring the flame immediately.
- Capability: Achievement-locked flame catalog where each flame is tied to exactly one achievement; Amber is always unlocked.
- Capability: Classify achievements as streak-specific (unlocked only while the current run satisfies the condition) or time-specific (unlocked for a window of W days from the completion day, gated on a lit fire).
- Capability: Restart time-flame windows on re-completion without banking days.
- Capability: Flame gallery grouped by tier showing locked and unlocked flames, their requirements, live progress, and days remaining for time flames.
- Capability: Equip any unlocked flame; locked flames can be previewed in the gallery but not equipped, with a brief rejection cue on tap.
- Capability: Render locked active flames as a dim, desaturated embered variant (Amber never embered); out-state visuals take precedence over the equipped style.
- Capability: Derive flame glow, halo, ground pool, hearth wash, and particle colors from the active flame palette.
- Capability: Persist scores, notes, settings, and the active flame selection on device via AsyncStorage, with migration from the v1 flame color setting and fallback to Amber for corrupt values.
- Capability: Recompute all unlock states and the fire deterministically from stored history on every score change, without requiring an app restart.
- Capability: Operate fully offline with no accounts, network calls, or multi-device sync.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
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
- Project management, kanban boards, or time-tracking timers such as Pomodoro
- Cloud sync, user accounts, or multi-device synchronization
- Social features such as sharing, friends, leaderboards, or public profiles
- Remote analytics, telemetry, or server-side data storage
- Push notifications or reminder scheduling services
- Payments, in-app purchases, or paid flame unlocks
- Primary charts or dashboards as the main view
- Streak counters as the headline display
- Calendar integrations with external services such as Google Calendar
- Health or fitness data ingestion from sensors or wearables
- Web-only or desktop-only features unrelated to the Expo mobile app
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage

<!-- gardener-generated: 030035cebd 1a9f168b8f 1b69b13ab8 1f993db9e6 21bfca1ca2 226bc46ca1 24118c365f 24d961b0c7 2685fa9b91 2966ee8f9e 2b0491a4ac 2c4a871bb6 31920806ff 3901e8462d 40eab477c3 4d84c7d401 520793b8ee 547b77f9ea 574e7ecce0 57e324edd8 5c3e9c46e4 60c179c1aa 6442622f29 73e3abf4b5 76dfc5d728 790e41b825 7fccfecf1a 8a29a27f72 8a3093907a 9c9053b460 a5fdd3b027 a9a3aec753 afc2a3d6e8 afdc48faa7 b30ae187d1 b616921af4 b81394a587 b9a6b8ba3f bac331c3b2 bf25b634c0 c0999d7d5c cda888d56e ce9fb9ae7c d16b4051d3 d6d4a8e5ca de660d76e1 e153e75b50 e1786dc30e e7e8b7eb27 f001c9a6f8 f2bd5ec7ec -->

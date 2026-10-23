<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity and habit tracking`.
- In-domain: `gamification via achievement-unlocked cosmetic styles`.
- In-domain: `offline-first local-only mobile app`.
- In-domain: `React Native mobile UI`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `calendar review and backfill UI`.
- Capability: Record one integer daily productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear previously assigned scores, with the fire recomputed from the full calendar.
- Capability: Convert cumulative per-day contributions (score 1 adds 0, scores 2-5 add 1-4) into a fire strength over the current alive run.
- Capability: Keep the fire alive across a single missed day; extinguish it after two consecutive missed past days, resetting strength to 0.
- Capability: Relight the fire on any new score.
- Capability: Render an animated bonfire whose size reflects accumulated strength, using React Native Skia and Reanimated.
- Capability: Show an out-state with charred logs and a dissipating smoke wisp when the fire is out.
- Capability: Show a clean main view with only the flame and a top-right settings gear by default.
- Capability: Open a swipe-up bottom-sheet calendar from a closed-screen upward swipe or handle, with scrim dimming and flame lift; close it with a downward swipe.
- Capability: Month-focused calendar that pages back through any number of past months but not future months.
- Capability: Visually mark scored days and missed days on the calendar.
- Capability: Score buttons and day cells using a white-to-red heat ramp, with score 1 outlined.
- Capability: Attach short per-day notes that do not affect score or fire logic.
- Capability: Compute a visual-only Fire Health tier (Faint, Steady, Bright, Radiant) from recent score quality.
- Capability: Maintain a catalog of collectible flame styles (streak flames and time flames), with Amber as the always-unlocked default.
- Capability: Unlock streak flames while the current alive run satisfies their condition, relocking when the run no longer qualifies or the fire goes out.
- Capability: Unlock time flames on an achievement day determined from the calendar, keep them available within a fixed window, and expire them afterward.
- Capability: Reset time-flame windows on re-completion without banking days; leave a flame locked if its completing day was backfilled after the window elapsed.
- Capability: Browse a flame gallery listing all flames with locked teasers, requirements, live progress, days remaining, and re-earn prompts.
- Capability: Equip only unlocked flames; keep equipped flames that later lock, rendering them as dim embered variants.
- Capability: Show brief in-app feedback when a flame newly unlocks.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Open the gallery and flame selection from a settings gear with an enlarged 52x52 pt touch target.
- Capability: Persist scores, notes, the active flame, and settings on-device via AsyncStorage under versioned keys (e.g., bonfire.entries.v1, bonfire.settings.v1) with v1-to-v2 settings migration.
- Capability: Show a loading placeholder until stored data loads, avoiding a premature unlit flash.
- Capability: Derive all fire state, achievements, and health deterministically from stored history.
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
- Capability: Unlock collectible flame styles/palettes from streak and time-based achievements.
- Capability: Apply a calendar heat color ramp indexed by score, using design theme tokens.
- Capability: Let the user choose a flame color, with an enum-validated setting that falls back to Amber on invalid input.
- Capability: Persist entries and settings locally via AsyncStorage behind isolated storage modules with versioned keys.
- Capability: Expose entries and settings through React hooks (useEntries, useSettings) with ready-state and optimistic local updates.

## Out-of-Domain Examples

- Backend services, REST or GraphQL APIs, or any runtime network calls
- Cloud sync, multi-device sync, or user accounts and authentication
- Push notifications or reminder scheduling
- Task or to-do management, project boards, or time tracking
- Charts, analytics dashboards, or streak counter-first displays as the primary view
- Social features such as sharing, leaderboards, or friends
- Payments, subscriptions, or in-app purchases
- Team collaboration or shared calendars
- Health-data integrations or wearable sync
- Web-browser or desktop-specific UI targets beyond the Expo React Native app
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 07bf319c99 0e9c9d0ee0 10206bf88c 1f8dbd119f 30472d696b 363d1b8fbb 3893032fb2 3c4279c2b4 40905f13c9 44a0f96e0d 461bb702c6 48d9c2d29c 49e4196a7d 4e95f63fe7 53933295f4 574e7ecce0 5c616a23bd 5d02d06889 6122d378b4 7a08c3f147 89956d508e 89b2b50e6f 8a3093907a 8a9bc92866 8bb9790132 8c36596355 90e9a52c92 9be8fc7706 a9754d2fce b7e4c251e4 bd99c5171c be817f3054 c215511a0e d4614a96af d7ccd4258b d7cdcdfade de17ebb7bc de57b38b30 e21c291719 e9bed83989 f7b06f1b40 fbb5d0bc79 fcd5df11a6 -->

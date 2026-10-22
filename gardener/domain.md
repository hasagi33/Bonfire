<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `personal productivity tracking`.
- In-domain: `habit and streak tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile app UI (Expo / React Native)`.
- In-domain: `on-device local data persistence`.
- In-domain: `GPU-rendered 2D graphics and animation (Skia, Reanimated)`.
- In-domain: `gesture-driven calendar UI`.
- Capability: Log an integer productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear a previously assigned score for any past or current day.
- Capability: Compute fire strength as the cumulative sum of per-day contributions (1→+0, 2→+1, 3→+2, 4→+3, 5→+4) over the current alive run.
- Capability: Soft-cap the on-screen flame size while underlying strength keeps increasing.
- Capability: Allow one missed past day without extinguishing; two consecutive missed past days extinguish the fire; an unscored today is not a miss.
- Capability: Relight an extinguished fire with any score 1-5, starting a fresh run from strength 0.
- Capability: Render out-fire visuals (charred logs, thin dissipating smoke wisp, no flame or embers).
- Capability: Show a single-screen bonfire main view with a settings/cog button and a calendar revealed on demand.
- Capability: Open the calendar with an upward swipe (full-screen from anywhere on the closed view) and close it with a downward swipe; taps still reach the settings gear.
- Capability: Calendar month-focused paging backward through any number of past months, with no navigation into future months.
- Capability: Calendar visually indicates scored days and missed days, and recomputes fire state from edits.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Fire Health indicator (visual only) derived from recent score quality: Faint, Steady, Bright, Radiant.
- Capability: Flame color selection from Amber, Crimson, and Sapphire, defaulting to Amber, applied immediately and persisted.
- Capability: Achievement-locked flame styles: streak-specific and time-specific achievement types, with Amber always unlocked.
- Capability: Time-specific flames unlocking on an achievement day, staying available through an activity window, expiring afterward, and voided while the fire is out.
- Capability: Streak-specific flames unlocking while the current alive run meets their condition and relocking when the fire goes out or an edit breaks the condition.
- Capability: Flame gallery from settings listing every flame with unlocked/locked status, name, colors, required achievement, and live progress or days remaining.
- Capability: Equip unlocked flame styles as the active style; reject taps on locked flames with visible feedback and never persist them as active.
- Capability: Render embered (dim, desaturated) variant of a locked active flame that returns to full vibrancy when earned.
- Capability: Brief in-app feedback on flame unlock transitions (no push notifications).
- Capability: Persist scores, flame color or active flame id, and settings locally with AsyncStorage, including a v1-to-v2 settings schema migration and fallback to Amber for invalid ids.
- Capability: Cold-start loading placeholder until saved entries load.
- Capability: Skia-rendered flame, embers, particles, halo, ground glow, and hearth wash with palette-derived colors per flame style.
- Capability: Reanimated-driven frame timing, sheet animation, and gesture handling via React Native Gesture Handler.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Shared score heat color ramp (white, light yellow, yellow, orange, red) for score buttons and day cells with contrast requirements.
- Capability: Development-only (__DEV__) control to advance the day for testing extinguish behavior.
- Capability: Deterministic recomputation of fire state, achievements, and health from stored score history.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
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

- User accounts, login, or authentication
- Multi-device or cloud sync and backend servers
- Runtime network calls or remote APIs
- Push notifications
- Task or to-do management
- Charts or analytics dashboards as primary features
- Social sharing, leaderboards, or friends
- In-app purchases or monetization of flame styles
- Calendar navigation into future months
- Permanent consumption or one-time-only flame unlocks
- Note content affecting score or fire strength
- Web-browser or desktop-specific UI layouts
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

<!-- gardener-generated: 025e9f436b 0a3d2d2194 0c4bd64ab4 0caba6ca59 12a950c568 143e35d1d5 161727834a 19eb4e295b 1d376c5705 2bd8c767ff 312c20a2e2 49e2b74aac 4a6ee42624 4dbd4b429a 54e9165ea8 554baf13e7 574e7ecce0 57e324edd8 595275ae77 59e0b4d653 6052acc642 6a0f5dad26 6d450bc4be 76beaf47a9 772a937de4 7ecde4d37b 8012672d2b 8144fdc3c4 834fe7b663 83c07d03c9 8a29a27f72 8a3093907a 8c2ef3f20b 999d3a756c 9dda651fa3 a07428b50c a2e9e97425 a968866845 adcebe0268 b2ee233807 bac331c3b2 bd617ca40d c44154e4e3 c4a3570282 ed242bbbde f1d487dc29 fa31a5b92a fd14364f78 fff1008458 -->

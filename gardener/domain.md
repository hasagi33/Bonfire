<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `2D GPU graphics and particle animation`.
- In-domain: `gesture-driven calendar UI`.
- In-domain: `local-first on-device persistence`.
- In-domain: `settings and personalization`.
- Capability: Log an integer productivity score from 1 to 5 for any day that is today or in the past.
- Capability: Change or clear a previously assigned score for past or current days.
- Capability: Compute fire strength as the cumulative sum of per-day contributions (1→+0, 2→+1, 3→+2, 4→+3, 5→+4) over the current alive run.
- Capability: Allow one missed past day without extinguishing the fire; two consecutive missed past days extinguish it, with today being unscored not counting as a miss.
- Capability: Relight an extinguished fire with any score 1-5 as a fresh run starting at strength 0.
- Capability: Render the flame with its on-screen size soft-capped toward a maximum while underlying strength grows without limit.
- Capability: Show out-state visuals (charred logs and a thin dissipating smoke wisp, no flame or embers) when the fire is out.
- Capability: Render a single-screen animated bonfire using React Native Skia for flame, embers, and glows, with Reanimated for frame timing and animation.
- Capability: Emit rising particles from the lit flame, with intensity that may scale with strength.
- Capability: Show a loading placeholder on cold start until saved entries finish loading.
- Capability: Open a swipe-up calendar bottom sheet (full-screen upward swipe from the closed state) and hide it with a down swipe, while taps still reach the settings gear.
- Capability: Page the calendar month-by-month backward through any number of past months, with no navigation into future months.
- Capability: Visually mark days that have scores and days that were missed on the calendar.
- Capability: Add, edit, or clear scores from the calendar so the flame recomputes from history.
- Capability: Store short per-day notes that do not affect score or fire logic.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Select a flame color from Amber, Crimson, or Sapphire via a top-right settings button, with Amber as default, applied immediately and persisted.
- Capability: Maintain a catalog of flame styles, each tied to exactly one unlocking achievement, with Amber always unlocked.
- Capability: Unlock streak-specific flames while the current alive run satisfies their condition, relocking when the fire goes out or an edit breaks the condition.
- Capability: Unlock time-specific flames on their achievement day, keep them available within a window (D through D+W inclusive) while the fire is lit, and expire them afterward.
- Capability: Reset time-flame windows on re-completion without banking days, and leave a flame locked when a backfilled completion's window has already elapsed.
- Capability: Show a flame gallery (reached from settings) listing every flame with name, colors, required achievement, unlocked or locked status, and live progress or days remaining.
- Capability: Equip any unlocked flame as the active style, persisting the selection across restarts (v2 settings schema with migration from v1 flameColor; invalid ids fall back to amber).
- Capability: Reject taps on locked flames in the gallery with a visible cue, never equipping or persisting them.
- Capability: Render an equipped but locked flame as a dim, desaturated embered variant that returns to full vibrancy automatically when earned.
- Capability: Give brief in-app feedback when a flame newly unlocks, without push notifications.
- Capability: Recompute all unlock states on any score change and unlock without requiring an app restart.
- Capability: Derive flame halo, ground glow, hearth wash, and particle colors from the active flame's palette, preserving the default Amber look.
- Capability: Apply a shared heat color ramp (white, light yellow, yellow, orange, red) to score buttons and calendar day cells, with score 1 outlined and text meeting 4.5:1 contrast.
- Capability: Provide a settings gear with at least 44 pt touch target (52×52) that opens the flame gallery.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Persist all scores, notes, and selected flame locally with AsyncStorage, with no accounts, login, multi-device sync, or runtime network calls.
- Capability: Retain all past daily entries indefinitely with no automatic purge.
- Capability: Provide a __DEV__-only control to advance the day for testing extinguish behavior.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
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
- Multi-device or cloud synchronization of scores
- Server-side APIs or any runtime network calls
- Push notifications or reminders
- Task lists, to-do items, or project management
- Charts, analytics dashboards, or detailed statistics beyond the calendar view
- Social features such as sharing, friends, leaderboards, or multi-user competition
- In-app purchases or paid flame sales
- Forward calendar navigation into future months or future-day score entry
- Permanently consuming or spending flames or achievements
- Web, desktop, or server-rendered deployment targets
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 06819b22e4 072df1a7eb 1c980ff562 1d4c4d3013 1eb7432f61 28547d7b1d 2a4b6ffaeb 2ec5a65949 3441e20748 36cd62d1d0 3fd7b23ca7 4378e95f64 574e7ecce0 57e324edd8 58731477df 595275ae77 66904e80e1 66ed5b335b 6d604ccfee 6e66e4eeda 6f15121903 700e780034 7b3c7dc093 7b91a2e982 7d113af0d0 8a29a27f72 8a3093907a 8bbce2476e 8f30b1e028 93f70858bb 9731140e51 9ba5ded448 a2e9e97425 a429b92a69 a5301c7a88 a93819255b acddf33669 b32f9ebcb0 b66a7cb328 b9dfcd0b97 bbd55b6f24 c4805e91da c9f47a7652 cb19b46d2a d14644db99 d7cf37a426 de3ced9ed6 e14d116500 e1e547895d e31ab17f19 f3dc1e5723 f4625a483d f757822349 -->

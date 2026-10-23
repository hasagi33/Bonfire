<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `productivity and habit tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `local-first offline persistence`.
- In-domain: `2D graphics and animation (Skia / Reanimated)`.
- In-domain: `calendar and date-based history`.
- In-domain: `user settings and personalization`.
- Capability: Record one integer productivity score from 1 to 5 for each day that is today or in the past.
- Capability: Reject scores outside the 1-5 integer range and reject scores for future dates.
- Capability: Add, change, or clear the score for any past or current day.
- Capability: Derive fire strength as the cumulative sum of per-day contributions, with score 1 holding the fire at its current size and scores 2-5 adding increasing strength.
- Capability: Tolerate a single missed day; two consecutive missed past days extinguish the fire to zero.
- Capability: Relight an extinguished fire with any score from 1 to 5, where a score of 1 relights it as a minimal flame at strength 0.
- Capability: Render a full-screen animated bonfire as the main view, with on-screen size growing quickly then capped at a maximum while underlying strength keeps increasing.
- Capability: Render charred logs and a thin smoke wisp, with no flame or embers, when the fire is out.
- Capability: Show a loading placeholder on cold start until saved scores finish loading.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Swipe-up calendar bottom sheet that is hidden by default, revealed by an upward swipe from the closed main view, and dismissed by a downward swipe or pan.
- Capability: Month-focused calendar that pages backward through any number of past months and cannot page into future months.
- Capability: Calendar cells visually mark days with scores and missed days, and show selected-day state.
- Capability: Short per-day notes that are stored with the day but do not affect score or fire logic.
- Capability: Settings button in the top-right corner (52x52 pt gear) that opens the flame gallery.
- Capability: Choose fire color or flame style from Amber, Crimson, or Sapphire, with Amber as the default.
- Capability: Recolor the flame, halo, ground glow, hearth wash, and ember particles immediately to the selected flame's palette.
- Capability: Achievement-locked flame catalog where most flames unlock through streak or time achievements and Amber is always unlocked.
- Capability: Streak flames unlock while the current run meets their condition and relock when the fire goes out or an edit breaks the condition.
- Capability: Time flames unlock on their achievement day, remain available through a window length while the fire is lit, cannot bank days, and expire afterward.
- Capability: Derive all unlock states deterministically from the full score calendar and current date, recomputed on every change and never stored.
- Capability: Flame gallery listing every flame with name, colors, required achievement, locked teaser, live progress, and time-window countdown.
- Capability: Equip any catalog flame, including locked ones, which then renders in a dim embered variant that switches to full style on unlock.
- Capability: Reject taps on locked flame rows with a brief visible rejection cue and expose a disabled accessibility state with a status label.
- Capability: Visual highlight or flash on locked-to-unlocked transitions without persisting anything.
- Capability: Persist scores, notes, active flame selection, and settings locally with AsyncStorage across app restarts, including migration from the v1 flameColor setting to the v2 flame id store with fallback to 'amber' for unknown or corrupt values.
- Capability: Operate fully offline with no required network dependency.
- Capability: GPU-rendered flame, embers, and glow effects via React Native Skia, with target 120 FPS animation via React Native Reanimated.
- Capability: Gesture handling via React Native Gesture Handler for sheet swipes and gear taps.
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

- Cloud sync, user accounts, or multi-device data sharing
- Backend servers, REST APIs, or remote databases
- Social features such as friends, leaderboards, or sharing feeds
- Task or to-do management, project boards, or reminders with due dates
- Charts, graphs, or analytics dashboards as primary views
- Push notifications or background scheduling
- Payments, subscriptions, or in-app purchases
- Editing, rescoring, or deleting flame styles beyond the defined catalog
- Time tracking, pomodoro timers, or focus session logging
- Web browser or desktop-specific UI targets
- Integrations with third-party calendars such as Google Calendar or iCal
- Multiplayer or real-time collaboration
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 01e50c08a0 0592f47426 0dde17cba0 12a761801e 1704a7c1f0 1ec96e53dc 22e5625570 231f0fcbde 2f186bb5f6 3b57c851dc 3be420cff5 461bb702c6 4647663d40 4680802b9c 472919f921 4e3f3c3dc5 56d0b09bf1 574e7ecce0 57534643ef 57e324edd8 58731477df 59a3cc4e08 625f5c1277 6493219635 6a195b5c19 7159b8e1c4 788b0be987 7e1fcc90dc 829c15bbc9 8a3093907a 8b785cdf6c 90a68c7075 9186cf8ba5 9be8fc7706 9c8feb7058 bd90f2cfaa bf45d9812e c15e931bac c5c27bc5cb c6a067496b cb19b46d2a cb7e1f50a4 d7f1599c52 e50ea92ab5 e7b97d0767 f278c09f9f f9bafcb33a fab02b0dc2 fbefdad984 fc9891203f -->

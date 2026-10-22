<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `productivity tracking`.
- In-domain: `gamification / achievements`.
- In-domain: `animated visualization (GPU rendering)`.
- In-domain: `local-first on-device persistence`.
- In-domain: `calendar UI`.
- In-domain: `accessibility`.
- Capability: Record one integer productivity score (1 to 5) per calendar day for today or any past day.
- Capability: Add, edit, or clear the score of any past or current day, with the fire recomputing from the calendar.
- Capability: Compute fire strength as a cumulative sum of per-day contributions (score 1 adds 0; scores 2 to 5 add 1 to 4), monotonic while lit.
- Capability: Keep the fire lit across one missed past day; extinguish it after two consecutive missed past days; reset to zero and relight from any new score.
- Capability: Derive visual Fire Health tiers (Faint, Steady, Bright, Radiant) from recent score quality (visual only).
- Capability: Render an animated bonfire as the main view using React Native Skia and Reanimated.
- Capability: Swipe-up full-screen gesture to open a month-focused calendar sheet; swipe-down or downward pan to close it (react-native-gesture-handler).
- Capability: Calendar with backward month paging through any number of past months, no future paging beyond current month, day cells colored by score, and inline 1 to 5 score picker.
- Capability: Store short per-day notes that do not affect score or fire logic.
- Capability: Settings gear/button (top-right) to open a flame gallery and choose the active flame style.
- Capability: Flame catalog where each flame maps to exactly one achievement, with Amber always unlocked by default and the rest achievement-locked.
- Capability: Streak-specific achievements that unlock while the current alive run satisfies a condition and relock when the fire goes out or an edit breaks it.
- Capability: Time-specific achievements that unlock on the achievement day and remain available for a fixed window, gated on the fire being lit; re-completion resets the window without banking days.
- Capability: Gallery showing all flames grouped by tier with name, colors, requirement, live progress, days remaining, or re-earn prompts for expired flames.
- Capability: Equip locked flames as an embered (dimmed) preview that bursts to full when earned; locked-but-equipped flames render embered.
- Capability: Brief in-app feedback when a flame newly unlocks; no push notifications.
- Capability: Persist scores, notes, the selected flame, and settings across restarts via AsyncStorage, with a brief loading placeholder.
- Capability: Deterministic recomputation of fire state, achievements, and health from stored history.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Honor OS reduced-motion preference by stopping flame, ember, and coal animation loops.
- Capability: Accessibility labels, roles, disabled states, and touch targets (at least 44pt; gear 52x52) on day cells, picker, settings, flame, gallery rows, and swipe handle.
- Capability: Score heat ramp colors (white, light yellow, yellow, orange, red for scores 1 to 5) with an outline on score 1.
- Capability: Fully offline operation with no backend or runtime network calls; design files are build-time reference only.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
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

- Task lists, to-do management, or project tracking
- Charts, graphs, or statistics dashboards as the primary view
- Cloud sync, user accounts, or multi-device sharing
- Backend API, server-side storage, or network-dependent features
- Push notifications or reminder scheduling
- Social features, leaderboards, or sharing scores with others
- Paid flame purchases or in-app monetization
- Pomodoro or time-tracking timers
- Future-dated score entry beyond the current day
- Permanent purging of recorded scores or automatic data expiry
- Web-only browser deployment or desktop-specific UI
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Task lists, to-do items, or project management
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 072df1a7eb 099c69e337 0b5a96ef9f 1a4aa6a80b 1ab6528b01 1f97a1abbb 1ff34826df 21a509d716 269ae2bd69 29287d92a0 3ba86c71fa 3eeee8341d 474e4e5e0a 54a4aa3669 574e7ecce0 5d0dd34bcd 657d53d368 65d293f552 6a469c8773 6bd00669f2 6f15121903 6fecfbb24e 7f0766b155 853961ba41 857ed11c48 87fb2f8fa2 89b2b50e6f 8a3093907a a93819255b ab858cd885 ae7c004e4d b7db037a72 bc0ae41211 bf4f73abc0 cc26689e1c cf35df2bc9 d0e8ec34fb d40029ebe6 d744064fe5 d8507357b4 e1f1c12089 e75e5fa14a -->

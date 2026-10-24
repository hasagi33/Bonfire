<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `2D/GPU graphics and animation`.
- In-domain: `local-first on-device persistence`.
- In-domain: `habit/streak calendar review`.
- Capability: Log one integer daily productivity score from 1 to 5 for the current day.
- Capability: Assign, change, or clear scores for any past or current day, with the fire recomputed on each change.
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current alive run.
- Capability: Extinguish the fire after two consecutive missed past days, resetting strength to zero; a single missed day keeps it lit.
- Capability: Relight an extinguished fire with any score 1-5 as a fresh run (a score of 1 relights at strength 0).
- Capability: Render an animated bonfire whose visual size uses a soft cap while underlying strength keeps increasing.
- Capability: Show charred logs and a smoke wisp, with no flame or embers, when the fire is out.
- Capability: Flame color/style selection among Amber (default, always unlocked), Crimson, Sapphire, and a catalog of 20 flame styles.
- Capability: Achievement-based unlocking of flame styles from streak conditions and time-window conditions (unlocked for a window of W days from completion, re-completion resets the window).
- Capability: Streak achievements that stay satisfied only while the current run meets the condition and are voided when the fire goes out.
- Capability: Flame gallery reached from settings listing each flame's unlocked/locked status, colors, required achievement, and live progress or days remaining.
- Capability: Embered (dim) rendering of locked flames, including a locked flame that is persisted as the active selection.
- Capability: Reject selection of locked flames with immediate visible feedback, while unlocked flames stay selectable.
- Capability: Brief in-app feedback when a flame newly unlocks, with no push notifications.
- Capability: Per-flame visual profiles covering shape, motion, particles, aura, accents, palette, footprint, opacity, and core scale, with rarer flames more exotic.
- Capability: Flame-derived ambient glow and particle/spark colors that update immediately on flame switch.
- Capability: Visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Swipe-up full-screen calendar sheet (hidden by default) for logging, editing, clearing, and reviewing scores, dismissed by swipe-down.
- Capability: Month-focused calendar that pages back through any number of past months but not into future months.
- Capability: Heat-ramp score buttons and day cells (1 white through 5 red) with a legible labels and distinguishable selected state.
- Capability: Short per-day notes that are stored but do not affect score or fire logic.
- Capability: Persist scores, notes, settings, and selected flame on device with AsyncStorage across restarts.
- Capability: Loading placeholder on cold start until stored data loads, without losing scores entered during load.
- Capability: Deterministic recomputation of fire state, achievements, and health from stored history.
- Capability: Settings gear (top-right) with enlarged touch target that opens flame selection.
- Capability: GPU-rendered flame, embers, and glow effects via React Native Skia; frame timing, gestures, and sheet animation via Reanimated and Gesture Handler.
- Capability: Fully offline runtime with no network use.
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

## Out-of-Domain Examples

- Cloud sync, user accounts, or multi-device backup of scores
- Backend APIs, server-side storage, or remote analytics
- Social features such as friends, leaderboards, sharing, or multi-user competition
- Push notifications or reminder scheduling
- Task or to-do management, project boards, or time tracking with timers
- Pomodoro or focus-session timers
- In-app purchases, subscriptions, or paid flame store
- Standalone charts or dashboards as the primary view
- Web-only pages, admin consoles, or desktop-specific UI
- Editing scores via arbitrary numeric scales outside integer 1-5
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

<!-- gardener-generated: 14b15c31a6 16bfaadfa1 178a77b1cc 17edfc539e 1c1b1e562c 2693456c39 27a6f97f2f 389d3e1f5a 43f749567e 475ed37847 5001109f7b 501010a985 574e7ecce0 5768d4f48d 57e324edd8 5983cd636e 5a709b4066 5c3a058def 5ec162a28f 61849d2a4c 6ca42c6e91 6f15121903 85051ab42b 8608709392 89b2b50e6f 8a3093907a 8f28aec069 8f84b62170 904cc0a255 9a3f14dfaf 9fb6e88572 a93819255b ab9e297d80 ad0a8f856c afe74e43c9 b23a901f88 b698802d13 bad6b414a4 cb19b46d2a d744064fe5 da51552607 db3e8395d4 e4b5f047e0 e581914858 f599b5b7d3 -->

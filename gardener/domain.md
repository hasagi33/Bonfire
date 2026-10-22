<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `personal productivity tracking`.
- In-domain: `gamification (achievements and collectible unlocks)`.
- In-domain: `2D/GPU graphics and animation (Skia, Reanimated)`.
- In-domain: `local-first offline data persistence`.
- In-domain: `calendar and gesture-driven UI`.
- In-domain: `visual state derived from history`.
- Capability: Log one integer productivity score from 1 to 5 for each day, for today or any past day.
- Capability: Change or clear a previously assigned score for any past or current day.
- Capability: Compute fire strength as the cumulative sum of per-day contributions (1→+0, 2→+1, 3→+2, 4→+3, 5→+4) over the current alive run.
- Capability: Extinguish the fire when two consecutive past days are unscored or missed; a single missed day keeps it alive; an unscored today is not a miss.
- Capability: Relight an out fire as a fresh run from strength 0 on any new score 1-5.
- Capability: Render an animated single-screen bonfire whose on-screen size soft-caps toward a maximum while underlying strength grows without limit.
- Capability: Render an out-fire state showing charred logs and a thin dissipating smoke wisp with no flame or embers.
- Capability: Emit rising particles from the lit flame whose intensity may scale with strength.
- Capability: Show a brief loading placeholder on cold start until saved entries load.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Swipe-up calendar sheet (full-screen gesture from the closed main view) with swipe-down or down-pan to close and clear the selected day.
- Capability: Month-focused calendar that pages backward through any number of past months and never forward past the current month.
- Capability: Calendar day cells and score buttons that indicate scored days, missed days, and a shared heat color ramp with score 1 outlined and text meeting 4.5:1 contrast.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Flame color/style selection (Amber default, Crimson, Sapphire, and other catalog styles) from a top-right settings gear with a 52×52 touch target.
- Capability: Achievement-locked flame catalog: each flame tied to one achievement, with Amber always unlocked and all others locked by default.
- Capability: Streak-specific achievements unlocked while the current alive run satisfies the condition and relocked when the fire goes out or an edit breaks it.
- Capability: Time-specific achievements unlocked on the achievement day, active within a window D through D+W while lit, expiring afterward, with window reset on re-completion and no day banking.
- Capability: Backfilled time completions whose window has already elapsed leave the flame locked.
- Capability: Flame gallery reached from settings listing every flame with name, colors, required achievement, unlock status, and live progress or days remaining.
- Capability: Equip unlocked flames; locked selections are rejected with a visible cue and never persisted as active.
- Capability: Render an equipped locked flame as a dim, desaturated embered variant that bursts to full vibrancy automatically on earning; Amber never embers.
- Capability: Out-state visuals take precedence over any equipped flame style.
- Capability: Brief in-app feedback on flame unlock (no push notifications, nothing extra persisted).
- Capability: Palette-derived halo, ground glow, hearth wash, and particle colors from the active flame palette.
- Capability: Persist scores, notes, selected flame id (v2 settings schema with v1 flameColor migration, corrupt ids fall back to Amber) on device via AsyncStorage, fully offline with no runtime network calls.
- Capability: Keep all past daily entries indefinitely with no automatic purge.
- Capability: Single-user, single-device operation with no accounts, login, or multi-device sync.
- Capability: Debug-only (__DEV__) control to advance the day for testing extinguish behavior.
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
- Multi-device or cloud sync and backend APIs
- Push notifications or reminders
- Social features, sharing, or leaderboards
- Task lists, to-do management, or project tracking
- Standalone charts, analytics dashboards, or reporting as a primary view
- Paid purchases, ads, or monetization flows
- Web or desktop targets beyond the Expo mobile app
- Automatic purging or expiry of past daily entries
- Continuous JS timer–driven animation loops outside Skia/Reanimated frame timing
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

<!-- gardener-generated: 114276e3e6 12b2625b94 21d866528e 2f38613011 35b81e90a2 3f5bac6ee1 409f24da31 4248394e0b 4a0f10d266 4dbd4b429a 4e757f7adc 50dd209c0f 574e7ecce0 58731477df 595275ae77 5ee797d634 5fb33ade1a 6f294a3b63 7124118281 7588949ded 767c963429 81ca7e36ab 81d777b4e3 89decc66af 8a3093907a 8c3d21b0c5 8f30b1e028 97f3d3d83e 98563e011c a2e9e97425 a4204ed167 a7a02302b1 ab858cd885 b1c1395368 b5686f6f83 b6da3fc39a bac331c3b2 c1e8b4f636 c371ccb139 cb19b46d2a d27e59d067 dc21fb75d6 de556bc889 df035cb9d1 e0ec9b57b6 ed242bbbde ef4e1e555c f0773fc21b -->

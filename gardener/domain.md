<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `habit/streak tracking`.
- In-domain: `gamification (achievement-unlocked flame styles)`.
- In-domain: `mobile app (React Native / Expo)`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `local-first on-device data storage`.
- In-domain: `calendar and daily journaling notes`.
- Capability: Log an integer 1-5 productivity score for today and any past day, with changes or backfills recomputing the fire from the full calendar.
- Capability: Derive fire strength as the cumulative sum of per-day contributions over the current alive run, with on-screen size soft-capped.
- Capability: Fire lifecycle: a single missed past day keeps it lit; two consecutive missed past days extinguish it (reset to zero); any score 1-5 relights it; today unscored is not a miss.
- Capability: Out state rendering of charred logs and a thin smoke wisp until relit.
- Capability: Animated flame rendered with React Native Skia and Reanimated at full fidelity with a 120 FPS target on 120 Hz devices.
- Capability: Swipe-up full-screen gesture to open a calendar sheet and swipe-down to dismiss, built with React Native Gesture Handler, without breaking taps or scrolling.
- Capability: Month-focused calendar that pages backward through past months only, capped at the current month, with score buttons colored by value (1 white, 2 light yellow, 3 yellow, 4 orange, 5 red).
- Capability: Optional short per-day personal notes that can be added, viewed in day detail, edited, and persisted, without affecting score or fire logic.
- Capability: Settings screen opened from a top-right gear button (44pt minimum touch target), including flame color selection.
- Capability: Flame color selection among Amber, Crimson, and Sapphire, defaulting to Amber, persisted across restarts.
- Capability: Collectible catalog of 20 flame styles mirroring BonfireDesign profiles (silhouette, tongues, aura, particles, motion, palette, rarity grouping), with embered variants for locked flames.
- Capability: Flame gallery listing every flame with unlock status, name, colors, required achievement, and live progress or days remaining; locked flames are visible but non-selectable.
- Capability: Streak-specific and time-specific achievements that unlock flames; time-based unlocks expire after a window from completion and restart on re-completion.
- Capability: In-app feedback when a flame newly unlocks; unlock states recomputed on every score change.
- Capability: Fire Health state (Faint, Steady, Bright, Radiant) derived from a weighted window of the latest 7 scored days with a sparse-history fallback, shown as a label and reflected in flame visuals.
- Capability: Time-of-day and seasonal atmosphere for the scene background (day, dusk, night; seasonal variation with southern-hemisphere inversion) without continuous JS timers.
- Capability: Local-only persistence via AsyncStorage of the date-to-score map, notes, selected flame style, and settings; deterministic recomputation of fire, achievements, and health from stored history.
- Capability: Loading placeholder on cold start until saved data loads (under 3 seconds).
- Capability: Getting-started handbook page on the in-app help surface.
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

- Task lists, to-do items, or task completion tracking
- Multi-user accounts, login, cloud sync, or social sharing/leaderboards
- Server-side APIs, backend storage, or network-dependent features
- Charts, graphs, or analytics dashboards beyond the flame and calendar
- Pomodoro or focus timers, reminders, or push notifications
- Future-dated score entry or paging into future calendar months
- Hiding flames or losing locked flames from the gallery instead of showing embered previews
- Quality-reduction fallbacks that lower flame fidelity on low-end devices
- Purchases, in-app payments, or monetized flame packs
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

<!-- gardener-generated: 135ffd0e76 386838bcc6 3c4279c2b4 3dda028bbd 421d7fad12 48d9f94bc2 4c712edf12 4f00e2c888 51471f6e72 574e7ecce0 59362e3e23 5a02ab836d 6de7c8055f 6e57f86eb2 6f15121903 758d573dbc 7cd21a371e 7f7aa6ec94 8558b79ff9 8b031f4792 92527098bb 9598cd8eb4 9a816d666e ac802934a5 ac8fe1226a b208f4e84e b9ec04bb02 c3e4add014 cb19b46d2a cda8cd0be8 d036e3929e dc06420346 ee2de39ef1 f1bae36820 f46487bab7 fb99189440 -->

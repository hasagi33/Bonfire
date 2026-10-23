<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app (Expo React Native)`.
- In-domain: `productivity / habit tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `GPU-rendered 2D animation and visual effects`.
- In-domain: `local-first on-device data persistence`.
- In-domain: `calendar and date-based scoring`.
- In-domain: `accessibility and reduced motion`.
- Capability: Record one integer productivity score from 1 to 5 per day for today or past days, rejecting out-of-range or future-dated scores.
- Capability: Change or clear previously assigned scores for past or current days.
- Capability: Compute fire strength as a cumulative sum of per-day contributions (score 1 adds 0, scores 2-5 add strictly increasing strength) over the current alive run.
- Capability: Keep the fire lit on a single missed past day; extinguish it after two consecutive missed past days, resetting strength to zero.
- Capability: Treat unscored today as not a miss.
- Capability: Relight an extinguished fire from any score 1-5 as a fresh run.
- Capability: Recompute fire state deterministically from the stored calendar history on backfill, edit, or clear.
- Capability: Soft-cap the on-screen flame size toward a maximum while underlying strength grows without limit.
- Capability: Render the animated flame with React Native Skia (tongue shapes, gradients, blur/screen compositing, halo, ground glow) driven by Reanimated on the UI thread.
- Capability: Emit rising particles and ambient background embers, with ember spawn rate scaling with intensity while lit.
- Capability: Show distinct unlit/spark, lit, and gone-out visual states; the gone-out state shows charred logs and a smoke wisp with no flame or embers.
- Capability: Show a loading placeholder until stored scores and settings load, avoiding a premature unlit flash and not discarding input made during loading.
- Capability: Clean main view showing only the flame and a top-right settings button, with the calendar hidden by default.
- Capability: Swipe-up full-screen gesture reveals a calendar bottom sheet; swipe-down hides it; taps still reach the settings gear.
- Capability: Calendar sheet with month-focused view, heat-ramp day cells, score pips, today ring, missed-day dots, month navigation, and an inline 1-5 picker.
- Capability: Calendar paging limited to past months with no navigation into future months beyond the current month.
- Capability: Per-day short notes that do not affect score or fire logic.
- Capability: Settings sheet to choose flame color from Amber, Crimson, or Sapphire, applied immediately and persisted (Amber default).
- Capability: Achievement flame catalog: one base Amber flame plus streak and time-based flame styles, all non-Amber styles locked by default.
- Capability: Streak-based flame unlocks tied to the current alive run and relocked when the fire goes out or an edit breaks the condition.
- Capability: Time-based flame unlocks anchored to the achievement day from calendar data, active only within an inclusive window while the fire is lit.
- Capability: Flame gallery grouped by tier showing locked requirements, live progress bars, time remaining for unlocked time flames, and re-earn prompts.
- Capability: Equip any unlocked flame; locked equipped flames render as a dimmed embered variant that bursts to full when unlocked; Amber never embers.
- Capability: Visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Local time-based scene atmosphere without continuous JS timers.
- Capability: On-device persistence of scores, notes, achievements, and selected flame via AsyncStorage, working fully offline.
- Capability: Reduced-motion support that stops flame, ember, and coal loops when the OS requests it.
- Capability: Accessibility labels on day cells, picker, settings, flame, and swipe handle, with adequate touch targets.
- Capability: __DEV__-only advance-day control for testing extinguish behavior without waiting.
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
- Capability: Adapt scene atmosphere from local time without continuous JS timers.

## Out-of-Domain Examples

- Server-side accounts, cloud sync, or multi-device sharing of scores
- Task lists, to-do items, or task completion tracking
- Charts, graphs, or analytics dashboards of productivity trends beyond the bonfire and calendar
- Traditional numeric streak counters as the primary display
- Social features such as friends, leaderboards, or sharing achievements
- Payments, in-app purchases, or premium flame store
- Push notifications or reminder scheduling
- Time tracking, pomodoro timers, or calendar event integration with external calendars
- Web browser or desktop-specific UI beyond the Expo mobile app
- Rewarding low or avoided scores (unlock conditions must never reward weaker play)
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

<!-- gardener-generated: 014d8fd73e 0b4220790b 125dfa97b5 14b15c31a6 202601cd58 230bb55e2a 24a2349bd2 27ce22deef 30dd2ff6cb 33e2615718 3416059704 3ad6c5717d 3c4279c2b4 3e36177264 5541df3a74 574c8b10cc 574e7ecce0 57c0020c61 57e324edd8 5e7f9f7121 6bc9c2c220 71aa7d73da 746e02487a 7964adfe51 7ca63a3808 7cd21a371e 87d591c77e 89b2b50e6f 8a5a54b5e0 8a87cadff6 97eef366f4 982785f938 b3847b337b be52e4c1e5 c195018a6d c6d6d34b99 ca31ea448d d5c3b2f307 d88a781eeb dcbecad5b8 ddf441f4ca de660d76e1 e5106dd295 f0876a7558 f3df7a75c5 fb7b62939e fdf51522ac -->

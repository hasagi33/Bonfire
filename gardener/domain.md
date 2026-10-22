<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `productivity tracking`.
- In-domain: `habit/streak tracking`.
- In-domain: `gamification and achievements`.
- In-domain: `mobile app (React Native, Expo)`.
- In-domain: `GPU 2D graphics and animation`.
- In-domain: `offline-first local storage`.
- In-domain: `calendar and date-based history`.
- Capability: Record one integer productivity score from 1 to 5 per calendar day.
- Capability: Compute fire strength as the cumulative sum of per-day contributions over the current alive run (score 1 adds 0; scores 2-5 add strictly increasing amounts, with 5 adding the most).
- Capability: Apply a streak rule: one missed past day keeps the fire lit, two consecutive missed past days extinguish it fully (strength resets to zero), and any new score, including 1, relights it.
- Capability: Render an animated full-screen bonfire flame as the main view, with embers, hearth logs with coals, and a caption derived from the fire label.
- Capability: Show distinct out-state visuals (no flame or embers, grey logs, smoke wisp) while logs and smoke remain visible.
- Capability: Show a swipe-up bottom-sheet calendar hidden by default, revealed by an upward swipe and hidden by a downward swipe, with the flame lifting and dimming as the sheet opens.
- Capability: Display a month-focused calendar grid with heat-ramp day cells and states for scored, today, missed, future and blank days.
- Capability: Provide an inline 1-5 score picker with a Clear option on each day.
- Capability: Backfill, change, or clear scores for any past or current day and recompute the fire and all unlock states from the full calendar.
- Capability: Page backward through unlimited past months while preventing navigation into future months.
- Capability: Persist the date-to-score map and settings on-device with AsyncStorage, working fully offline.
- Capability: Show a brief loading placeholder until stored scores and settings load (cold start target under 3 seconds).
- Capability: Offer a settings gear in the top-right for flame selection, with at least a 44pt touch target (52x52 pt).
- Capability: Maintain a catalog of achievement-locked flame styles, each tied to exactly one achievement; Amber is always unlocked and is the default; Crimson and Sapphire are locked by default.
- Capability: Classify achievements as streak-specific (unlocked while the current alive run meets its condition, relocking when the fire goes out or an edit breaks the condition) or time-specific (unlocked within a D through D+W inclusive window while the fire is lit, with windows reset by re-completion and never banking days).
- Capability: Compute achievement unlocks deterministically and order-independently from stored history; backfilled time completions whose window has already elapsed grant nothing.
- Capability: Relock all non-Amber flames when the fire goes out, and restore time flames still inside their window when relit.
- Capability: Keep all achievement flames re-earnable indefinitely; no flame is permanently consumed.
- Capability: Provide a flame gallery reached from settings listing every flame with unlocked/locked status, name, colors, required achievement, and live progress or days remaining.
- Capability: Let users equip any flame, including locked ones; a locked equipped flame renders as a dim, desaturated embered variant and bursts to full automatically when earned; Amber never embers.
- Capability: Recolor the bonfire immediately when a flame is equipped; persist the active flame selection across restarts.
- Capability: Migrate the earlier Amber/Crimson/Sapphire color preference to the corresponding flame style on upgrade.
- Capability: Give brief in-app feedback when a flame newly unlocks (no push notifications).
- Capability: Reject taps on locked flames in the gallery with a brief rejection cue rather than equipping them.
- Capability: Support a down-only pan on the open calendar sheet that closes it and clears the selected day, while taps on day cells, score buttons, Clear and month navigation still register as taps.
- Capability: Render flames, embers, glows and effects with React Native Skia and animate frames, gestures and sheet motion with Reanimated and Gesture Handler.
- Capability: Optionally store short per-day notes that do not affect score or fire logic (from README).
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality (from README).
- Capability: Adapt scene atmosphere to local time without continuous JS timers (from README).
- Scope source of truth: `specs/001-bonfire-productivity-tracker/checklists/requirements.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/entries-store.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/fire-engine.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/flame-and-theme.md`.
- Scope source of truth: `specs/001-bonfire-productivity-tracker/contracts/settings-store.md`.
- In-domain: `mobile app (Expo / React Native)`.
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

- Cloud sync, user accounts, or multi-device sign-in
- Push notifications or reminder scheduling
- Task lists, to-do items, or project management
- Charts, analytics dashboards, or statistics beyond the fire and calendar
- Social features such as friends, leaderboards, sharing feeds, or multiplayer
- Server-side APIs, backend databases, or remote storage of scores
- Pomodoro, timers, or focus-session tracking
- Monetization, in-app purchases, or paid flame unlocks
- Calendar integrations with Google Calendar or other external calendar services
- Continuous background timers or always-on JS animation loops
- Web-only dashboards or desktop-specific UI
- Server-side accounts, authentication, or cloud sync of scores
- Multi-user sharing, social feeds, or leaderboards
- Charts or streak dashboards as the primary view
- Calendar integrations with Google or Outlook
- Push notification reminders or background scheduling
- Payments, subscriptions, or in-app purchases
- Web-only browser deployment or desktop-specific UI
- Backend REST/GraphQL APIs for data storage
- Time tracking or Pomodoro timers

<!-- gardener-generated: 05ff439d3c 08718a0587 0c04beed80 0d273467d8 0d39062835 12a7e4f326 1387ddc9e7 1659d1784b 1a0743e4eb 1a0d560b39 26a7b657b3 2f49cf7181 3379ac0f6c 3a86a2b8e1 3dda028bbd 4264c8c855 4eb772d449 56d0b09bf1 574e7ecce0 57e324edd8 608c445999 628b3fb5e0 6f15121903 71594abb98 7677a453c9 7f0e5bb291 89b2b50e6f 942b96cea7 977bc77bc7 a429b92a69 b3494ffe4c b397c4a098 b6c03d8e0f b70695fcf6 bab2bff9bd c8c6a39ba2 ca26e6955a cae80b0b9d ce41d3764d db6d087fe6 e6548d65ba e8d0240d6f e91156c092 e92c6177fc ee3b066b3c eefc12063f f3711b97a4 f593c396fb -->

<!-- gardener-constitution-proposal: v1 -->
# Gardener Domain

## Domain

- Gardener should keep changes within this project's domain. Flag work that introduces features outside it.
- In-domain: `mobile app`.
- In-domain: `productivity tracking`.
- In-domain: `gamification / achievements`.
- In-domain: `animated visualization (Skia/Reanimated)`.
- In-domain: `local-first data persistence`.
- In-domain: `calendar / daily journaling`.
- Capability: Log an integer productivity score from 1 to 5 for today or any past day.
- Capability: Change or clear previously assigned scores for past or current days.
- Capability: Compute fire strength as the cumulative sum of per-day contributions in the current lit run (1 adds 0, scores 2-5 add increasing strength).
- Capability: Keep the fire lit through a single missed day; extinguish it after two consecutive missed days, resetting strength to zero.
- Capability: Relight an extinguished fire with any 1-5 score.
- Capability: Recompute fire state deterministically from the full calendar of scores, independent of entry order, whenever any score changes.
- Capability: Soft-cap the flame's visual size while underlying strength keeps increasing.
- Capability: Render fire animation states: unlit spark, lit at varying sizes, and gone-out.
- Capability: Show visual-only Fire Health tiers (Faint, Steady, Bright, Radiant) derived from recent score quality.
- Capability: Adapt scene atmosphere from local time without continuous JS timers.
- Capability: Swipe-up full-screen gesture to reveal a calendar sheet and swipe-down to hide it.
- Capability: Month-focused calendar that pages back through any number of past months and is capped at the current month.
- Capability: Visual calendar indicators for scored days versus missed days, with a heat-ramp palette.
- Capability: Short per-day notes that do not affect score or fire logic.
- Capability: Settings button (top-right gear) and settings store for flame options.
- Capability: Flame color selection (Amber, Crimson, Sapphire) that persists across restarts, with migration from v1 flameColor to v2 flameStyle.
- Capability: Flame catalog of 20 flame styles (1 base Amber, 8 streak-based, 11 time-based) with defined conditions and windows.
- Capability: Streak-specific achievements active only while the current alive run satisfies the condition, relocking when the fire goes out or an edit breaks the condition.
- Capability: Time-specific achievements unlocking on a completion day and remaining unlocked through a window of W days while the fire is lit, re-earnable after expiry.
- Capability: Flame gallery showing unlocked flames as equippable and locked flames with name, colors, requirement, live progress, and re-earn guidance.
- Capability: Embered (dimmed) rendering of equipped but locked flames.
- Capability: Persist scores, notes, and selected flame locally with AsyncStorage across sessions.
- Capability: Loading placeholder on cold start until entries and settings load, without discarding scores entered during loading.
- Capability: Reduced-motion preference stops flame, ember, and coal animation loops.
- Capability: Accessibility labels and adequate touch targets on day cells, picker, settings, flame, and swipe handle.
- Capability: GPU-rendered flame, embers, and glow effects via React Native Skia.
- Capability: Gesture and sheet animation via React Native Reanimated and Gesture Handler.
- Capability: Target high frame rate for flame rendering and avoid sustained frame drops during flame switching.

## Out-of-Domain Examples

- Task or to-do list management
- Cloud sync, user accounts, or multi-device backend storage
- Social features, sharing, or leaderboards
- Charts, graphs, or analytics dashboards beyond the calendar
- Continuous JS timers driving animations or background notifications/reminders
- Web or desktop-targeted layouts
- Payments, in-app purchases, or ad integrations
- Low-average or intentionally low-score based achievements or penalties

<!-- gardener-generated: 05961333c0 083814f607 0c1263b51b 19eb4e295b 1a4aa6a80b 1f97a1abbb 202601cd58 236c5f2029 2a379df87e 369248aafc 3a93aa0efd 3e89e3f893 48bff4bdd0 4a669fcecb 574e7ecce0 58731477df 5b9b77e866 65eab8ecac 6dbafbc4cb 6e6c602931 6f15121903 7124118281 72150c4e19 8142aa2b2e 8a3093907a 8deee21a08 9853abe0cc 98f5c4ed86 a5fdd3b027 a8beef2690 abc01cb3da acb4bf03ea b54f10e523 bac331c3b2 c81cb0cfea ccf0dfa3a3 d1d97f530c d93120891d e17d0f2257 e3e5b38f9a e8144f68a7 ec61f3a164 ff212c770c -->

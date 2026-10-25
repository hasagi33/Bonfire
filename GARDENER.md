<!-- gardener-constitution-proposal: v1 -->
<!-- gardener-spec-fingerprint: a0b3b67d86735c9a -->
# GARDENER.md

## Product Purpose

- Maintained repository: `hasagi33/Bonfire`.
- Bonfire is a local-first Expo React Native productivity tracker that turns daily 1-5 productivity scores into an animated bonfire whose strength, color, and unlockable flame styles reflect the user's logged history. It also provides a swipe-up calendar for logging, editing, and reviewing past scores and notes. (auto-detected, confidence 90%; verify)
- Review and edit this draft before merging; merging makes these rules source truth.
- Bonfire is a local-first Expo React Native productivity tracker that turns a daily 1-5 productivity score into a living, Skia-rendered bonfire whose strength is derived deterministically from the score history. Users also review and annotate past days through a calendar sheet and unlock flame styles through achievements. (auto-detected, confidence 85%; verify)

## Constitution Files

Read only the file relevant to the task to keep context small.

- `gardener/domain.md`: project domain and out-of-domain examples (domain-drift guard anchor).
- `gardener/rules.md`: protected paths, allowed fixes, and PR rules.

## Scopes

Each scope has its own rules. Before changing a file, read the scope file of every scope that lists it; a file in several scopes is a seam and must satisfy all of them.

- `gardener/scopes/001-bonfire-productivity-tracker.md`: 001-bonfire-productivity-tracker (34 files, 21 requirements).
- `gardener/scopes/002-achievement-flame-unlocks.md`: 002-achievement-flame-unlocks (28 files, 25 requirements).
- `gardener/scopes/003-ui-flame-polish.md`: 003-ui-flame-polish (24 files, 12 requirements).
- `gardener/scopes/004-flame-visual-profiles.md`: 004-flame-visual-profiles (27 files, 17 requirements).
- `gardener/scopes/005-tiny-daily-memory.md`: 005-tiny-daily-memory (17 files, 10 requirements).
- `gardener/scopes/006-subtle-atmosphere.md`: 006-subtle-atmosphere (13 files, 12 requirements).
- `gardener/scopes/007-fire-health.md`: 007-fire-health (14 files, 8 requirements).

<!-- gardener-generated: 09ba90a54a 1d6f6a7e20 26e2dbdeee 34492f215b 497e6a5b5e 4b2b7a1209 4fd8e990b9 642ac37bbb 75f156f3db 781d6e3e26 924cd1ef93 a7d75e6483 -->

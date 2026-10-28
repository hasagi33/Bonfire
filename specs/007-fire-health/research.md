# Research: Fire Health

**Feature**: 007-fire-health | **Date**: 2026-06-18

This feature must communicate recent effort quality through the flame itself while staying
strictly visual-only. The implementation should stay inside the current Expo bonfire app, reuse
the existing flame scene infrastructure, and avoid any new runtime packages or gameplay side
effects.

## R1. Recent-score window and weighting

**Decision**: Derive Fire Health from the latest 7 scored days, ordered newest to oldest, with the
newest score weighted most heavily and the seventh score weighted least.

- Use a simple weighted average so recent quality dominates the result.
- Treat the health model as bounded and cheap to recompute whenever the score map changes.
- If fewer than 3 scored days are available, fall back to the neutral state rather than amplifying
  a noisy sample.

**Rationale**: The feature brief explicitly says Fire Health should reflect score quality more than
raw streak length. A short weighted window gives the user a readable "recent effort" signal without
letting old history dominate.

**Alternatives considered**:
- *Entire streak history*: too much weight on old behavior and too easy to turn into hidden gameplay
  math.
- *Fixed calendar days with empty days as zeros*: simpler to explain, but it punishes inactivity in a
  way the brief did not ask for and can overstate weakness.

## R2. State thresholds and neutral fallback

**Decision**: Map the weighted quality score into four named states: Faint, Steady, Bright, and
Radiant. Use Steady as the neutral fallback when the sample is too small or too noisy.

- Faint is reserved for the weakest recent quality.
- Steady is the center band and the default when the window is underspecified.
- Bright represents clearly strong recent effort.
- Radiant represents the strongest recent effort and should feel unmistakably vivid.

**Rationale**: Four labels are already specified by the product brief. Using Steady as the fallback
keeps the scene calm and avoids implying failure when there simply is not enough recent data.

**Alternatives considered**:
- *Three states only*: simpler, but loses the requested named progression.
- *Make Faint the default*: too pessimistic and would visually punish new or sparse histories.

## R3. Visual expression

**Decision**: Express Fire Health through existing flame presentation channels: overall glow,
warmth, ember density, silhouette energy, and a small visible state label in the caption area.

- The flame itself should read as steadier, warmer, brighter, or more radiant as health improves.
- Lower health should keep the fire alive but make it feel more fragile, subdued, or less expansive.
- The named state should be visible in the same fire scene so the user can read it without leaving
  the flame context.

**Rationale**: This matches the user's requirement that the state be visible through flame
behavior, while still giving the user a clear label for the state name.

**Alternatives considered**:
- *Text-only badge without flame changes*: easier to implement, but it fails the "through flame
  behavior" requirement.
- *Flame changes only with no label*: visually subtle, but the named state would be harder to read
  and harder to test.

## R4. Rendering and performance strategy

**Decision**: Reuse the existing pure domain/render split and compute Fire Health only when the
derived score history changes. Keep the model bounded, memoized, and free of timers or frame loops.

- No new packages are needed; the current Expo/Skia/Reanimated stack already covers the flame
  scene.
- The health helper should be pure and easy to unit-test.
- The flame renderer should consume a small set of numeric modifiers instead of doing any heavy
  work inline.

**Rationale**: The user explicitly asked for clean, maintainable, expandable code with no
significant performance regressions. The current app already follows this pattern for the flame and
atmosphere features, so Fire Health should do the same.

**Alternatives considered**:
- *Introduce a separate animation system*: unnecessary and riskier for performance.
- *Compute health in the render body every frame*: would be harder to test and could add avoidable
  work.

<!-- gardener-maintenance-note:start dadb9e4d-dfc7-4650-be14-dffd91d9015f -->
## Gardener maintenance note

Gardener opened this maintenance PR from plan `dadb9e4d-dfc7-4650-be14-dffd91d9015f`.

- Goal: QA seeded docs plan 1
- Evidence: Seeded for COD-207 slice B QA.
- Entropy impact: none
- Verification: Markdown note only.
<!-- gardener-maintenance-note:end dadb9e4d-dfc7-4650-be14-dffd91d9015f -->

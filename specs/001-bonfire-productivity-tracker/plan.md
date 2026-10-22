# Implementation Plan: Bonfire Productivity Tracker

**Branch**: `001-bonfire-productivity-tracker` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-bonfire-productivity-tracker/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

A static, offline, single-screen **Expo** (React Native + TypeScript) app. The whole screen is a
living bonfire; the calendar rises over it as a swipe-up bottom sheet. The user scores each day 1–5;
the fire's strength is the cumulative sum of per-day contributions (1→+0 … 5→+4) over the current
alive run, two consecutive missed past days extinguish it (reset to 0), and any score relights it.
A settings button (top-right) lets the user pick the flame color (Amber / Crimson / Sapphire), which
persists. All state is derived deterministically from the local calendar; scores + the color choice
persist on-device.

**This revision pivots the implementation to match a concrete design** (now provided locally in
`BonfireDesign/`) **as closely as possible**, including the flame's look and animation, and mandates
**Expo** as the build system. The flame is rendered with **React Native Skia** (GPU canvas: blurred
gradient flame tongues, halo/ground-glow, ember particles, smoke, hearth logs/coals) driven by
**Reanimated** on the UI thread to hold ≥120 FPS. The calendar sheet uses **gesture-handler +
Reanimated**.

##  Source (MUST DO)

The design is now provided **locally** (the earlier hosted URL 404'd). It is the canonical
look-and-feel reference and MUST be matched closely:

1. **Read the design bundle** in `BonfireDesign/`: `Bonfire.html`, `styles.css` (the full visual
   system + keyframes), `fire.jsx` (flame composition + ember/transition logic), `calendar.jsx`
   (sheet + month grid + picker), `app.jsx` (layout, flame palettes, dev pill), `logic.js` (fire
   math — matches our engine), and the reference images in `BonfireDesign/screenshots/`
   (`open.png`, `open2.png`, `open3.png`).
2. **Match it closely.** The delivered app MUST look almost identical to the screenshots — the
   full-screen flame (layered blurred gradient tongues + halo + ground-glow + rising embers + caption
   "INFERNO / strength N"), the dark navy night background, and the calendar bottom sheet (heat-ramp
   day cells with pips, today ring, missed dots, month nav, inline 1–5 picker).
3. **Flame fidelity is a hard requirement.** Reproduce the flame's shape, color ramp, glow, flicker
   and ignite/grow/out transitions. The CSS uses blur + radial/linear gradients + `mix-blend-mode:
   screen` + brightness — none of which plain RN views do well, so the flame MUST be built with Skia
   (see research.md R2).

Where the design and spec disagree: **spec wins on mechanics** (e.g. FR-020 caps forward month
navigation at the current month even though the design's `next` button is unrestricted; the design's
top-right dev pill is replaced by the FR-016 settings button, with the advance-day control kept as a
`__DEV__`-only affordance), **design wins on look-and-feel.**

## Technical Context

**Language/Version**: TypeScript (strict), React + React Native via **Expo SDK** (adopt the Expo SDK
whose bundled RN/React is current; align the project's RN version to it — see research.md R1).

**Primary Dependencies**:
- **expo** (build system / managed + prebuild, config plugins for native modules)
- **@shopify/react-native-skia** — the flame (GPU canvas: gradients, blur, blend modes, ember
  particles). The single most important dependency for design fidelity + 120 FPS.
- **react-native-reanimated** — UI-thread animation (flame flicker/ignite/grow via shared values,
  sheet drag) so frames don't depend on JS.
- **react-native-gesture-handler** — swipe-up/down to open/close the calendar sheet.
- **expo-linear-gradient** — simple gradients (sheet backgrounds, buttons) where Skia is overkill.
- **@react-native-async-storage/async-storage** — local persistence (scores + settings). (Works
  under Expo; `expo-sqlite`/MMKV not needed for this tiny dataset.)
- **react-native-safe-area-context** — safe-area insets (already present, Expo-supported).

**Storage**: Local only. Two persisted values: the date→score map and the chosen flame color. No
backend, no network at runtime.

**Testing**: Jest (`jest-expo` preset) + react-test-renderer. The pure fire engine + date helpers
are unit-tested exhaustively; components get behavior/render tests with Skia/Reanimated/gesture
mocked.

**Target Platform**: iOS + Android via Expo, mobile portrait, offline.

**Project Type**: Static single-screen mobile app (client-only, offline-first), design-faithful.

**Performance Goals**: Flame sustains **≥120 FPS** on 120 Hz devices (Skia GPU rendering + Reanimated
UI-thread driving; no per-frame JS). Fire updates visibly < 3s after a score change (SC-001).

**No degrade path (fidelity is non-negotiable)**: the flame is ALWAYS rendered at full design fidelity
— there is no quality-reduction/device-tiered fallback (no dropping blur passes, layers, or
particles). The full-fidelity flame is engineered to hold ≥120 FPS via Skia + Reanimated; if a
low-end device cannot sustain it at full fidelity, **fidelity is preserved and the frame rate may
fall** (fidelity outranks frame rate). 120 FPS remains the target on capable hardware.

**Constraints**: Fully offline (design files are a build-time reference, not shipped network calls);
cold start < 3s with a loading placeholder until scores load (FR-015); the flame is the hero, the
calendar is one swipe away; no day/month navigation except backward month paging (FR-020).

**Scale/Scope**: Single user, single device. One screen + a settings surface + a calendar sheet;
one local entry per day.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Code Quality & Maintainability**: PASS — strict TS, no `any`, lint-clean, small reusable
  components; the pure fire engine stays framework-free.
- **II. Beginner-Readable Code (Explanatory Comments)**: PASS (planned) — every component/hook/engine
  function gets a header + plain-language inline comments; the Skia flame math (intensity curve,
  gradient stops, particle spawn) is commented heavily since it is the least obvious code.
- **III. Testing Standards (NON-NEGOTIABLE)**: PASS (planned) — engine unit tests (the design's
  `logic.js` behavior table), date tests, persistence (scores + color) tests, and screen behavior
  tests with native modules mocked.
- **IV. User Experience Consistency**: PASS (planned) — a single token source ported from
  `styles.css` (`:root` vars + heat ramp + palettes); loading/unlit/lit/out states all handled;
  accessibility labels on cells, picker, settings, and the flame.
- **V. Performance Requirements**: PASS (planned, raised bar) — Skia + Reanimated hold ≥120 FPS
  (exceeds the 60 FPS floor). This is the reason Skia is chosen over stacked blurred RN views, which
  could not hold frame rate with this many animated blurred layers.

**Complexity note**: this revision adds native dependencies (Skia, Reanimated, gesture-handler) and
migrates to Expo. Justified below in Complexity Tracking — required by the hard design-fidelity +
120 FPS requirements, with no simpler alternative that looks like the design.

## Project Structure

### Documentation (this feature)

```text
specs/001-bonfire-productivity-tracker/
├── spec.md, plan.md, research.md, data-model.md, quickstart.md
├── design-prompt.md          # original prompt (superseded by BonfireDesign/)
├── design/README.md          # fetch-attempt note (now superseded — design is local)
├── contracts/
│   ├── fire-engine.md
│   ├── entries-store.md
│   ├── settings-store.md     # NEW — persisted flame color
│   └── flame-and-theme.md    # NEW — flame intensity/visual contract + palettes
└── tasks.md                  # /speckit-tasks output
```

Canonical design reference lives at repo root in **`BonfireDesign/`** (read-only source of truth).

### Source Code (repository root)

```text
app.config.ts / app.json         # Expo config (name, icon, plugins: skia, reanimated, gesture-handler)
index.ts                         # Expo entry (registerRootComponent)
App.tsx                          # SafeArea + GestureHandlerRootView + BonfireScreen

src/
├── domain/
│   ├── fire.ts                  # PURE engine (matches BonfireDesign/logic.js): computeFire, contribution,
│   │                           #   classifyDay, fireLabel (Unlit/Out/Spark/Kindling/Steady/Blazing/Roaring/Conflagration)
│   └── dates.ts                 # local-date helpers (ymd/parse/addDays/diffDays/monthGrid)
├── data/
│   ├── entriesStore.ts          # AsyncStorage: date→score map
│   └── settingsStore.ts         # AsyncStorage: flame color choice
├── hooks/
│   ├── useEntries.ts            # load/setScore/clearScore + memoized fire + `ready`
│   └── useSettings.ts           # load/setFlameColor + `ready`
├── theme/
│   ├── tokens.ts                # ported from styles.css :root (bg, ink, heat ramp, line)
│   └── palettes.ts              # Amber/Crimson/Sapphire flame palettes (ember/amber/gold/core/red)
├── components/
│   ├── Bonfire/
│   │   ├── Flame.tsx            # Skia <Canvas>: flame tongues (gradients+blur+screen blend), halo,
│   │   │                       #   ground-glow, brightness; spark/lit/out; ignite/grow transitions
│   │   ├── Embers.tsx           # Skia ember particle system (spawn rate ~ intensity) + smoke (out)
│   │   ├── Hearth.tsx           # logs + coals (cold/grey when out)
│   │   ├── flameModel.ts        # PURE: strength→intensity (1−e^(−s/14)), height, glow, particle rate
│   │   └── FireCaption.tsx      # word/sub/strength caption from fireLabel
│   ├── Calendar/
│   │   ├── CalendarSheet.tsx    # swipe-up/down bottom sheet over the fire (gesture-handler+Reanimated),
│   │   │                       #   lifts/dims the flame as it opens
│   │   ├── MonthGrid.tsx        # month grid + ‹ › nav (next disabled at current month per FR-020)
│   │   ├── DayCell.tsx          # memo cell: scored(heat+pips)/today(ring)/missed(dot)/future(dim)/blank
│   │   └── ScorePickerBar.tsx   # inline 1–5 heat picker + Clear (slides up inside the sheet)
│   └── Settings/
│       └── SettingsSheet.tsx    # top-right button → choose flame color (Amber/Crimson/Sapphire)
└── screens/
    └── BonfireScreen.tsx        # full-screen Flame + CalendarSheet + settings button + __DEV__ advance-day

__tests__/
├── fire.test.ts                 # engine oracle (BonfireDesign/logic.js behavior)
├── dates.test.ts                # today-not-missed boundary
├── flameModel.test.ts           # intensity curve + monotonic strength→height
├── entriesStore.test.ts         # scores round-trip
├── settingsStore.test.ts        # flame-color round-trip + default Amber
└── BonfireScreen.test.tsx       # score grows fire; 2 misses → out; swipe reveals calendar; color change
```

**Structure Decision**: One Expo app, no API tier. Behavioral rules stay in framework-free
`src/domain` (mirroring `BonfireDesign/logic.js`) for exhaustive unit testing. The flame is isolated
in Skia components under `src/components/Bonfire` with a pure `flameModel.ts` for the math. Theme
tokens + palettes are ported directly from `styles.css`/`app.jsx`. Persistence (scores + settings)
is isolated in `src/data` behind hooks.

## Phasing

**Phase 0 — Research (research.md)**: Expo migration from bare RN; Skia flame approach (mapping the
CSS layers to Skia); Reanimated 120 FPS strategy; gesture-handler sheet; ember particle system;
palette/token port; aligning the engine to `logic.js`.

**Phase 1 — Design artifacts**: `data-model.md` (Daily Entry, Settings.flameColor, derived Fire State
with state/strength/everLit + label); `contracts/` (fire-engine, entries-store, **settings-store**,
**flame-and-theme**); `quickstart.md` (Expo run/test/validation incl. design side-by-side check).

**Phase 2 — Tasks** (`/speckit-tasks`): re-generated to cover Expo setup, Skia flame, sheet calendar,
settings/color, particles, loading state, and the design-fidelity review against the screenshots.

## Complexity Tracking

| Violation / addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| Migrate to **Expo** | User mandate; smooth native-module + build tooling for Skia/Reanimated | Bare RN CLI works but the user explicitly requires Expo |
| **react-native-skia** | The flame must look almost identical to the design (blur, gradients, screen blend, glow) and hold ≥120 FPS | Stacked blurred RN `Animated.View`s (the prior build) cannot reproduce the blend/blur look or hold frame rate |
| **reanimated** + **gesture-handler** | UI-thread flame animation (120 FPS) and the swipe-up calendar sheet | JS-driven `Animated` drops frames with this many layers; sheet drag needs native gestures |

<!-- gardener-maintenance-note:start 7dd91afa-7d83-4680-a4bc-0a300d711f74 -->
## Gardener maintenance note

Gardener opened this maintenance PR from plan `7dd91afa-7d83-4680-a4bc-0a300d711f74`.

- Goal: Manual maintenance run.
- Evidence: Manual trigger payload.
- Entropy impact: Manual verification.
- Verification: Review; do not merge without human approval.
<!-- gardener-maintenance-note:end 7dd91afa-7d83-4680-a4bc-0a300d711f74 -->

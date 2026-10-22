# Bonfire

Bonfire is a small Expo React Native productivity tracker. Instead of showing
tasks, charts, or streak counters first, it turns daily effort into a living
bonfire: log a 1-5 score for each day, keep the fire alive, unlock new flame
styles, and use the calendar to review or annotate past days.

The app is intentionally local-first. Scores, notes, and the selected flame are
stored on-device with AsyncStorage. The fire state, achievements, and health are
derived from that stored history, so the visual state can always be recomputed
deterministically.

## What It Does

- Tracks one daily productivity score from 1 to 5.
- Converts scores into bonfire strength.
- Allows one missed past day; two missed past days in a row extinguish the fire.
- Shows a swipe-up calendar sheet for logging, editing, clearing, and reviewing scores.
- Supports short per-day notes that do not affect score or fire logic.
- Unlocks collectible flame styles from streak and time-based achievements.
- Renders flame profiles with React Native Skia and Reanimated.
- Shows visual-only Fire Health from recent score quality: Faint, Steady, Bright, or Radiant.
- Adapts the scene atmosphere from local time without adding continuous JS timers.

## Tech Stack

- Expo SDK 56
- React Native 0.85
- React 19
- TypeScript strict mode
- React Native Skia for GPU-rendered flame, embers, glows, and visual effects
- React Native Reanimated for frame timing, gestures, and sheet animation
- React Native Gesture Handler for the swipe-up calendar sheet
- AsyncStorage for local entries, notes, and settings
- Jest with `jest-expo` for unit and component tests
- EAS Build profiles for development, preview, and production builds

## Requirements

- Node.js `>= 22.11.0`
- npm
- Expo CLI through the local `expo` package: `npx expo`
- Android Studio and an Android emulator for Android builds
- Xcode and iOS Simulator for iOS builds, macOS only
- EAS CLI for cloud builds: `npm install -g eas-cli`

## Setup

Install dependencies:

```sh
npm install
```

Inspect the resolved Expo config:

```sh
npx expo config
```

If native projects need to be regenerated from Expo config:

```sh
npx expo prebuild
```

Use prebuild only when changing native configuration or dependencies. Normal app
development should run from the existing project files.

## Run The App

Start the Expo dev server:

```sh
npm start
```

This runs:

```sh
npx expo start
```

Run on Android:

```sh
npm run android
```

Equivalent Expo command:

```sh
npx expo run:android
```

Run on iOS:

```sh
npm run ios
```

Equivalent Expo command:

```sh
npx expo run:ios
```

Run on web:

```sh
npm run web
```

Equivalent Expo command:

```sh
npx expo start --web
```

Start with a cleared Metro cache:

```sh
npx expo start --clear
```

## Build

Create local native builds with Expo run commands:

```sh
npx expo run:android --variant release
npx expo run:ios --configuration Release
```

Create EAS builds with the profiles in `eas.json`:

```sh
eas build --profile development --platform android
eas build --profile preview --platform android
eas build --profile production --platform android
eas build --profile production-ios --platform ios
```

The Android production profile builds an APK. The iOS production profile targets
a physical device build.

## Useful Commands

```sh
npm start
npm run android
npm run ios
npm run web
npm test
npm run lint
npx expo start --clear
npx expo prebuild
npx expo config
```

Run a single Jest file:

```sh
npx jest __tests__/fire.test.ts
```

Run tests in watch mode:

```sh
npx jest --watch
```

## How The Project Works

The app has one main screen:

- `App.tsx` wires providers and renders the app.
- `src/screens/BonfireScreen.tsx` composes the bonfire scene, hearth, caption,
  settings sheet, dev day control, and calendar sheet.
- `src/components/Bonfire/` contains the Skia fire scene, flame renderer,
  embers, hearth, caption, atmosphere, and flame visual model.
- `src/components/Calendar/` contains the bottom sheet calendar, month grid,
  day cells, score picker, and note editor.
- `src/components/Settings/` contains the flame gallery and flame rows.
- `src/domain/` contains pure business logic for dates, fire state, metrics,
  achievements, flame pulses, atmosphere, and Fire Health.
- `src/data/` is the persistence boundary for AsyncStorage.
- `src/hooks/` connects storage and domain logic to React components.
- `specs/` contains feature plans, specs, data models, contracts, and tasks.

Most app behavior is derived, not persisted. Stored data is limited to:

- `bonfire.entries.v1`: date key to score map
- `bonfire.dayNotes.v1`: date key to note text map
- `bonfire.settings.v2`: selected flame style

## Fire Rules

Scores are stored per date as integers from 1 to 5.

- Score 1 keeps the fire alive but adds no strength.
- Score 2 adds 1 strength.
- Score 3 adds 2 strength.
- Score 4 adds 3 strength.
- Score 5 adds 4 strength.
- An unscored current day is not a miss yet.
- One missed past day is survivable.
- Two missed past days in a row extinguish the fire and reset strength to 0.
- A later scored day relights the fire from a fresh spark.

The pure fire engine lives in `src/domain/fire.ts`.

## Flame Styles And Achievements

The flame catalog lives in `src/domain/flames.ts`. Each flame defines:

- id and display name
- rarity tier
- color gradient
- derived Skia palette
- locked ember palette
- achievement requirement
- BonfireDesign visual profile

Unlocks are derived in `src/domain/achievements.ts`.

There are two achievement families:

- Streak flames unlock only while the current lit run satisfies the condition.
- Time flames unlock on a completion day and stay available through a limited
  window while the fire remains lit.

If a saved flame relocks, the app falls back to the base Amber flame.

## Skia Rendering

The fire is rendered with `@shopify/react-native-skia`.

`FireScene` owns a single Skia `Canvas` for both flame and embers. This avoids
stacking multiple full-screen canvases over the scene. `BonfireScreen` provides a
shared Reanimated clock so flame and embers animate from one UI-thread frame
source rather than using per-frame JavaScript work.

`Flame.tsx` is profile-driven. It reads the active flame's visual profile and
turns it into Skia primitives:

- blurred radial ground glow
- aura or halo
- optional accents such as rings, bands, shock pulses, or afterimages
- layered tongue textures built from Skia paths and gradients
- profile-specific motion, sway, pulse, ribbon, warp, and hue drift behavior

The renderer does not branch by flame id. Flame identity comes from catalog data,
which keeps new flame styles mostly data-driven.

When the fire is `unlit` or `out`, the flame hides itself so the hearth and smoke
visuals take precedence.

## Fire Health

Fire Health is a visual-only state in `src/domain/fireHealth.ts`.

It looks at the latest scored days before today, caps the window at 7 samples,
weights newer scores more strongly, and maps recent quality to:

- Faint
- Steady
- Bright
- Radiant

Fire Health does not change streak survival, strength, storage, or unlock logic.
If the fire is not lit, health is suppressed and the renderer uses neutral
visual modifiers.

## Testing

Run the full test suite:

```sh
npm test
```

Run lint:

```sh
npm run lint
```

The tests cover pure fire rules, metrics, achievements, Fire Health, storage
cleaning, hooks, and key component wiring.

QA COD-124 maintainer commit after merging the constitution PR.

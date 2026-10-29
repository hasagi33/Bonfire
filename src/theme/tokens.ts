/**
 * tokens.ts — the app's design tokens, originally ported from the canonical
 * design (`BonfireDesign/styles.css` `:root`). Names mirror the CSS variables
 * (e.g. `--bg-0` → `bg0`) so it's easy to cross-check. The calendar heat ramp
 * was redefined in feature 003 (white → red) and now supersedes the CSS values.
 *
 * One source of truth for every color (Constitution Principle IV).
 */

// ---- Backgrounds (darkest → lifted) ----
export const bg0 = '#070a14'; // deep night
export const bg1 = '#0b1020'; // navy charcoal
export const bg2 = '#121a30'; // lifted panel

// ---- Ink / text ----
export const ink = '#f4ead8'; // warm off-white text
export const inkDim = '#8a93a8'; // muted slate
export const inkFaint = '#515b73'; // faintest labels / disabled

// ---- Default fire colors (the Amber palette's stops live in palettes.ts) ----
export const ember = '#ff7a18';
export const amber = '#ffae3b';
export const gold = '#ffd27a';
export const core = '#fff4cf';
export const red = '#b3380f';

// ---- Calendar heat ramp (per score 1..5, 003 US3) ----
// Reads as growing intensity: white → light yellow → yellow → orange → red.
// heat5 is deliberately a deep red (#c4310f, not a brighter #e8401c-style red):
// it must hold ≥4.5:1 contrast with its light text (FR-008) — verified pairing
// #c4310f + #fff2e8 ≈ 5.0:1.
export const heat1 = '#ffffff';
export const heat2 = '#fff3c4';
export const heat3 = '#ffd23b';
export const heat4 = '#ff9a2e';
export const heat5 = '#c4310f';

// ---- Surfaces ----
export const sheet = '#0e1426'; // calendar sheet base
export const line = 'rgba(255, 255, 255, 0.06)'; // hairline borders

/**
 * Heat color for a given score. Index 0 is unused (no score 0); scores 1..5 map
 * to heat1..heat5. Used to paint scored day cells and picker buttons.
 */
export const HEAT: readonly string[] = ['', heat1, heat3, heat2, heat4, heat5];

// Dark warm hairline drawn around the white "1" so it stays visible against
// light surfaces; only score 1 needs it. Pinned here — never hardcoded in a
// component — so buttons and day cells share the one value.
const HEAT_BORDER_1 = 'rgba(59,53,39,0.45)';

// Per-score text colors: dark warm tones on the light 1–4 fills, light cream
// on the red 5. Each pairing holds ≥4.5:1 contrast (asserted in tests, FR-008).
const HEAT_TEXT: readonly string[] = ['', '#3b3527', '#3a3008', '#3a2a04', '#3a1c04', '#fff2e8'];

/**
 * Text/glow/border treatment for a scored cell or picker button.
 * Dark numerals on the light 1–4 fills, light on the red 5; 4 and 5 keep their
 * soft outer glow; the white "1" additionally gets an outline (`border`) so it
 * doesn't vanish against light backgrounds.
 */
export function heatStyle(score: number): {
  background: string;
  color: string;
  glow: string | undefined;
  border: string | undefined;
} {
  const background = HEAT[score];
  const color = HEAT_TEXT[score];
  const glow =
    score >= 4
      ? score === 5
        ? 'rgba(196,49,15,0.55)'
        : 'rgba(255,154,46,0.45)'
      : undefined;
  const border = score === 1 ? HEAT_BORDER_1 : undefined;
  return { background, color, glow, border };
}

// Grouped export for convenient `import { tokens } from ...` style access.
export const tokens = {
  bg0,
  bg1,
  bg2,
  ink,
  inkDim,
  inkFaint,
  ember,
  amber,
  gold,
  core,
  red,
  heat1,
  heat2,
  heat3,
  heat4,
  heat5,
  sheet,
  line,
} as const;

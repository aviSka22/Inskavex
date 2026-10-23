# Inskavex — Design System

The visual identity and the tokens behind it. All tokens live as CSS custom
properties at the top of [`src/assets/css/styles.css`](src/assets/css/styles.css).

---

## 1. Concept — “the next piece”

The Inskavex mark is a solid block with its top-right quadrant lifted out and
offset up and to the right, in the accent color. It reads as *what has been built*
and *the next piece, about to be placed* — a direct expression of
“Building What’s Next” and of careful, incremental engineering.

The concept is reused deliberately, never decoratively:

| Where | How |
| --- | --- |
| Logo & favicon | The mark itself |
| Hero artwork | The mark drawn as a tiled construction plan: built tiles, a dashed slot, the ember piece and a placement arrow (“Fig. 01”) |
| Bullets, eyebrows, footer tagline | A small ember square (`.mark-dot`) |
| Focus-area icons | Each custom icon contains one solid ember “next piece” |
| 404 page | The block with the piece missing: “This piece is missing.” |
| OG image | Headline + the mark at large scale |

### What the design avoids (by intent)

No gradient blobs, glassmorphism, floating shapes, stock imagery, fake terminals,
glows, or rows of identical rounded cards. Structure comes from typography,
hairline rules, a 12-column grid and whitespace.

---

## 2. Logo

| Asset | File |
| --- | --- |
| Lockup, for light backgrounds | `src/public/brand/inskavex-logo.svg` |
| Lockup, for dark backgrounds | `src/public/brand/inskavex-logo-light.svg` |
| Mark only (SVG / PNG 512) | `src/public/brand/inskavex-mark.svg`, `inskavex-mark.png` |
| Inline (site header/footer) | `src/partials/logo.html` (uses `currentColor`) |
| Favicon (adapts to dark tabs) | `src/public/favicon.svg`, `favicon.ico` |
| App icons | `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` |

- Wordmark: Archivo, width 112 %, weight 640, tracking −0.012 em, outlined to SVG paths
  (no font dependency). Cap height = 20/32 of the mark height.
- Clear space: at least the width of the ember square on every side.
- Minimum size: mark 16 px; lockup 96 px wide.
- Do not recolor the ember square, stretch, rotate, or add effects.
- Regenerate: `python3 scripts/brand/build_logo.py` then `npm run assets:images`.

---

## 3. Color

| Token | Hex | Role |
| --- | --- | --- |
| `--ink-950` | `#0E0F0D` | Dark background, primary text on light |
| `--ink-900` | `#151713` | Raised dark surface (form panel) |
| `--ink-800` | `#1C1F1A` | Artwork tiles |
| `--ink-700` | `#262A23` | Dark hairlines |
| `--ink-600` | `#3A3E36` | Dark dividers |
| `--ink-500` | `#6E7367` | Form-field borders on dark (≥ 3:1) |
| `--stone-300` | `#A2A396` | Muted text on dark |
| `--paper-50` | `#F3F1EC` | Light background, text on dark |
| `--paper-100` | `#E9E6DE` | Alternate light section |
| `--paper-300` | `#D3CFC4` | Light hairlines |
| `--stone-600` | `#5B5C53` | Muted text on light |
| `--ember-500` | `#F0532D` | Accent: mark, buttons, markers, focus on dark |
| `--ember-600` | `#B83A16` | Accent text and focus ring on light |

Semantic roles (`--bg`, `--text`, `--text-muted`, `--line`, `--accent-text`,
`--focus`) are redefined for dark contexts (`.section--ink`, `.hero`, header, footer),
so components work on both without variants.

### Measured contrast (WCAG 2.x)

| Pair | Ratio | Requirement |
| --- | --- | --- |
| Paper text on ink | 17.0 : 1 | AA text ✓ |
| Muted `#A2A396` on ink / ink-900 | 7.5 / 7.1 : 1 | AA text ✓ |
| Muted `#5B5C53` on paper / paper-100 | 6.0 / 5.4 : 1 | AA text ✓ |
| Ember-500 on ink | 5.5 : 1 | AA text ✓ |
| Ink text on ember-500 (buttons) | 5.5 : 1 | AA text ✓ |
| Ember-600 on paper / paper-100 | 5.1 / 4.6 : 1 | AA text ✓ |
| Error `#FF8A6B` on ink-900 | 7.8 : 1 | AA text ✓ |

axe-core reports zero contrast violations on every page (see `TESTING_CHECKLIST.md`).

---

## 4. Typography

| Family | Use | Files |
| --- | --- | --- |
| **Archivo** (variable: weight 300–800, width 100–125 %) | Everything | `src/assets/fonts/archivo-var.woff2` (48 KB, Latin subset) |
| **JetBrains Mono** (variable: weight 400–600) | Small technical labels only | `src/assets/fonts/jetbrains-mono-var.woff2` (12 KB, ASCII subset) |

Both are SIL Open Font License (licenses shipped alongside). Self-hosted, subset with
`fonttools`; Archivo is preloaded; a metric-adjusted Arial fallback limits layout shift.

| Token | Value | Use |
| --- | --- | --- |
| `--text-display` | `clamp(2.5rem, 1.35rem + 5vw, 6.25rem)` | Hero headline (width 112 %, −0.04 em) |
| `--text-3xl` | `clamp(2.125rem, 1.45rem + 3vw, 4rem)` | Section titles (width 108 %, −0.03 em) |
| `--text-2xl` | `clamp(1.5rem, 1.25rem + 1.2vw, 2.25rem)` | Service / principle titles |
| `--text-xl` | `clamp(1.25rem, 1.1rem + 0.7vw, 1.75rem)` | Lead text, step titles |
| `--text-lg` | `clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem)` | Intros, hero lead |
| `--text-base` | `clamp(1rem, 0.96rem + 0.2vw, 1.125rem)` | Body (line-height 1.6) |
| `--text-sm` / `--text-xs` | 0.875 / 0.75 rem | Meta text / mono labels (uppercase, +0.08 em) |

Headings use `text-wrap: balance`; paragraphs `text-wrap: pretty`. Reading width ≤ 68 ch.

---

## 5. Space, layout and breakpoints

- Spacing scale (4 px base): `--space-1` 4 px … `--space-9` 96 px.
- Section rhythm: `--section-space: clamp(4.5rem, 2.75rem + 7vw, 9.5rem)`.
- Container: 1360 px max + fluid gutter `clamp(1.25rem, 0.6rem + 3.2vw, 3.5rem)`.
- Grid: 12 columns, gap `clamp(1rem, 0.5rem + 2vw, 2.5rem)`, from 56 em.
- Breakpoints (content-driven): **40 em** (640 px) two-column lists & form;
  **56 em** (896 px) split headings, services table; **64 em** (1024 px) desktop
  navigation & two-column sections; **72 em / 80 em** four-column values,
  four-column service rows, single-line capability strip.
- Header height token `--header-height` (68 / 76 px) drives `scroll-padding-top`,
  so anchor targets never sit under the sticky header.

## 6. Shape, depth and motion

- Radius: 2 px (buttons, fields). Deliberately square, in keeping with the mark.
- Depth: hairlines and tone changes rather than shadows.
- Durations: 160 ms (hover), 280 ms (menu, icons), 700 ms (reveals, service rule).
- Easing: `cubic-bezier(0.2, 0.7, 0.1, 1)`.
- Motion inventory: hero piece placement (once), section reveal on scroll,
  link/icon nudges, service-row ember rule, menu fade. All disabled under
  `prefers-reduced-motion: reduce`; reveals are only enabled once JavaScript is
  running, so content is never hidden if scripts fail.

## 7. Focus and states

- Focus ring: 2 px solid `--focus` (ember-600 on light, ember-500 on dark), 3 px offset.
- Errors: text + “!” glyph + thicker border — never color alone.
- Status messages: icon + bold title + explanation, in a polite live region.

## 8. Components

| Component | Classes |
| --- | --- |
| Eyebrow label | `.eyebrow`, `.eyebrow__index`, `.eyebrow--on-dark` |
| Section heading | `.section-head`, `.section-head--split`, `.section-title`, `.section-intro` |
| Buttons | `.button` + `--accent`, `--ink`, `--ghost-dark`, `--large` |
| Links | `.text-link`, `.link-arrow` |
| Services index | `.services`, `.service`, `__index`, `__title`, `__problem`, `__desc`, `__tags` |
| Process | `.steps`, `.step` (vertical rail on phones, 2/3-column grid above) |
| Focus areas | `.focus`, `.focus__item`, `.focus__icon` |
| Principles | `.principles`, `.principle` |
| FAQ | `.faq__item` (native `<details>`) |
| Form | `.field`, `.field__input`, `.field__error`, `.form-notice`, `.form-status` |

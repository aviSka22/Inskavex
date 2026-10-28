# Texponex — Design System

The visual identity and the tokens behind it. All tokens live as CSS custom
properties at the top of [`src/assets/css/styles.css`](src/assets/css/styles.css).

---

## 1. Concept — “to the power of next”

The name reads *T-expon-ex*. The identity makes that literal: a small ember square
set like a mathematical **exponent** — on the wordmark (“Texponex▪”) and on the
symbol (a T with the same exponent). It stands for *the next piece*, placed with
intent: growth built on solid, modular foundations — “Building What’s Next”.
The full logo system and print kit are in [`brand/`](brand/README.md).

The concept is reused deliberately, never decoratively:

| Where | How |
| --- | --- |
| Logo, symbol & favicon | The exponent itself |
| Hero artwork | The symbol drawn as a tiled construction plan: the T assembles, guides show the exponent rule, then the ember piece is placed (“Fig. 01”) |
| Bullets, eyebrows, footer tagline | A small ember square (`.mark-dot`) |
| Focus-area icons | Each custom icon contains one solid ember “next piece” |
| 404 page | The T with its exponent missing: “This piece is missing.” |
| OG image | Logo, headline and the symbol’s construction drawing |

### What the design avoids (by intent)

No gradient blobs, glassmorphism, floating shapes, stock imagery, fake terminals,
glows, or rows of identical rounded cards. Structure comes from typography,
hairline rules, a 12-column grid and whitespace.

---

## 2. Logo

| Asset | File |
| --- | --- |
| Asset | File |
| --- | --- |
| Primary logo, light / dark backgrounds | `src/public/brand/texponex-logo.svg`, `texponex-logo-light.svg` |
| Symbol (SVG / PNG 512) | `src/public/brand/texponex-mark.svg`, `texponex-mark.png` |
| Inline (site header/footer) | `src/partials/logo.html` (uses `currentColor`) |
| Hero artwork | `src/partials/hero-art.html` |
| Favicon (adapts to dark tabs) | `src/public/favicon.svg`, `favicon.ico` |
| App icons | `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` |
| **Print & everything else** | **`brand/`** — SVG, CMYK vector PDF and PNG in four colorways, business card, avatars, guide |

- **Wordmark:** Archivo, width 112 %, weight 640, tracking −0.012 em, real font
  kerning (HarfBuzz), outlined to paths — no font dependency anywhere.
- **Exponent rule:** side 0.46 × cap height, centered on the cap line, 0.125 × cap
  height from the last letter. The symbol uses the same rule on a 3-unit grid
  (T: bar 9t × 3t, stem 3t × 6t; exponent 4t; gap 1t).
- **Clear space:** one exponent width on every side. **Minimum size:** logo 25 mm /
  100 px wide; symbol 6 mm / 16 px.
- Do not recolor the square, stretch, rotate, retype, or add effects.
- **Regenerate everything:** `npm run brand` (`scripts/brand/brand.py` +
  `scripts/brand/render-images.mjs`). Never edit the generated files by hand.

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
- Easing for entrances: `--ease-expo: cubic-bezier(0.16, 1, 0.3, 1)`; stagger step `--stagger: 90ms`.

### Motion inventory

Every motion expresses the brand idea — *things are built, then the next piece is placed* —
and nothing loops or moves on its own after it has arrived.

| Moment | Motion | Implementation |
| --- | --- | --- |
| Hero load | Eyebrow, then headline rises word by word from a mask; lead and buttons follow | CSS keyframes; words pre-split in HTML (`.w`) |
| Hero load | Artwork assembles in 11 diagonal courses from the bottom-left, the dashed slot appears, the ember piece settles into place, then the arrow and caption | CSS keyframes on SVG groups (grouped to keep main-thread cost low) |
| Hero load | Capability strip items rise in sequence | CSS, `.dl-n` delay classes |
| Section titles | Rise word by word as they enter | `main.js` splits words; CSS transitions |
| Content blocks | Fade-and-rise; items arriving together are staggered in reading order | IntersectionObserver assigns `--dl` |
| List top rules | Draw left → right | `.rule-draw::before` scaleX |
| Process | Markers draw in sequence (vertical rail on phones, bars above) | `.step::before` scale |
| Focus icons | The ember “next piece” of each icon is placed on arrival; nudges on hover | inline SVG, `.icon-accent` |
| Statement band | Words light up as the passage is read (reversible) | scroll-linked, rAF-throttled |
| Header | 2 px ember reading-progress line | `--progress` on the header |
| Mobile menu | Links rise in sequence | CSS |
| Hover | Ghost buttons fill-wipe; arrows nudge; service title shifts toward the ember rule | CSS |

Safeguards: everything is disabled under `prefers-reduced-motion: reduce` (headings are
then not split and the statement is fully lit); scroll reveals switch on only after the
IntersectionObserver's first callback, so content already on screen never flashes and
nothing is hidden if JavaScript fails; the CSP needs no inline styles (delays are classes
or CSSOM custom properties).

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
| Process | `.steps`, `.step` (vertical rail on phones, 2/3-column grid above), `.standards` |
| Statement band | `.statement`, `.statement__text`, `.statement__accent` |
| Contact next steps | `.next-steps` |
| Focus areas | `.focus`, `.focus__item`, `.focus__icon` |
| Principles | `.principles`, `.principle` |
| FAQ | `.faq__item` (native `<details>`) |
| Form | `.field`, `.field__input`, `.field__error`, `.form-notice`, `.form-status` |

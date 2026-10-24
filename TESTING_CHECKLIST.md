# Testing Checklist and Report

Results below were **actually run** in the cloud development environment on
**2026-10-23**, and re-run on **2026-10-24** after the motion and refinement pass, (Linux container, Node 22.22, headless Chromium 1243 via Playwright 1.63).

**Labels:** **Automated** = scripted check · **Browser-tested** = run in a real
(headless) Chromium · **Physical-device tested** · **Not tested** · **Blocked**

No physical phone, tablet, Safari or Firefox was available in this environment.
Nothing here has been deployed; there is no live URL.

---

## Summary

| Area | Result | Label |
| --- | --- | --- |
| Clean install (`npm ci`) | ✅ 0 vulnerabilities | Automated |
| Production build (`npm run build`) | ✅ 3 pages, ~15 ms | Automated |
| Static checks (`npm run check`) | ✅ 9 / 9 passed | Automated |
| Browser tests (`npm run test:e2e`) | ✅ 52 / 52 passed | Browser-tested (Chromium) |
| Accessibility — axe-core WCAG 2.2 A/AA + best practice | ✅ 0 violations (3 pages × 2 widths, open menu, form error & status states) | Browser-tested |
| Lighthouse | ✅ see table below | Browser-tested (Chromium, local server) |
| `npm run dev` (serves, rebuilds on change) | ✅ | Automated (curl) |
| `npm run preview` (200 for pages, 404 for unknown) | ✅ | Automated (curl) |
| Physical devices (iOS/Android) | — | **Not tested** |
| Safari / Firefox engines | — | **Not tested** |
| Live Cloudflare deployment, custom domain, HTTPS | — | **Blocked** (no account access; domain not purchased) |
| Real contact-form delivery | — | **Blocked** (no provider account/endpoint yet) |

### Commands

```bash
npm ci
npm run check          # build + static checks
npm run test:e2e       # 52 Playwright tests
npm test               # both of the above
```

---

## Lighthouse (measured)

Lighthouse 13.5.0, headless Chromium, against `npm run preview` (http://127.0.0.1:4173).
Mobile = default emulated mobile with throttling; Desktop = `--preset=desktop`.

| Page | Mode | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | Mobile | **98–99** (3 runs) | **100** | **100** | **100** | 1.8–2.0 s | 0 | 110–130 ms |
| `/` | Desktop | **100** | **100** | **100** | **100** | 0.4 s | 0 | 0 ms |
| `/privacy` | Mobile | **100** | **100** | **100** | **100** | 1.7 s | 0 | 20 ms |
| `/privacy` | Desktop | **100** | **100** | **100** | **100** | 0.4 s | 0 | 0 ms |

Home-page figures are from 2026-10-24, after the motion pass (before it: 99, TBT 40 ms).
The hero animation does not delay LCP; the small TBT increase comes from the
style work of the entrance animation on a throttled mobile CPU.

Notes: the 404 page cannot be scored (Lighthouse refuses non-200 pages; it is covered by
axe and Playwright). The local server does not compress responses; Cloudflare does, so
production transfer sizes will be smaller. Scores on a live deployment may differ —
re-run with PageSpeed Insights after deploying.

### Payload (uncompressed, per page load)

| File | Uncompressed | gzip -9 |
| --- | --- | --- |
| `index.html` (incl. inline SVG artwork, icons, logo) | 54 KB | 14 KB |
| `styles.css` | 40 KB | 8 KB |
| `main.js` | 13 KB | 4.5 KB |
| Fonts (already compressed woff2) | 48 KB + 12 KB | — |

No raster images on the pages (all artwork is inline SVG) · **0 third-party requests**.

---

## Requirement checklist

| # | Requirement | How verified | Result | Label |
| --- | --- | --- | --- | --- |
| 1 | Dependencies install | `npm ci` from a clean tree | ✅ | Automated |
| 2 | Production build succeeds | `npm run build` | ✅ | Automated |
| 3 | No syntax errors | `node --check` on built JS; html-validate on all pages; build fails on unknown template values | ✅ | Automated |
| 4 | No broken local asset references | `check.mjs` resolves every `href`/`src`, CSS `url()` and manifest icon; Playwright fails on any 4xx subresource | ✅ | Automated / Browser-tested |
| 5 | Internal navigation links work | `check.mjs` resolves every internal link and `#anchor`; Playwright clicks desktop and mobile nav | ✅ | Automated / Browser-tested |
| 6 | All required sections present | Playwright asserts `about, services, approach, focus, why, faq, contact` in order, 6 items each | ✅ | Browser-tested |
| 7 | Mobile navigation works | Opens/closes; `aria-expanded`; background `inert`; Escape closes and returns focus; link click closes and navigates; closes on resize to desktop | ✅ | Browser-tested |
| 8 | Contact form validation | Required fields, email format, minimum message length, `aria-invalid` + `aria-describedby`, focus to first error, live error clearing | ✅ | Browser-tested |
| 9 | Contact submission is honest | Unconfigured: “has not been sent”, **no network request**. Email-only build: pre-filled `mailto:`, “not been sent yet”. Endpoint build: “Message sent” only on 2xx; HTTP 500 and network failure show errors and keep the text | ✅ | Browser-tested (endpoint mocked — real provider **Blocked**) |
| 10 | Footer year updates automatically | Rendered at build time and updated by JS at runtime; test asserts current year | ✅ | Browser-tested |
| 11 | Metadata and titles | `check.mjs`: title length, description, canonical, OG/Twitter, favicon, one `h1`, unique ids, JSON-LD without unverified fields | ✅ | Automated |
| 12 | Sitemap and robots.txt | Generated in `dist/`; served; contents checked; 404 excluded | ✅ | Automated |
| 13 | No horizontal overflow | All 3 pages at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920 px — page width and every element’s bounds | ✅ | Browser-tested |
| 14 | Keyboard navigation | Skip link first and functional; menu keyboard behavior; FAQ toggles with Enter; visible focus styles | ✅ | Browser-tested |
| 15 | Reduced motion respected | With `reduce`: no reveal hiding, animation ≈ 0, `scroll-behavior: auto`, headings not split, statement fully lit | ✅ | Browser-tested |
| — | Motion completes correctly | After scrolling the whole page every revealed element is at full opacity and rest position; split headings keep their exact text; statement lights fully at the reading line; progress line reaches 100 % | ✅ | Browser-tested |
| 16 | No secrets committed | Pattern scan of all tracked files and `dist/` | ✅ | Automated |
| 17 | Cloudflare config matches stack | Build command/output verified locally; `_headers` parsed and applied by the preview server; CSP produces **zero** violations in tests | ✅ | Automated / Browser-tested |
| 18 | Setup & deployment docs | `README.md`, `DEPLOYMENT.md`; commands executed as documented | ✅ | Automated |
| — | Works without JavaScript | Content visible, nav links shown inline, no overflow, form submit disabled with explanation | ✅ | Browser-tested |
| — | Touch target size (WCAG 2.5.8) | All controls ≥ 24 × 24 px at 375 and 1440 px (most ≥ 44 px) | ✅ | Browser-tested |
| — | Minimum text size | No visible text below 12 px at 320 px | ✅ | Browser-tested |
| — | Brand spelling | Every variant of the name across repo and build must be “Inskavex” | ✅ | Automated |
| — | Config validation | Invalid `url`/email/endpoint fail the build with a clear message; `SITE_URL`/`ALLOW_INDEXING` overrides produce noindex + correct canonical | ✅ | Automated (manual run) |

### Visual review (screenshots inspected)

Browser screenshots were captured and reviewed at 320, 375, 390, 768, 1024, 1440 and
1920 px, plus the open mobile menu, form error/status states, privacy and 404 pages.

Defects found and fixed during review:

| Defect | Fix |
| --- | --- |
| Clicking **Send** right after typing an invalid email did nothing — the blur-time error shifted the layout mid-click | Skip blur validation when focus moves to the submit button; regression test added |
| Form grid stretched the neighbouring field when one field showed an error | `align-content: start` on fields |
| Tab could reach the skip link while the mobile menu was open | Skip link made `inert` with the background |
| Capability strip left dangling separators when wrapping; values row orphaned an item at 1024 px | Two/three-column grids below 80 em; explicit 2/4-column values grid |
| “Fig. 01” caption wrapped on phones; OG headline crowded the artwork | `nowrap`; resized OG artwork |
| html-validate: lowercase doctype, template whitespace; 404 description too short | Fixed in templates/build |
| (2026-10-24) Mobile TBT rose to ~240 ms after adding 48 individually animated SVG tiles and a layout-reading reveal setup | Tiles grouped into 11 animated courses; reveal setup reads no layout (uses the observer's first callback) → TBT ~120 ms, Performance 98–99 |
| (2026-10-24) Statement band left the right half empty on desktop; contact column duplicated FAQ content | Label moved to a left grid column; “helpful first message” list removed |

### Known limitations / not done

- Only Chromium was used. **Not tested:** Safari (iOS/macOS), Firefox, physical devices.
- Screen readers (VoiceOver, NVDA, TalkBack) — **Not tested**; semantics verified by axe.
- Real form delivery — **Blocked** until a provider endpoint exists.
- Lighthouse on a live URL — **Blocked** until deployed.

---

## Local verification checklist (for you, on a laptop and phone)

Run `npm install && npm run dev`, open http://localhost:3000, then:

- [ ] Hero, all sections, footer look right in Chrome **and** Safari/Firefox
- [ ] Resize the window from wide to narrow — nothing overlaps or scrolls sideways
- [ ] Mobile menu: open, choose a link, Escape key closes it
- [ ] Tab through the page: focus is always visible; “Skip to main content” appears first
- [ ] Submit the empty form → clear errors; valid form → honest “not sent” message
- [ ] macOS/iOS: Settings → Accessibility → Reduce Motion on → no animations
- [ ] `npm test` passes (after `npx playwright install chromium`)

After deploying (see `DEPLOYMENT.md`), on a real iPhone and Android phone:

- [ ] Open the `*.pages.dev` URL; scroll every section; open and close the menu
- [ ] Rotate to landscape; tap every button and link
- [ ] Fill in the form with the on-screen keyboard (email keyboard appears for Email)
- [ ] Share the URL in a messaging app and check the preview card

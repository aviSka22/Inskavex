# Texponex — Project Plan

Official corporate website for **Texponex**, a software and technology company.
Production domain: `https://texponex.com` (registered with Cloudflare Registrar) · email `hello@texponex.com`.

> **Brand update (2026-10-28):** the company name is **Texponex**. The project began
> under an earlier working name; the site, assets and documents were renamed throughout.

This plan was written after inspecting the repository (Phase 0) and is executed
in order. Live progress is tracked in [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md).

---

## 0. Repository inspection (findings)

| Item | Finding |
| --- | --- |
| Repository | `aviSka22/Inskavex` (GitHub) |
| Working branch | `ccr-9a63c2ce-k1gq04` |
| State at start | Empty — no commits, no files, empty remote |
| Existing work to preserve | None |
| Environment | Linux cloud container, Node 22, npm 10, Python 3.13, headless Chromium + Playwright available, npm registry reachable, Google Fonts blocked |

Because the repository was empty, the project is initialized from scratch.

---

## 1. Goals and non-goals

### Goals

1. Present Texponex as a credible, modern, serious software and technology company.
2. Make it clear within seconds what Texponex is, what it does, and how to get in touch.
3. Deliver a premium, distinctive, cohesive design that does not look like a generic template.
4. Excellent behavior on every screen size from 320 px phones to 1920 px displays.
5. Accessibility target: WCAG 2.2 AA.
6. Fast: tiny payload, no third-party runtime requests, strong Core Web Vitals.
7. Honest contact experience — never claim a message was sent when it was not.
8. Ready for Cloudflare Pages, with the domain connectable later without rebuilding.
9. Easy to maintain: business details (email, domain, form endpoint) live in one config file.

### Non-goals (first release)

- No database, authentication, custom backend, VPS or server code.
- No blog, CMS, portfolio or case studies (no verified work to show yet — nothing will be invented).
- No analytics, tracking, cookies or third-party scripts.
- No invented facts: legal entity, address, team, history, clients, testimonials, metrics, awards.
- No domain purchase, DNS changes, paid services or live deployment from this environment.

---

## 2. Target audiences

| Audience | What they need from the site |
| --- | --- |
| Business owners and managers | Understand what Texponex can build for them; an easy way to start a conversation |
| Founders / product owners | Confidence in engineering approach, process and communication |
| Organizations with existing systems | Evidence that integration, automation and improvement work is understood |
| Professional contacts and partners | A credible, professional first impression and contact route |

---

## 3. Brand positioning and content strategy

**Positioning:** an engineering-led software company that builds practical,
well-made software — clear to use, sound underneath, and straightforward to maintain.

**Tagline:** “Building What’s Next.” (used in the hero headline and footer, not repeated everywhere).

**Voice:** calm, precise, plain-spoken, confident without superlatives. Short
sentences. Concrete verbs. No “industry-leading”, “world-class”, “trusted by”.

**Content rules**

- Describe capabilities and intent, never claim results that need evidence.
- Every service states the *problem it addresses*, not just its name.
- The working process is presented as principles, not a guaranteed procedure.
- All business details that are unknown are configuration values, not invented text.

---

## 4. Visual direction and design principles

Full detail in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md).

- **Concept — “the next piece”.** The brand mark is a solid block with one quadrant
  lifted out and offset: what has been built, and the next piece about to be placed.
  The hero artwork expands this into a measured, tiled construction drawing.
- **Palette:** warm near-black “ink”, bone-white “paper”, and a single vermilion
  “ember” accent used sparingly (mark, focus rings, numerals, key rules).
- **Theme:** deliberate combination — dark ink for hero, approach and contact;
  light paper for the editorial reading sections. The rhythm alternates intentionally.
- **Typography:** Archivo variable (width + weight axes, self-hosted, subset) for
  everything, with semi-expanded widths for display type; JetBrains Mono for small
  technical labels only.
- **Layout:** 12-column editorial grid, hairline rules instead of boxed cards,
  generous negative space, numbered section labels.
- **Motion:** minimal — a single hero placement animation and gentle section reveals,
  all disabled under `prefers-reduced-motion`, never required for content visibility.

---

## 5. Sitemap and section architecture

```
/                 Home (single-page corporate site)
  #top            Hero — headline, lead, CTAs, capability strip, brand artwork
  #about          01 About Texponex
  #services       02 What we do (6 services, editorial index)
  #approach       03 How we work (6-step process)
  #focus          04 What we build (6 focus areas)
  (statement)     Statement band — how we measure good work
  #why            05 Why work with us (6 principles)
  #faq            06 Questions (incl. project-inquiry guidance)
  #contact        07 Contact — form + direct email
/privacy          Privacy notice (accurate to configured functionality)
/404              Not-found page
/sitemap.xml      Generated
/robots.txt       Generated
```

A single, well-navigated home page fits the current amount of verified content;
the privacy notice is a separate page because it is a distinct document.

---

## 6. Component architecture

| Component | Location | Notes |
| --- | --- | --- |
| `<head>` metadata | `src/partials/head.html` | Title, description, canonical, OG/Twitter, icons, CSP-hashed boot script |
| Header + navigation | `src/partials/header.html` | Sticky; desktop nav; accessible mobile menu |
| Footer | `src/partials/footer.html` | Brand, links, contact, legal, auto year |
| Logo | `src/partials/logo.html` | Inline SVG, `currentColor`, generated from the brand font |
| Icons | `src/partials/icons.html` | Small inline SVG sprite (6 custom icons) |
| Section heading | CSS `.section-head` | Numbered label + title + intro |
| Buttons / links | CSS `.button`, `.link-arrow` | Primary, secondary, on-dark variants |
| Form fields | CSS `.field` + `assets/js/main.js` | Labels, hints, errors, live status |

---

## 7. Technology selection

**Chosen:** semantic HTML + modern CSS + minimal vanilla JavaScript, assembled by a
small **zero-dependency Node build script**.

| Option | Verdict |
| --- | --- |
| Hand-written static files only | Rejected — header/footer/config would be duplicated across pages |
| Astro / React / Next | Rejected — unnecessary dependencies and build complexity for this scope |
| **Static HTML + tiny Node build (chosen)** | Partials, central config, asset hashing, sitemap/robots/headers generation, CSP hashes — with **no runtime dependencies at all** |

Build output: `dist/`. Development dependencies are limited to testing tools
(`@playwright/test`, `axe-core`, `html-validate`), pinned to exact versions.

---

## 8. Responsive design strategy

- Mobile-first CSS; breakpoints chosen from the content (≈ 40em, 56em, 72em, 90em).
- Fluid type and spacing via `clamp()` with sensible minimums and maximums.
- Max content width 1360 px; reading columns capped at ~68ch.
- Dedicated mobile compositions (hero artwork scales and reorders, process
  becomes a vertical rail, service rows restack), not simply shrunk desktop layouts.
- Touch targets ≥ 44 × 44 px; no hover-only functionality.
- Automated overflow checks at 320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920 px.

---

## 9. Accessibility requirements (WCAG 2.2 AA target)

Landmarks; one `h1` and logical heading order; skip link; visible focus rings
(≥ 3:1); contrast ≥ 4.5:1 for text; labelled form controls with associated errors
(`aria-describedby`, `aria-invalid`); live status region; accessible mobile menu
(`aria-expanded`, Escape to close, focus return, background `inert`);
`prefers-reduced-motion`; `lang="en"`; descriptive titles; decorative SVGs hidden
from assistive technology. Verified with axe-core in a real browser.

---

## 10. SEO and social sharing

Unique titles and descriptions, canonical URLs from one config value, Open Graph +
Twitter cards with a 1200 × 630 PNG, favicon (SVG + ICO + Apple touch icon), theme
color, web manifest, generated `sitemap.xml` and `robots.txt`, accurate JSON-LD
(`Organization` + `WebSite` only — no ratings, addresses or invented facts).
Indexing can be switched off for pre-launch preview deployments.

---

## 11. Contact functionality and privacy

- Polished, accessible form: name, email, organization (optional), topic, message.
- Client-side validation with accessible inline errors.
- Delivery is **configurable** (`contact.formEndpoint` in `site.config.mjs`), designed
  for a static-form provider such as Formspree (any endpoint accepting a `POST` of form
  data and returning 2xx on success works).
- **Honest states:**
  - Endpoint configured → real `POST`; success shown only on a 2xx response.
  - No endpoint, email configured → explains the form is not connected and offers a
    pre-filled `mailto:` fallback, stating it only opens the visitor’s email app.
  - Neither configured (current state) → clearly says the message has **not** been sent.
- No credentials or keys are invented or committed. Honeypot field for basic spam control.
- Form data is never sent to analytics or any other third party.

---

## 12. Security considerations

- No secrets in the repository; config contains only public values.
- Strict Content Security Policy generated at build time (`_headers`), including the
  sha256 hash of the single inline boot script and the configured form origin only.
- `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`,
  `frame-ancestors 'none'`, HSTS.
- No `innerHTML` with user input; all status messages use `textContent`.
- External links (if any) use `rel="noopener noreferrer"`.

---

## 13. Testing strategy

| Layer | Tool | Coverage |
| --- | --- | --- |
| Build | `npm run build` | Template errors, unknown variables, config validation |
| Static checks | `npm run check` | HTML validity (html-validate), internal links/anchors, asset references, metadata, sitemap/robots, brand spelling, secret patterns |
| Browser | Playwright (Chromium) | 10 viewports × overflow, nav, mobile menu, keyboard, form validation & honest states, footer year, reduced motion, CSP violations, console errors |
| Accessibility | axe-core in Playwright | WCAG 2.x A/AA rules on every page |
| Performance | Lighthouse (if runnable) | Performance, Accessibility, Best Practices, SEO |
| Visual | Screenshots reviewed manually | Mobile, tablet, laptop, desktop |

Every result is recorded honestly in [`TESTING_CHECKLIST.md`](TESTING_CHECKLIST.md)
as Automated / Browser-tested / Physical-device tested / Not tested / Blocked.

---

## 14. GitHub workflow

- Work on branch `ccr-9a63c2ce-k1gq04`; meaningful commits; no force-pushes.
- `.gitignore` excludes `node_modules/`, `dist/`, test output and `.env*`.

## 15. Cloudflare Pages deployment strategy

- Git integration: build command `npm run build`, output directory `dist`, Node 22 (`.nvmrc`).
- `_headers` generated into `dist/` for security and caching headers.
- Clean URLs (`/privacy`) match Cloudflare Pages behavior; `404.html` served automatically.
- Domain connection later via Pages → Custom domains; canonical URL is a single config
  value (also overridable with the `SITE_URL` environment variable).
- Full steps in [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## 16. Risks and dependencies

| Risk / dependency | Mitigation |
| --- | --- |
| Business email (now `hello@texponex.com`) must actually receive mail | Email Routing / mailbox set-up and test in `DEPLOYMENT.md` Step 5 |
| Form provider not configured | Honest UI states; one config value to enable |
| Domain purchased (`texponex.com`); hosting not yet connected | `DEPLOYMENT.md` Steps 2–4; canonical URL already set |
| Legal entity / privacy details unconfirmed | Privacy notice written to actual functionality; review items listed in `DEPLOYMENT.md` |
| No physical devices in the cloud | Browser-emulated viewports; local checklist for real devices |

---

## 17. Phases, stages and acceptance criteria

| Phase | Stage | Deliverable | Completion criteria |
| --- | --- | --- | --- |
| 0 Inspection & plan | 0.1 Inspect repo | Findings above | Repo state known |
| | 0.2 Plan docs | This file + status, design, testing, deployment docs | Committed |
| 1 Brand & art direction | 1.1 Strategy, palette, type | `DESIGN_SYSTEM.md` | Tokens defined, contrast checked |
| 2 Brand assets | 2.1 Mark + wordmark | `src/partials/logo.html`, `src/public/brand/*.svg` | Legible at 16 px and in header/footer |
| | 2.2 Favicon / touch icon / OG image | `src/public/*` | Referenced and present in build |
| 3 Architecture | 3.1 Build tooling | `scripts/*`, `site.config.mjs` | `npm run build` succeeds, zero runtime deps |
| | 3.2 Pages & sections A–K | `src/pages/*`, `src/partials/*` | All required sections present |
| 4 Design system | 4.1 CSS tokens & components | `src/assets/css/styles.css` | Tokens used consistently |
| 5 Stack | 5.1 Decision | Section 7 | Documented |
| 6 Responsive | 6.1 Layouts at all ranges | CSS | No overflow at 10 widths (automated) |
| 7 Interaction | 7.1 Nav, menu, reveals, form | `src/assets/js/main.js` | Browser tests pass; reduced motion respected |
| 8 Accessibility | 8.1 Semantics, focus, forms | — | axe: 0 violations; keyboard tests pass |
| 9 Performance | 9.1 Fonts, hashing, minification | — | Lighthouse measured (target ≥ 90) |
| 10 SEO | 10.1 Metadata, sitemap, robots, JSON-LD | — | Static checks pass |
| 11 Security | 11.1 Headers, CSP, secrets | `_headers` | No CSP violations in browser tests; secret scan clean |
| 12 Testing | 12.1 Run, fix, re-run | `TESTING_CHECKLIST.md` | Results recorded honestly |
| 13 Local readiness | 13.1 README | `README.md` | Commands verified in the cloud |
| 14 GitHub | 14.1 Commit & push | Branch `ccr-9a63c2ce-k1gq04` | Push succeeded |
| 15 Cloudflare readiness | 15.1 Config + guide | `DEPLOYMENT.md`, `.nvmrc`, `_headers` | Build command/output documented & verified |
| 16 Final review | 16.1 Review vs. definition of done | Status doc updated | All criteria met or listed as external |

---

## 18. Definition of done

See the original brief; summarized: complete site implemented in this repository,
consistent brand, all sections, responsive at all target widths, working navigation,
honest validated contact form, complete footer, SEO/social metadata, accessibility
and performance checked, production build succeeds, tests run and recorded, local
and Cloudflare instructions complete, domain-ready, docs reflect reality, pushed.

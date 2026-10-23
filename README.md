# Inskavex — Website

Official website of **Inskavex**, a software and technology company. *Building What’s Next.*

A fast, accessible, static corporate site: semantic HTML, modern CSS and a little
vanilla JavaScript, assembled by a small **zero-dependency** Node build script and
ready for **Cloudflare Pages**.

| | |
| --- | --- |
| Pages | Home (hero, about, services, approach, what we build, why Inskavex, FAQ, contact), privacy notice, 404 |
| Runtime dependencies | None — no framework, no third-party scripts, fonts or images |
| Build output | `dist/` |
| Planned domain | `https://inskavex.com` (not yet purchased) |

Project documents: [Plan](PROJECT_PLAN.md) · [Status](IMPLEMENTATION_STATUS.md) ·
[Design system](DESIGN_SYSTEM.md) · [Testing](TESTING_CHECKLIST.md) · [Deployment](DEPLOYMENT.md)

---

## 1. Prerequisites

- **Node.js 20 or newer** (22 recommended — see `.nvmrc`). Check with `node --version`.
- **Git**.
- For browser tests only: Playwright’s Chromium (installed with one command below).

## 2. Get the code

```bash
git clone https://github.com/aviSka22/Inskavex.git
cd Inskavex
git checkout ccr-9a63c2ce-k1gq04   # the branch containing this work (or main, once merged)
```

## 3. Install

```bash
npm install
```

This installs **development tools only** (Playwright, axe-core, html-validate).
The site itself has no dependencies, so `npm run build` works even without this step.

## 4. Run locally

```bash
npm run dev
```

Open **http://localhost:3000**. The site rebuilds automatically when you edit files in
`src/` or `site.config.mjs` — refresh the browser to see changes. Stop with `Ctrl+C`.
Use another port with `PORT=8080 npm run dev`.

## 5. Production build and preview

```bash
npm run build      # writes the production site to dist/
npm run preview    # builds, then serves dist/ at http://localhost:4173
```

The preview server mimics Cloudflare Pages: clean URLs (`/privacy`), the real
`404.html` with a 404 status, and the generated security headers (including the
Content Security Policy) — so what works in preview works in production.

## 6. Tests

```bash
npx playwright install chromium   # once per machine
npm test                          # build + static checks + 48 browser tests
```

| Command | What it does |
| --- | --- |
| `npm run check` | Build, then static checks: HTML validity, metadata, links/anchors, assets, sitemap/robots, CSP hashes, brand spelling, secret scan, size budgets |
| `npm run test:e2e` | Browser tests only (layout at 10 widths, navigation, mobile menu, keyboard, form states, reduced motion, no-JS, axe accessibility) |
| `npm run check:launch` | Fails until the launch settings (email, form endpoint, …) are configured |

An HTML report is written to `playwright-report/` (`npx playwright show-report`).

## 7. Configuration — business details live in one file

Everything business-specific is in **[`site.config.mjs`](site.config.mjs)**. Edit it,
then rebuild. Nothing in it is secret — it is all published with the site.

### Update the company email

```js
contact: {
  email: 'hello@inskavex.com',   // ← the real address, once it exists
```

While `email` is empty the site honestly says the address is “coming soon”.
Once set, it appears in the contact section, footer and privacy notice, and the form
offers a pre-filled email fallback.

### Connect the contact form

The form validates input in the browser, but a static site cannot send email by
itself. To deliver messages, connect a static-form provider (for example
[Formspree](https://formspree.io)):

1. Create a free account and a form at the provider, and verify your email address there.
2. Copy the form’s endpoint URL (for Formspree it looks like `https://formspree.io/f/abcdwxyz`).
3. In `site.config.mjs`:

   ```js
   contact: {
     email: 'hello@inskavex.com',
     formEndpoint: 'https://formspree.io/f/abcdwxyz',
     formProviderName: 'Formspree',
     formProviderPrivacyUrl: 'https://formspree.io/legal/privacy-policy',
   },
   ```

4. Rebuild and deploy, then send yourself a test message from the live site.

Any provider that accepts a `POST` of form fields and returns a 2xx status on success
will work. The build automatically adds the endpoint to the Content Security Policy
and updates the privacy notice. The form includes the honeypot field `_gotcha` and a
`_subject` field (Formspree conventions; harmless elsewhere).

**How the form behaves in each state** (all covered by tests):

| Configuration | On a valid submission |
| --- | --- |
| No endpoint, no email (current) | Says clearly the message **has not been sent**; nothing is transmitted |
| Email only | Says the message has not been sent and offers “Open in your email app” with a pre-filled email (this only opens the visitor’s email app — delivery is not guaranteed) |
| Endpoint | Sends to the provider; shows “Message sent” **only** after a successful response, otherwise an error that keeps the visitor’s text |

### Update the domain

```js
url: 'https://inskavex.com',
```

Canonical links, Open Graph URLs, the sitemap, robots.txt and structured data all use
this value. It can be overridden at build time with the `SITE_URL` environment
variable (useful for a `*.pages.dev` preview). See [DEPLOYMENT.md](DEPLOYMENT.md).

### Other settings

| Setting | Purpose |
| --- | --- |
| `allowIndexing` | `false` → `noindex` on every page and `Disallow: /` in robots.txt (also `ALLOW_INDEXING` env var) |
| `legal.entityName` | Registered company name for the copyright line and privacy notice (brand name used until set) |
| `legal.privacyLastUpdated` | Date shown on the privacy notice |
| `hosting.*` | Hosting provider named in the privacy notice |

Environment-variable overrides: `SITE_URL`, `ALLOW_INDEXING`, `CONTACT_EMAIL`, `FORM_ENDPOINT`.

## 8. Editing content

| To change | Edit |
| --- | --- |
| Home page text and sections | `src/pages/index.html` |
| Privacy notice | `src/pages/privacy.html` |
| Header / navigation | `src/partials/header.html` |
| Footer | `src/partials/footer.html` |
| `<head>` metadata | `src/partials/head.html` (page titles/descriptions are in each page’s `<!--page … -->` block) |
| Styles and design tokens | `src/assets/css/styles.css` (see `DESIGN_SYSTEM.md`) |
| Interactions and form logic | `src/assets/js/main.js` |
| Static files (icons, OG image, manifest) | `src/public/` |

Template syntax (handled by `scripts/lib/template.mjs`): `{{> partial}}`, `{{ value }}`
(escaped), `{{#if value}}…{{else}}…{{/if}}`. A typo in a value name fails the build
rather than shipping blank text.

## 9. Deploy

Cloudflare Pages settings: **build command** `npm run build`, **output directory** `dist`.
Full step-by-step instructions, including connecting `inskavex.com` later, are in
**[DEPLOYMENT.md](DEPLOYMENT.md)**.

## 10. Project structure

```
site.config.mjs          Business details & settings (edit this)
src/
  pages/                 index.html, privacy.html, 404.html
  partials/              head, header, footer, logo (generated), icons
  assets/css/styles.css  Design tokens + all styles
  assets/js/main.js      Progressive enhancement (menu, reveals, form)
  assets/fonts/          Self-hosted, subset variable fonts (+ OFL licences)
  public/                Copied as-is: favicons, OG image, manifest, brand files
scripts/
  build.mjs              Build: partials, config, fingerprinting, sitemap, robots, _headers
  dev.mjs / serve.mjs    Local dev server / Cloudflare-like static server
  check.mjs              Post-build static checks
  lib/                   Config loader & template renderer
  brand/                 Logo generator (Python) & raster image renderer
tests/site.spec.mjs      Playwright browser tests
```

## 11. Troubleshooting

| Problem | Fix |
| --- | --- |
| `node: command not found` or syntax errors | Install Node.js 20+ (22 recommended) |
| `Port 3000 is already in use` (`EADDRINUSE`) | `PORT=3001 npm run dev` |
| Changes don’t appear | Refresh the browser; check the terminal for a build error |
| `Build failed: Unknown template value "…"` | A `{{ … }}` name in a page/partial doesn’t exist in the config — fix the spelling |
| `Invalid site configuration` | `url` must be a full https URL; `contact.email` must be a valid address; `formEndpoint` must be https |
| Playwright: “Executable doesn’t exist” | Run `npx playwright install chromium` |
| Tests fail on ports 4321–4323 | Another process is using them; stop it and re-run |
| Form says “not sent” on the live site | `contact.formEndpoint` is not set — see *Connect the contact form* |
| Opening `dist/index.html` directly shows unstyled pages | Use `npm run preview`; the site uses root-relative paths and must be served |

## 12. Regenerating brand assets (rarely needed)

```bash
pip install fonttools brotli
python3 scripts/brand/build_logo.py   # logo SVGs, favicon.svg, inline logo partial
npm run assets:images                 # OG image, app icons, favicon.ico (needs Playwright Chromium)
```

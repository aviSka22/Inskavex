# Deployment — Cloudflare Pages on `texponex.com`

The site is a static build (`dist/`) with no server code, so it runs on Cloudflare
Pages’ free plan. **`texponex.com` is registered with Cloudflare Registrar**, so its DNS
is already on Cloudflare: there are no nameservers to change and Cloudflare creates the
DNS records and HTTPS certificates itself.

Status: the website is built, configured for `https://texponex.com` and
`hello@texponex.com`, and pushed to GitHub. **The Cloudflare steps below have not been
performed yet** — they need your Cloudflare account. Cloudflare occasionally renames
dashboard items; if a label differs slightly, look for the equivalent option.

| Setting | Value |
| --- | --- |
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |
| Node.js version | 22 — read automatically from `.nvmrc` |
| Environment variables | **None needed** (the domain and email are in `site.config.mjs`) |

Generated automatically into `dist/` by the build: `_headers` (security headers,
Content Security Policy, long-term caching for fingerprinted assets), `sitemap.xml`,
`robots.txt`, `404.html`.

---

## Step 1 — Prepare the GitHub repository (5 minutes, optional but recommended)

1. **Rename the repository** to match the brand: GitHub → *aviSka22/Inskavex* →
   **Settings → General → Repository name** → `Texponex` → **Rename**. Do this *before*
   connecting Cloudflare. GitHub redirects the old address, but update your local copy:
   `git remote set-url origin https://github.com/aviSka22/Texponex.git`.
   Then remove the repository exception noted in `scripts/check.mjs` (brand check).
2. **Choose the production branch.** The work lives on `ccr-9a63c2ce-k1gq04`, currently
   the only (and default) branch. Either use it as-is, or — cleaner — create `main`
   from it: **Code → Branches → New branch** → name `main`, source
   `ccr-9a63c2ce-k1gq04`; then **Settings → General → Default branch** → `main`.

## Step 2 — Create the Pages project

1. Cloudflare dashboard → **Workers & Pages → Create** → **Pages** tab →
   **Connect to Git** (if *Create* opens a Workers screen, choose the Pages option).
2. Authorize the Cloudflare GitHub app for **this repository only**.
3. Select the repository and set:
   - **Project name:** `texponex`
   - **Production branch:** `main` (or `ccr-9a63c2ce-k1gq04` if you skipped Step 1.2)
   - **Framework preset:** None · **Build command:** `npm run build` · **Build output directory:** `dist`
4. **Save and Deploy.** The build log should end with
   `Built 3 pages into dist/ in … (site URL: https://texponex.com)`.

Cloudflare gives the project a `https://texponex.pages.dev` address (or similar).
Open it once to confirm the site loads; the real domain comes next.

## Step 3 — Connect `texponex.com`

1. **Workers & Pages → texponex → Custom domains → Set up a custom domain**.
2. Enter `texponex.com` → **Continue** → **Activate domain**. Because the domain is on
   Cloudflare, the DNS record is created for you — do not add one by hand.
3. Repeat for `www.texponex.com`.
4. Wait until both show **Active** (usually a few minutes). HTTPS certificates are
   issued automatically.

## Step 4 — Redirects and HTTPS

1. **Send `www` to the main domain** (the canonical address is `https://texponex.com`):
   *texponex.com* zone → **Rules → Redirect Rules → Create rule**
   (or use the template *Redirect from WWW to root* if offered):
   - When: *Hostname* equals `www.texponex.com`
   - Then: *Dynamic* redirect, expression `concat("https://texponex.com", http.request.uri.path)`,
     status **301**, **preserve query string** on.
2. **Always use HTTPS:** *texponex.com* zone → **SSL/TLS → Edge Certificates →
   Always Use HTTPS** → On.
3. Optional: also redirect `texponex.pages.dev` to `https://texponex.com`, so only one
   public address exists (Pages project → **Settings** or a Bulk Redirect).

### Zone settings to keep **off** (they rewrite pages and can break the site)

The site ships a strict Content Security Policy and exact HTML. These Cloudflare features
modify pages on the fly; check them for *texponex.com* before going live:

| Setting | Where | Keep | Why |
| --- | --- | --- | --- |
| **Email Address Obfuscation** | **Security → Settings** (older dashboards: *Scrape Shield*) | **Off** | Rewrites email addresses and `mailto:` links into `/cdn-cgi/l/email-protection` links and injects a script; the published addresses and the form’s email hand-off should stay exactly as built |
| **Rocket Loader** | **Speed → Optimization → Content Optimization** | **Off** | Rewrites how scripts load; conflicts with the Content Security Policy |
| **Web Analytics** (automatic setup) | **Workers & Pages → texponex → Metrics** | **Not enabled** | Injects a third-party script the security policy blocks, and the privacy notice says the site uses no analytics. If you want analytics later, ask for the CSP and privacy notice to be updated first |

## Step 5 — Make sure `hello@texponex.com` receives mail

The website publishes `hello@texponex.com`, and the contact form opens the visitor’s
email app addressed to it, so the address must actually work. Cloudflare Registrar does
not include a mailbox. If you have not set one up yet:

- **Receive (free):** *texponex.com* zone → **Email → Email Routing** → **Enable** →
  add custom address `hello` → destination: your existing inbox → verify it.
  Cloudflare adds the required MX/SPF records automatically; they do not affect the website.
- **Send as `hello@texponex.com`:** needs a mail provider (e.g. Google Workspace or
  Zoho Mail), or an SMTP service used with Gmail’s *Send mail as*.
- **Test:** from a different account, email `hello@texponex.com` and confirm it arrives.

## Step 6 — Connect the contact form (recommended)

Today the form validates the message and opens the visitor’s email app, pre-filled
and addressed to `hello@texponex.com`; it never claims a message was sent. To have the
form deliver messages directly from the website:

1. Create a free form at a static-form provider such as [Formspree](https://formspree.io),
   using `hello@texponex.com` as the recipient, and verify it.
2. In `site.config.mjs` set:

   ```js
   formEndpoint: 'https://formspree.io/f/xxxxxxxx',   // your form’s endpoint
   formProviderName: 'Formspree',
   formProviderPrivacyUrl: 'https://formspree.io/legal/privacy-policy',
   ```

3. Commit and push — Cloudflare redeploys automatically. The build adds the endpoint
   to the Content Security Policy and updates the privacy notice.
4. Send a test message from `https://texponex.com/#contact` and confirm it arrives.

## Step 7 — Verify the live site

- [ ] `https://texponex.com` loads with a valid padlock
- [ ] `http://texponex.com` and `https://www.texponex.com/privacy` redirect to `https://texponex.com/…`
- [ ] Home, `/privacy` and a made-up URL (shows the 404 page) all work
- [ ] View source: `<link rel="canonical" href="https://texponex.com/">`
- [ ] `https://texponex.com/robots.txt` shows `Allow: /` and the sitemap URL
- [ ] `https://texponex.com/sitemap.xml` lists `https://texponex.com/` and `/privacy`
- [ ] Response headers include `Content-Security-Policy` (browser dev tools → Network)
- [ ] View source: email links read `href="mailto:hello@texponex.com"` (not `/cdn-cgi/l/email-protection…`)
- [ ] Browser dev tools → Console shows no errors on the home page, `/privacy` and a 404
- [ ] On a 1366 × 768 laptop the “Start a conversation” button is visible without scrolling
- [ ] Contact form: submit a test; email to `hello@texponex.com` arrives
- [ ] Mobile menu and every link on a real phone (iOS Safari and Android Chrome)
- [ ] Paste the URL into a messaging app: the Texponex preview card appears
- [ ] Run PageSpeed Insights on `https://texponex.com`

Optionally register the site in Google Search Console / Bing Webmaster Tools and submit
`https://texponex.com/sitemap.xml` (requires verifying domain ownership — easy with
Cloudflare DNS). This has **not** been done.

Every later push to the production branch deploys automatically. Pushes to other
branches create preview deployments, which Cloudflare marks `noindex`.

---

## Before public launch (review list)

| Item | Where | Status |
| --- | --- | --- |
| Domain `texponex.com` | Cloudflare Registrar | ✅ Purchased |
| Business email `hello@texponex.com` | `contact.email` | ✅ Configured in the site — confirm the mailbox receives mail (Step 5) |
| Pages project, custom domain, redirects | Steps 2–4 | **To do** (needs your Cloudflare account) |
| Contact-form endpoint | `contact.formEndpoint` (Step 6) | Not configured — email fallback active |
| Legal entity name (if different from “Texponex”) | `legal.entityName` | Not configured (brand name used) |
| Privacy notice reviewed by the company | `src/pages/privacy.html` | **Needs review** |
| Real-device check | Step 7 | Not done |

`npm run check:launch` lists whatever is still missing from the configuration.

## Rollback

**Workers & Pages → texponex → Deployments**, open an earlier deployment →
**Rollback to this deployment**. Or revert the commit in Git and push.

## Deploying without Git (alternative)

```bash
npm run build
npx wrangler pages deploy dist --project-name texponex
```

Requires `npx wrangler login` with your Cloudflare account. Git integration is recommended.

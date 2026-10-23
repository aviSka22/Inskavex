# Deployment — Cloudflare Pages and `inskavex.com`

The site is a static build (`dist/`) with no server code, so it runs on Cloudflare
Pages’ free plan. Nothing in this guide has been performed yet: no Cloudflare
project, deployment, domain or DNS record exists. Cloudflare occasionally renames
dashboard items; if a label differs slightly, look for the equivalent option.

| Setting | Value |
| --- | --- |
| Framework preset | **None** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave empty)* |
| Node.js version | 22 — read automatically from `.nvmrc` (or set env var `NODE_VERSION=22`) |
| Production branch | the branch you merge this work into (e.g. `main`) |

Generated automatically into `dist/` by the build: `_headers` (security headers,
Content Security Policy, long-term caching for fingerprinted assets), `sitemap.xml`,
`robots.txt`, `404.html`.

---

## Part A — First deployment (before the domain is purchased)

### 1. Get the code onto the production branch

The work currently lives on branch `ccr-9a63c2ce-k1gq04`. Merge it into the branch you
want Cloudflare to publish (typically `main`) through a GitHub pull request, or use the
work branch itself as the production branch.

### 2. Create the Pages project

1. Sign in to the Cloudflare dashboard (a free account is enough).
2. Go to **Workers & Pages → Create → Pages → Connect to Git**.
3. Authorize the Cloudflare GitHub app for the repository **aviSka22/Inskavex** only.
4. Select the repository, then set:
   - **Project name:** `inskavex` (this gives the address `https://inskavex.pages.dev`
     if the name is available — otherwise Cloudflare shows the actual address)
   - **Production branch:** `main` (or your chosen branch)
   - **Framework preset:** None
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`

### 3. Recommended environment variables for the preview phase

Under **Settings → Variables and Secrets** (Production), add:

| Variable | Value | Why |
| --- | --- | --- |
| `SITE_URL` | `https://inskavex.pages.dev` (your real `*.pages.dev` address) | Canonical/OG URLs point at an address that actually works |
| `ALLOW_INDEXING` | `false` | Keeps the temporary address out of search engines |

None of these are secrets. Remove both once the custom domain is live (Part C).

### 4. Deploy and test the `*.pages.dev` address

Click **Save and Deploy**. When the build log shows `Built 3 pages into dist/`,
open the address Cloudflare shows and check:

- [ ] Home page, `/privacy` and a made-up URL (shows the 404 page)
- [ ] Mobile menu on a phone; every navigation link
- [ ] Contact form shows the pre-launch notice and never claims a message was sent
- [ ] Response headers include `Content-Security-Policy` (browser dev tools → Network)
- [ ] `/robots.txt` and `/sitemap.xml` load

Every later push to the production branch deploys automatically. Pushes to other
branches create preview deployments (Cloudflare marks those `noindex` itself).

---

## Part B — Configure contact delivery and email

Do these in `site.config.mjs` (see README → *Configuration*), commit and push:

1. Create the business mailbox (e.g. `hello@inskavex.com` — requires the domain, Part C).
2. Set `contact.email`.
3. Create a form at a static-form provider (e.g. Formspree), verify it, and set
   `contact.formEndpoint`, `contact.formProviderName`, `contact.formProviderPrivacyUrl`.
4. Push; after deployment, submit a real test message and confirm it arrives.

Alternatively set `CONTACT_EMAIL` / `FORM_ENDPOINT` as Cloudflare environment variables
(the config file is still the documented source of truth).

---

## Part C — Connect `inskavex.com` after purchasing it

You must own the domain first. Purchase it from any registrar (Cloudflare Registrar
sells domains at cost, which keeps DNS and hosting in one place).

### 1. Put the domain on Cloudflare DNS

- **Bought through Cloudflare Registrar:** already done.
- **Bought elsewhere:** in Cloudflare, **Add a domain** → `inskavex.com` → Free plan.
  Cloudflare shows two nameservers; set them at your registrar and wait until the
  domain shows **Active** (minutes to 24 hours).

An apex domain (`inskavex.com` without `www`) on Pages requires the domain to use
Cloudflare nameservers.

### 2. Attach the domain to the Pages project

1. **Workers & Pages → inskavex → Custom domains → Set up a custom domain**.
2. Enter `inskavex.com` → **Continue** → **Activate domain**. Cloudflare creates the
   DNS record for you — do not create it by hand.
3. Repeat for `www.inskavex.com` if you want `www` to work.
4. Wait until both show **Active**. Cloudflare issues the HTTPS certificates automatically.

### 3. Redirect `www` to the main domain (recommended)

The canonical URL is `https://inskavex.com`, so send `www` there permanently:
**inskavex.com zone → Rules → Redirect Rules → Create rule**:

- When: *Hostname* equals `www.inskavex.com`
- Then: *Dynamic* redirect to `concat("https://inskavex.com", http.request.uri.path)`,
  status **301**, preserve query string.

(Or use the “Redirect from WWW to root” rule template if your dashboard offers it.)

Optionally redirect the `*.pages.dev` address too, so only one public address exists.

### 4. Switch the site to the real domain

1. Confirm `url: 'https://inskavex.com'` in `site.config.mjs` (already the default).
2. In Cloudflare **Settings → Variables and Secrets**, **delete** `SITE_URL` and
   `ALLOW_INDEXING` (or set `ALLOW_INDEXING=true`).
3. Trigger a new deployment (push a commit, or **Deployments → Retry deployment**).

### 5. Verify DNS, HTTPS and URLs

- [ ] `https://inskavex.com` loads with a valid padlock
- [ ] `http://inskavex.com` redirects to `https://` (SSL/TLS → Edge Certificates → *Always Use HTTPS*)
- [ ] `https://www.inskavex.com/privacy` redirects to `https://inskavex.com/privacy`
- [ ] View source: `<link rel="canonical" href="https://inskavex.com/">`
- [ ] `https://inskavex.com/robots.txt` shows `Allow: /` and the sitemap URL
- [ ] `https://inskavex.com/sitemap.xml` lists `https://inskavex.com/` and `/privacy`
- [ ] Share preview (e.g. paste the URL into a messaging app) shows the Inskavex card
- [ ] `npm run check:launch` passes locally

Optionally, submit the sitemap in Google Search Console / Bing Webmaster Tools — this
has **not** been done and requires verifying domain ownership.

---

## Part D — Before public launch (review list)

| Item | Where | Status |
| --- | --- | --- |
| Business email address | `contact.email` | **Not configured** |
| Contact-form endpoint and provider name | `contact.formEndpoint`, `formProviderName`, `formProviderPrivacyUrl` | **Not configured** |
| Legal entity name (if different from “Inskavex”) | `legal.entityName` | Not configured (brand name used) |
| Privacy notice reviewed by the company (retention wording, rights, any legal requirements where Inskavex operates) | `src/pages/privacy.html` | **Needs review** |
| Domain purchased and connected | Part C | **Not done** |
| Indexing enabled on the real domain | Part C step 4 | Pending domain |
| Real-device check on iOS Safari and Android Chrome | `TESTING_CHECKLIST.md` § Local checks | Not done |

`npm run check:launch` lists whatever is still missing from the configuration.

## Rollback

**Workers & Pages → inskavex → Deployments**, open an earlier deployment →
**Rollback to this deployment**. Or revert the commit in Git and push.

## Deploying without Git (alternative)

```bash
npm run build
npx wrangler pages deploy dist --project-name inskavex
```

Requires `wrangler login`. Git integration (Part A) is recommended.

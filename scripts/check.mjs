// Static checks on the built site in dist/ (run `npm run build` first).
//
//   node scripts/check.mjs            quality checks; exits non-zero on failure
//   node scripts/check.mjs --launch   also fails while launch settings are missing
//
// Covers: required files, HTML validity, metadata, internal links and anchors,
// asset references, sitemap/robots, CSP hashes, brand spelling, secrets and size budgets.
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchIssues, loadConfig } from './lib/config.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const launchMode = process.argv.includes('--launch');

const failures = [];
const passes = [];
const check = (name, problems) => {
  if (problems.length) failures.push({ name, problems });
  else passes.push(name);
};

if (!fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('No build found. Run "npm run build" first.');
  process.exit(1);
}

const config = loadConfig();
const read = (file) => fs.readFileSync(path.join(DIST, file), 'utf8');
const htmlFiles = fs.readdirSync(DIST).filter((file) => file.endsWith('.html'));
const pages = Object.fromEntries(htmlFiles.map((file) => [file, read(file)]));

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  );
}

// Same resolution rules as Cloudflare Pages / scripts/serve.mjs.
function resolvePublicPath(urlPath) {
  const candidates = urlPath.endsWith('/') ? [`${urlPath}index.html`] : [urlPath, `${urlPath}.html`, `${urlPath}/index.html`];
  return candidates.map((candidate) => path.join(DIST, candidate)).find((file) => fs.existsSync(file) && fs.statSync(file).isFile());
}

const idsIn = (html) => new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));

// 1. Required files ----------------------------------------------------------
check(
  'Required files exist',
  [
    'index.html', 'privacy.html', '404.html', 'sitemap.xml', 'robots.txt', '_headers',
    'favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og-image.png', 'site.webmanifest',
    'icon-192.png', 'icon-512.png', 'brand/texponex-mark.png',
  ].filter((file) => !fs.existsSync(path.join(DIST, file))).map((file) => `missing ${file}`),
);

// 2. HTML validity (html-validate) -------------------------------------------
{
  const bin = path.join(ROOT, 'node_modules/.bin/html-validate');
  if (!fs.existsSync(bin)) {
    failures.push({ name: 'HTML validation', problems: ['html-validate is not installed — run "npm install"'] });
  } else {
    const result = spawnSync(bin, ['--formatter', 'text', ...htmlFiles.map((file) => path.join(DIST, file))], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    check('HTML validation (html-validate)', result.status === 0 ? [] : [(result.stdout + result.stderr).trim()]);
  }
}

// 3. Metadata ----------------------------------------------------------------
{
  const problems = [];
  for (const [file, html] of Object.entries(pages)) {
    const has = (pattern, label) => {
      if (!pattern.test(html)) problems.push(`${file}: missing ${label}`);
    };
    has(/<html lang="en"/, 'lang attribute');
    has(/<title>[^<]{10,70}<\/title>/, 'title (10–70 characters)');
    has(/<meta name="description" content="[^"]{50,170}">/, 'meta description (50–170 characters)');
    has(/<meta name="viewport"/, 'viewport meta');
    has(/<meta property="og:title"/, 'og:title');
    has(/<meta property="og:image" content="https?:\/\/[^"]+\/og-image\.png">/, 'absolute og:image');
    has(/<link rel="icon" href="\/favicon\.svg"/, 'favicon link');
    if (file !== '404.html') has(new RegExp(`<link rel="canonical" href="${config.url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), 'canonical URL');
    const h1Count = (html.match(/<h1[\s>]/g) || []).length;
    if (h1Count !== 1) problems.push(`${file}: expected exactly one <h1>, found ${h1Count}`);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length) problems.push(`${file}: duplicate ids ${[...new Set(duplicates)].join(', ')}`);
  }
  const jsonLd = pages['index.html'].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!jsonLd) problems.push('index.html: missing JSON-LD');
  else {
    try {
      const data = JSON.parse(jsonLd[1]);
      const text = JSON.stringify(data);
      for (const banned of ['aggregateRating', 'review', 'address', 'award', 'openingHours']) {
        if (text.includes(`"${banned}`)) problems.push(`JSON-LD contains unverified field "${banned}"`);
      }
    } catch (error) {
      problems.push(`JSON-LD is not valid JSON: ${error.message}`);
    }
  }
  check('Page metadata, headings and structured data', problems);
}

// 4. Internal links, anchors and asset references -----------------------------
{
  const problems = [];
  const external = new Set();
  for (const [file, html] of Object.entries(pages)) {
    const pageIds = idsIn(html);
    for (const [, attr, value] of html.matchAll(/\s(href|src)="([^"]*)"/g)) {
      if (/^(mailto:|tel:)/.test(value)) continue;
      if (/^https?:\/\//.test(value)) {
        if (attr === 'href') external.add(value);
        continue;
      }
      if (value === '' || value.startsWith('data:')) continue;
      const [target, fragment] = value.split('#');
      if (!target) {
        if (fragment && !pageIds.has(fragment)) problems.push(`${file}: anchor #${fragment} not found`);
        continue;
      }
      const resolved = resolvePublicPath(target);
      if (!resolved) {
        problems.push(`${file}: ${attr}="${value}" does not resolve to a file`);
        continue;
      }
      if (fragment && resolved.endsWith('.html') && !idsIn(fs.readFileSync(resolved, 'utf8')).has(fragment)) {
        problems.push(`${file}: ${value} — anchor not found in ${path.basename(resolved)}`);
      }
    }
  }
  // url() references in CSS
  for (const cssFile of walk(path.join(DIST, 'assets/css'))) {
    for (const [, ref] of fs.readFileSync(cssFile, 'utf8').matchAll(/url\("?([^")]+)"?\)/g)) {
      if (ref.startsWith('data:')) continue;
      if (!resolvePublicPath(ref)) problems.push(`${path.basename(cssFile)}: url(${ref}) does not resolve`);
    }
  }
  // Manifest icons
  for (const icon of JSON.parse(read('site.webmanifest')).icons) {
    if (!resolvePublicPath(icon.src)) problems.push(`site.webmanifest: ${icon.src} does not resolve`);
  }
  check('Internal links, anchors and asset references', problems);
  if (external.size) console.log(`External links (not fetched): ${[...external].join(', ')}`);
}

// 5. Sitemap and robots -------------------------------------------------------
{
  const problems = [];
  const sitemap = read('sitemap.xml');
  const robots = read('robots.txt');
  for (const loc of [`${config.url}/`, `${config.url}/privacy`]) {
    if (!sitemap.includes(`<loc>${loc}</loc>`)) problems.push(`sitemap.xml missing ${loc}`);
  }
  if (sitemap.includes('/404')) problems.push('sitemap.xml must not list the 404 page');
  if (config.allowIndexing && !robots.includes(`Sitemap: ${config.url}/sitemap.xml`)) problems.push('robots.txt does not reference the sitemap');
  if (!config.allowIndexing && !/Disallow: \/\s*$/m.test(robots)) problems.push('robots.txt should disallow crawling when indexing is off');
  check('Sitemap and robots.txt', problems);
}

// 6. Security headers and CSP hashes ------------------------------------------
{
  const problems = [];
  const headers = read('_headers');
  for (const name of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'X-Frame-Options']) {
    if (!headers.includes(`${name}:`)) problems.push(`_headers missing ${name}`);
  }
  for (const [file, html] of Object.entries(pages)) {
    for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/\bsrc=/.test(attrs) || /ld\+json/.test(attrs)) continue;
      const digest = `'sha256-${crypto.createHash('sha256').update(body).digest('base64')}'`;
      if (!headers.includes(digest)) problems.push(`${file}: inline script hash ${digest} missing from CSP`);
    }
    if (/\sstyle="/.test(html)) problems.push(`${file}: inline style attribute would be blocked by the CSP`);
    if (/\son[a-z]+="/.test(html)) problems.push(`${file}: inline event handler would be blocked by the CSP`);
  }
  check('Security headers and Content Security Policy', problems);
}

// 7. Brand spelling ----------------------------------------------------------
{
  const problems = [];
  let files;
  try {
    files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map((file) => path.join(ROOT, file));
  } catch {
    files = walk(path.join(ROOT, 'src'));
  }
  files = files.concat(walk(DIST)).filter((file) => /\.(html|css|js|mjs|md|json|txt|xml|svg|webmanifest)$/.test(file) && fs.existsSync(file));
  // Flags misspellings of the brand (e.g. "Texponix", "Taxponex") and any leftover
  // of the project's earlier working name.
  const BRAND_LIKE = /\b(?:t[ae]k?x+p+h?o+n+[aeiy]+[xks]+\w*|in[sc]+k?[ae]v\w*)/gi;
  // The GitHub repository still carries the earlier working name. Remove this
  // exception after renaming the repository in GitHub.
  const REPOSITORY_SLUG = /aviSka22\/Inskavex(\.git)?|^cd Inskavex$/gm;
  for (const file of files) {
    if (file.includes('node_modules') || file.endsWith('package-lock.json') || file.endsWith('check.mjs')) continue;
    const text = fs.readFileSync(file, 'utf8').replace(REPOSITORY_SLUG, '');
    for (const [word] of text.matchAll(BRAND_LIKE)) {
      if (!['Texponex', 'texponex', 'TEXPONEX'].includes(word)) problems.push(`${path.relative(ROOT, file)}: "${word}"`);
    }
  }
  check('Brand spelling is consistently “Texponex”', problems);
}

// 8. Secrets ------------------------------------------------------------------
{
  const patterns = [
    [/AKIA[0-9A-Z]{16}/, 'AWS access key'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
    [/gh[pousr]_[A-Za-z0-9]{30,}/, 'GitHub token'],
    [/github_pat_[A-Za-z0-9_]{20,}/, 'GitHub token'],
    [/xox[abprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
    [/sk-[A-Za-z0-9]{32,}/, 'API secret key'],
    [/AIza[0-9A-Za-z_-]{35}/, 'Google API key'],
    [/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"\s]{12,}['"]/i, 'hard-coded credential'],
  ];
  const problems = [];
  let files = [];
  try {
    files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean).map((file) => path.join(ROOT, file));
  } catch {
    files = walk(path.join(ROOT, 'src'));
  }
  for (const file of files.concat(walk(DIST))) {
    if (!fs.existsSync(file) || /\.(png|ico|woff2)$/.test(file) || file.endsWith('check.mjs')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) problems.push(`${path.relative(ROOT, file)}: possible ${label}`);
    }
  }
  if (fs.existsSync(path.join(ROOT, '.env'))) problems.push('.env file present in the project root (make sure it is never committed)');
  check('No secrets or credentials in the repository', problems);
}

// 9. Size budgets (uncompressed) ------------------------------------------------
{
  const budgets = { '.css': 60_000, '.js': 20_000, '.woff2': 80_000, '.html': 80_000 };
  const problems = [];
  const totals = {};
  for (const file of walk(DIST)) {
    const ext = path.extname(file);
    const size = fs.statSync(file).size;
    totals[ext] = (totals[ext] || 0) + size;
    if (budgets[ext] && size > budgets[ext]) problems.push(`${path.relative(DIST, file)} is ${size} bytes (budget ${budgets[ext]})`);
  }
  check('Per-file size budgets', problems);
  console.log(
    `Output sizes: ${Object.entries(totals).map(([ext, size]) => `${ext} ${(size / 1024).toFixed(1)} KB`).join(', ')}`,
  );
}

// Report ----------------------------------------------------------------------
console.log('');
for (const name of passes) console.log(`  ✓ ${name}`);
for (const { name, problems } of failures) {
  console.log(`  ✗ ${name}`);
  for (const problem of problems) console.log(`      ${problem.split('\n').join('\n      ')}`);
}

const issues = launchIssues(config);
if (issues.length) {
  console.log(`\n${launchMode ? '  ✗' : '  !'} Launch configuration (${launchMode ? 'required' : 'informational'}):`);
  for (const issue of issues) console.log(`      ${issue}`);
}

const failed = failures.length > 0 || (launchMode && issues.length > 0);
console.log(failed ? '\nChecks failed.' : `\nAll ${passes.length} checks passed.`);
process.exit(failed ? 1 : 0);

// Renders the raster brand images from the SVG logo and brand font.
// Run after changing the logo:  npm run assets:images
// Requires the dev dependency @playwright/test and a Chromium browser.
//
// Outputs into src/public/: og-image.png, apple-touch-icon.png, icon-192.png,
// icon-512.png, favicon.ico and brand/texponex-mark.png.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC = path.join(ROOT, 'src/public');

const INK = '#0E0F0D';
const BONE = '#F3F1EC';
const EMBER = '#F0532D';
const MARK_INK = 'M0 6H13V19H26V32H0Z';
const MARK_NEXT = 'M19 0H32V13H19Z';

const font = fs.readFileSync(path.join(ROOT, 'src/assets/fonts/archivo-var.woff2')).toString('base64');
const mono = fs.readFileSync(path.join(ROOT, 'src/assets/fonts/jetbrains-mono-var.woff2')).toString('base64');
const logoLight = fs.readFileSync(path.join(PUBLIC, 'brand/texponex-logo-light.svg'), 'utf8');

const baseCss = `
  @font-face { font-family: Archivo; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 300 800; font-stretch: 100% 125%; }
  @font-face { font-family: Mono; src: url(data:font/woff2;base64,${mono}) format("woff2"); font-weight: 400 600; }
  html, body { margin: 0; }
`;

function iconHtml(size, { background = INK, padding = 0.2 } = {}) {
  const inner = size * (1 - padding * 2);
  return `<style>${baseCss} body { width:${size}px; height:${size}px; display:grid; place-items:center; background:${background}; }</style>
    <svg viewBox="0 0 32 32" width="${inner}" height="${inner}"><path fill="${BONE}" d="${MARK_INK}"/><path fill="${EMBER}" d="${MARK_NEXT}"/></svg>`;
}

const markHtml = `<style>${baseCss} body { width:512px; height:512px; display:grid; place-items:center; background:transparent; }</style>
  <svg viewBox="0 0 32 32" width="448" height="448"><path fill="${INK}" d="${MARK_INK}"/><path fill="${EMBER}" d="${MARK_NEXT}"/></svg>`;

const ogHtml = `<style>${baseCss}
  body { width:1200px; height:630px; position:relative; overflow:hidden; background:${INK}; color:${BONE}; font-family:Archivo; }
  .grid { position:absolute; inset:0; background-image: linear-gradient(rgba(243,241,236,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(243,241,236,.06) 1px, transparent 1px); background-size: 52px 52px; background-position: -1px -1px; }
  .logo { position:absolute; left:72px; top:64px; }
  .logo svg { width:300px; height:auto; }
  .eyebrow { position:absolute; left:72px; top:330px; font-family:Mono; font-size:20px; letter-spacing:.08em; text-transform:uppercase; color:#A2A396; display:flex; align-items:center; gap:14px; }
  .eyebrow i { width:12px; height:12px; background:${EMBER}; display:block; }
  h1 { position:absolute; left:72px; top:372px; margin:0; font-size:74px; line-height:.98; font-weight:620; font-stretch:112%; letter-spacing:-.04em; max-width:680px; }
  h1 span { color:#A2A396; }
  .art { position:absolute; right:-70px; bottom:-70px; width:470px; height:470px; }
</style>
<div class="grid"></div>
<div class="logo">${logoLight}</div>
<p class="eyebrow"><i></i>Software &amp; technology company</p>
<h1>Building what’s next, <span>engineered to last.</span></h1>
<svg class="art" viewBox="0 0 32 32"><path fill="#1C1F1A" d="${MARK_INK}"/><path fill="none" stroke="rgba(243,241,236,.4)" stroke-width=".12" stroke-dasharray=".4 .4" d="M13 6h13v13H13z"/><path fill="${EMBER}" d="${MARK_NEXT}"/></svg>`;

// Minimal ICO container holding PNG images (supported by all current browsers).
function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, index) => {
    const entry = 6 + index * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(data.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map(({ data }) => data)]);
}

const browser = await chromium.launch();
async function shot(html, width, height, { transparent = false } = {}) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const data = await page.screenshot({ omitBackground: transparent, type: 'png' });
  await page.close();
  return data;
}

fs.writeFileSync(path.join(PUBLIC, 'og-image.png'), await shot(ogHtml, 1200, 630));
fs.writeFileSync(path.join(PUBLIC, 'apple-touch-icon.png'), await shot(iconHtml(180), 180, 180));
fs.writeFileSync(path.join(PUBLIC, 'icon-192.png'), await shot(iconHtml(192), 192, 192));
fs.writeFileSync(path.join(PUBLIC, 'icon-512.png'), await shot(iconHtml(512), 512, 512));
fs.writeFileSync(path.join(PUBLIC, 'brand/texponex-mark.png'), await shot(markHtml, 512, 512, { transparent: true }));
fs.writeFileSync(
  path.join(PUBLIC, 'favicon.ico'),
  ico([
    { size: 16, data: await shot(iconHtml(16, { padding: 0.1 }), 16, 16) },
    { size: 32, data: await shot(iconHtml(32, { padding: 0.12 }), 32, 32) },
    { size: 48, data: await shot(iconHtml(48, { padding: 0.14 }), 48, 48) },
  ]),
);
await browser.close();
console.log('Raster brand images written to src/public/.');

// Renders every raster brand image from the vector files written by
// scripts/brand/brand.py, so PNGs can never drift from the master logo.
// Run via `npm run brand`, which runs brand.py first.
// Requires the dev dependency @playwright/test and a Chromium browser.
//
// Website (src/public/): og-image.png, apple-touch-icon.png, icon-192.png,
//   icon-512.png, favicon.ico, brand/texponex-mark.png
// Brand kit (brand/): logo/png/* (four colorways, two sizes), social/* avatars
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUBLIC = path.join(ROOT, 'src/public');
const KIT = path.join(ROOT, 'brand');

const INK = '#0E0F0D';
const BONE = '#F3F1EC';
const EMBER = '#F0532D';

const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const [symbolInk, symbolExp] = [...read('brand/logo/svg/texponex-symbol-color.svg').matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const SYMBOL_W = 42;
const SYMBOL_H = 33;

const font = fs.readFileSync(path.join(ROOT, 'src/assets/fonts/archivo-var.woff2')).toString('base64');
const mono = fs.readFileSync(path.join(ROOT, 'src/assets/fonts/jetbrains-mono-var.woff2')).toString('base64');
const baseCss = `
  @font-face { font-family: Archivo; src: url(data:font/woff2;base64,${font}) format("woff2"); font-weight: 300 800; font-stretch: 100% 125%; }
  @font-face { font-family: Mono; src: url(data:font/woff2;base64,${mono}) format("woff2"); font-weight: 400 600; }
  html, body { margin: 0; }
`;

const symbolSvg = (ink, exp, width) =>
  `<svg viewBox="0 0 ${SYMBOL_W} ${SYMBOL_H}" width="${width}" height="${(width * SYMBOL_H) / SYMBOL_W}"><path fill="${ink}" d="${symbolInk}"/><path fill="${exp}" d="${symbolExp}"/></svg>`;

// Symbol centered on a square tile (app icons, favicon.ico, avatars).
function tileHtml(size, { background = INK, ink = BONE, fill = 0.62 } = {}) {
  return `<style>${baseCss} body { width:${size}px; height:${size}px; display:grid; place-items:center; background:${background}; }
    svg { transform: translateY(${size * 0.02}px); }</style>${symbolSvg(ink, EMBER, size * fill)}`;
}

const ogHtml = `<style>${baseCss}
  body { width:1200px; height:630px; position:relative; overflow:hidden; background:${INK}; color:${BONE}; font-family:Archivo; }
  .grid { position:absolute; inset:0; background-image: linear-gradient(rgba(243,241,236,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(243,241,236,.06) 1px, transparent 1px); background-size: 48px 48px; background-position: -1px -1px; }
  .logo { position:absolute; left:72px; top:66px; }
  .logo svg { width:330px; height:auto; }
  .eyebrow { position:absolute; left:72px; top:330px; font-family:Mono; font-size:20px; letter-spacing:.08em; text-transform:uppercase; color:#A2A396; display:flex; align-items:center; gap:14px; margin:0; }
  .eyebrow i { width:12px; height:12px; background:${EMBER}; display:block; }
  h1 { position:absolute; left:72px; top:372px; margin:0; font-size:74px; line-height:.98; font-weight:620; font-stretch:112%; letter-spacing:-.04em; max-width:640px; }
  h1 span { color:#A2A396; }
  .art { position:absolute; right:-36px; bottom:-60px; }
</style>
<div class="grid"></div>
<div class="logo">${read('src/public/brand/texponex-logo-light.svg')}</div>
<p class="eyebrow"><i></i>Software &amp; technology company</p>
<h1>Building what’s next, <span>engineered to last.</span></h1>
<svg class="art" viewBox="-6 -6 54 45" width="520" height="433">
  <path d="M-6 6H48M27 -6V15" stroke="rgba(243,241,236,.28)" stroke-width=".18" stroke-dasharray=".6 .9" fill="none"/>
  <path fill="#1C1F1A" d="${symbolInk}"/><path fill="${EMBER}" d="${symbolExp}"/>
</svg>`;

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

// Renders an SVG file at a given pixel width on a transparent background.
async function svgToPng(file, width) {
  const svg = read(file);
  const [, w, h] = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  const height = Math.round((width * Number(h)) / Number(w));
  const html = `<style>html,body{margin:0;background:transparent} svg{display:block;width:${width}px;height:${height}px}</style>${svg}`;
  return shot(html, width, height, { transparent: true });
}

const write = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
};

// Website
write(path.join(PUBLIC, 'og-image.png'), await shot(ogHtml, 1200, 630));
write(path.join(PUBLIC, 'apple-touch-icon.png'), await shot(tileHtml(180), 180, 180));
write(path.join(PUBLIC, 'icon-192.png'), await shot(tileHtml(192), 192, 192));
write(path.join(PUBLIC, 'icon-512.png'), await shot(tileHtml(512), 512, 512));
write(path.join(PUBLIC, 'brand/texponex-mark.png'), await svgToPng('brand/logo/svg/texponex-symbol-color.svg', 512));
write(
  path.join(PUBLIC, 'favicon.ico'),
  ico([
    { size: 16, data: await shot(tileHtml(16, { fill: 0.8 }), 16, 16) },
    { size: 32, data: await shot(tileHtml(32, { fill: 0.76 }), 32, 32) },
    { size: 48, data: await shot(tileHtml(48, { fill: 0.72 }), 48, 48) },
  ]),
);

// Brand kit: PNG logos (transparent, with clear space) and social avatars
for (const colorway of ['color', 'reversed', 'black', 'white']) {
  for (const width of [1200, 3000]) {
    write(path.join(KIT, `logo/png/texponex-logo-${colorway}-${width}w.png`), await svgToPng(`brand/logo/svg/texponex-logo-${colorway}.svg`, width));
  }
  for (const width of [512, 2048]) {
    write(path.join(KIT, `logo/png/texponex-symbol-${colorway}-${width}w.png`), await svgToPng(`brand/logo/svg/texponex-symbol-${colorway}.svg`, width));
  }
}
// One-page overview: colorways on their intended backgrounds, the symbol, and
// the construction rule. Embedded in brand/README.md.
const kitSvg = (name) => read(`brand/logo/svg/texponex-${name}.svg`).replace(/ width="[\d.]+" height="[\d.]+"/, '');
const overviewHtml = `<style>${baseCss}
  body { width:1600px; background:#fff; font-family:Archivo; color:${INK}; padding:56px; box-sizing:border-box; }
  h1 { font-size:30px; font-weight:620; font-stretch:112%; letter-spacing:-.02em; margin:0 0 6px; }
  p.lead { margin:0 0 36px; color:#5B5C53; font-size:17px; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
  .tile { height:200px; display:grid; place-items:center; position:relative; }
  .tile svg { width:78%; height:auto; }
  .tile.sym svg { width:34%; }
  .tile span { position:absolute; left:14px; bottom:10px; font:500 12px Mono; letter-spacing:.06em; text-transform:uppercase; }
  .light { background:#F3F1EC; } .white { background:#fff; outline:1px solid #e5e2da; } .dark { background:${INK}; color:#A2A396; } .ember { background:${EMBER}; color:${INK}; }
  .rule { margin-top:36px; display:grid; grid-template-columns:1.4fr 1fr; gap:36px; align-items:center; }
  .rule svg { width:100%; height:auto; }
  .rule ul { margin:0; padding:0; list-style:none; font-size:17px; line-height:1.6; }
  .rule li { padding:10px 0; border-top:1px solid #e5e2da; }
  .rule b { font-weight:620; }
  .swatches { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:36px; }
  .sw { height:120px; padding:16px; box-sizing:border-box; font:500 13px/1.6 Mono; display:flex; flex-direction:column; justify-content:flex-end; }
</style>
<h1>Texponex — logo system</h1>
<p class="lead">Primary logo: the wordmark raised to a power. Symbol: the T with the same exponent. One rule for both: the square is 0.46 × the cap height and centered on the cap line.</p>
<div class="grid">
  <div class="tile white">${kitSvg('logo-color')}<span>Color · light backgrounds</span></div>
  <div class="tile dark">${kitSvg('logo-reversed')}<span>Reversed · dark backgrounds</span></div>
  <div class="tile white">${kitSvg('logo-black')}<span>One color · black</span></div>
  <div class="tile ember">${kitSvg('logo-white')}<span>One color · white</span></div>
  <div class="tile light sym">${kitSvg('symbol-color')}<span>Symbol · color</span></div>
  <div class="tile dark sym">${kitSvg('symbol-reversed')}<span>Symbol · reversed</span></div>
  <div class="tile white sym">${kitSvg('symbol-black')}<span>Symbol · black</span></div>
  <div class="tile ember sym">${kitSvg('symbol-white')}<span>Symbol · white</span></div>
</div>
<div class="rule">
  <svg viewBox="-34 -14 210 58">
    <path d="M-34 4.6H176M-34 24.6H176" stroke="#9aa0ff" stroke-width=".25" stroke-dasharray="1 1"/>
    <rect x="-9.2" y="-9.2" width="178.42" height="48.3" fill="none" stroke="#9aa0ff" stroke-width=".25"/>
    ${read('src/partials/logo.html').replace(/<!--.*?-->\n/, '').replace(/<svg[^>]*>/, '').replace('</svg>', '').replace('fill="currentColor"', `fill="${INK}"`).replace('class="logo__next"', `fill="${EMBER}"`)}
    <text x="-33" y="3.6" font-size="3" font-family="Mono" fill="#6b70d6">cap line</text>
    <text x="-33" y="23.6" font-size="3" font-family="Mono" fill="#6b70d6">baseline</text>
  </svg>
  <ul>
    <li><b>Exponent</b> — side 0.46 × cap height, centered on the cap line.</li>
    <li><b>Clear space</b> — one exponent width on every side (blue frame).</li>
    <li><b>Minimum size</b> — logo 25 mm / 100 px wide; symbol 6 mm / 16 px.</li>
    <li><b>Never</b> recolor the square, stretch, add effects or move the exponent.</li>
  </ul>
</div>
<div class="swatches">
  <div class="sw" style="background:${INK};color:#F3F1EC">Ink · #0E0F0D<br>RGB 14 15 13<br>Print: K100 (text) · C60 M40 Y40 K100 (large areas)</div>
  <div class="sw" style="background:${EMBER};color:${INK}">Ember · #F0532D<br>RGB 240 83 45<br>Print: C0 M65 Y81 K0 (approve a proof)</div>
  <div class="sw" style="background:#F3F1EC;outline:1px solid #e5e2da">Bone · #F3F1EC<br>RGB 243 241 236<br>Print: use warm-white paper</div>
</div>`;
write(path.join(KIT, 'texponex-brand-overview.png'), await (async () => {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  await page.setContent(overviewHtml);
  await page.evaluate(() => document.fonts.ready);
  const data = await page.screenshot({ fullPage: true, type: 'png' });
  await page.close();
  return data;
})());

write(path.join(KIT, 'social/texponex-avatar-dark-1080.png'), await shot(tileHtml(1080, { fill: 0.56 }), 1080, 1080));
write(path.join(KIT, 'social/texponex-avatar-light-1080.png'), await shot(tileHtml(1080, { background: BONE, ink: INK, fill: 0.56 }), 1080, 1080));

await browser.close();
console.log('Raster images written to src/public/ and brand/.');

// Development server: builds the site, serves dist/ and rebuilds whenever a
// file in src/ or site.config.mjs changes. Refresh the browser to see changes.
//
//   npm run dev            → http://localhost:3000
//   PORT=8080 npm run dev  → http://localhost:8080
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 3000);

// Each build runs in a fresh process so edits to site.config.mjs are picked up.
function rebuild() {
  const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/build.mjs')], { stdio: 'inherit' });
  if (result.status !== 0) console.error('Build failed — fix the error above; still watching for changes.');
}

rebuild();
await serve({ port, host: process.env.HOST || '127.0.0.1' });
console.log('Watching src/ and site.config.mjs for changes. Press Ctrl+C to stop.');

let timer;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 150);
};
fs.watch(path.join(ROOT, 'src'), { recursive: true }, schedule);
fs.watch(path.join(ROOT, 'site.config.mjs'), schedule);

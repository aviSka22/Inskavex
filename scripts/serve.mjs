// Minimal static server for dist/ that mirrors Cloudflare Pages behavior closely
// enough for local checks: clean URLs, 404.html, and the generated _headers.
//
//   node scripts/serve.mjs [--port 4173] [--host 127.0.0.1] [--dir dist]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Parses the subset of the Cloudflare `_headers` format the build generates.
function readHeaderRules(dir) {
  const file = path.join(dir, '_headers');
  if (!fs.existsSync(file)) return [];
  const rules = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ pattern: line.trim(), headers: [] });
    } else if (rules.length) {
      const index = line.indexOf(':');
      rules.at(-1).headers.push([line.slice(0, index).trim(), line.slice(index + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, urlPath) {
  return pattern.endsWith('*') ? urlPath.startsWith(pattern.slice(0, -1)) : urlPath === pattern;
}

function resolveFile(dir, urlPath) {
  const candidates = urlPath.endsWith('/')
    ? [`${urlPath}index.html`]
    : [urlPath, `${urlPath}.html`, `${urlPath}/index.html`];
  for (const candidate of candidates) {
    const file = path.join(dir, candidate);
    if (!file.startsWith(dir + path.sep)) return null; // path traversal guard
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  }
  return null;
}

export function serve({ port = 4173, host = '127.0.0.1', dir = path.join(ROOT, 'dist') } = {}) {
  const root = path.resolve(dir);
  const server = http.createServer((request, response) => {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    } catch {
      response.writeHead(400).end('Bad request');
      return;
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end();
      return;
    }

    // Cloudflare Pages redirects /page.html → /page and /index.html → /.
    if (urlPath.endsWith('.html')) {
      const clean = urlPath.replace(/(index)?\.html$/, '');
      response.writeHead(308, { Location: clean || '/' }).end();
      return;
    }

    let file = resolveFile(root, urlPath);
    let status = 200;
    if (!file) {
      file = path.join(root, '404.html');
      status = 404;
    }

    const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' };
    for (const rule of readHeaderRules(root)) {
      if (matches(rule.pattern, urlPath)) for (const [name, value] of rule.headers) headers[name] = value;
    }
    delete headers['Strict-Transport-Security']; // meaningless over plain http

    response.writeHead(status, headers);
    if (request.method === 'HEAD') response.end();
    else fs.createReadStream(file).pipe(response);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try another, e.g. PORT=${port + 1} npm run dev`);
      process.exit(1);
    }
    throw error;
  });

  return new Promise((resolve) => {
    server.listen(port, host, () => {
      console.log(`Serving ${path.relative(ROOT, root) || '.'}/ at http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`);
      resolve(server);
    });
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index === -1 ? fallback : args[index + 1];
  };
  const dir = path.resolve(ROOT, option('dir', 'dist'));
  if (!fs.existsSync(path.join(dir, 'index.html'))) {
    console.error(`No build found in ${dir}. Run "npm run build" first.`);
    process.exit(1);
  }
  serve({ port: Number(option('port', process.env.PORT || 4173)), host: option('host', '127.0.0.1'), dir });
}

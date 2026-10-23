// A deliberately tiny template renderer for the site's HTML.
//
//   {{> name}}                       include src/partials/name.html
//   {{ path.to.value }}              HTML-escaped value
//   {{{ path.to.value }}}            raw value (only for trusted, build-generated HTML)
//   {{#if path}} … {{else}} … {{/if}} conditional (may be nested)
//
// Unknown values throw, so a typo fails the build instead of shipping blank text.
import fs from 'node:fs';
import path from 'node:path';

const PARTIAL = /\{\{>\s*([\w-]+)\s*\}\}/g;
const INNERMOST_IF = /\{\{#if\s+([\w.]+)\s*\}\}((?:(?!\{\{#if\s)[\s\S])*?)\{\{\/if\}\}/;
const VALUE = /\{\{\{\s*([\w.]+)\s*\}\}\}|\{\{\s*([\w.]+)\s*\}\}/g;

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

function lookup(context, key, source) {
  let value = context;
  for (const part of key.split('.')) {
    if (value === null || typeof value !== 'object' || !(part in value)) {
      throw new Error(`Unknown template value "${key}" in ${source}`);
    }
    value = value[part];
  }
  return value;
}

function includePartials(html, partialsDir, source, depth = 0) {
  if (depth > 10) throw new Error(`Partials nested too deeply in ${source}`);
  return html.replace(PARTIAL, (_, name) => {
    const file = path.join(partialsDir, `${name}.html`);
    if (!fs.existsSync(file)) throw new Error(`Missing partial "${name}" in ${source}`);
    return includePartials(fs.readFileSync(file, 'utf8'), partialsDir, `${name}.html`, depth + 1);
  });
}

export function render(html, context, { partialsDir, source = 'template' }) {
  let output = includePartials(html, partialsDir, source);

  let match;
  while ((match = INNERMOST_IF.exec(output))) {
    const [block, key, body] = match;
    const [whenTrue, whenFalse = ''] = body.split('{{else}}');
    output = output.replace(block, () => (lookup(context, key, source) ? whenTrue : whenFalse));
  }

  if (/\{\{|\}\}/.test(output.replace(VALUE, ''))) {
    throw new Error(`Unprocessed template syntax left in ${source}`);
  }

  // One pass, so inserted values are never re-interpreted as template syntax.
  return output.replace(VALUE, (_, rawKey, key) =>
    rawKey ? String(lookup(context, rawKey, source)) : escapeHtml(lookup(context, key, source)),
  );
}

// Pages start with a JSON front-matter comment: <!--page { "title": "…" } -->
export function readFrontMatter(html, source) {
  const match = html.match(/^<!--page\s*([\s\S]*?)-->\s*/);
  if (!match) throw new Error(`Missing <!--page {...} --> front matter in ${source}`);
  return { page: JSON.parse(match[1]), body: html.slice(match[0].length) };
}

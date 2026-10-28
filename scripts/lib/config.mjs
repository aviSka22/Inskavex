// Loads site.config.mjs, applies environment overrides, validates values and
// derives the flags the templates use.
import siteConfig from '../../site.config.mjs';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function loadConfig(env = process.env) {
  const config = structuredClone(siteConfig);
  const errors = [];

  if (env.SITE_URL) config.url = env.SITE_URL;
  if (env.ALLOW_INDEXING) config.allowIndexing = env.ALLOW_INDEXING.trim().toLowerCase() === 'true';
  // An explicitly empty value clears the setting (used by the test suite to
  // build an unconfigured variant).
  if (env.CONTACT_EMAIL !== undefined) config.contact.email = env.CONTACT_EMAIL;
  if (env.FORM_ENDPOINT !== undefined) config.contact.formEndpoint = env.FORM_ENDPOINT;

  config.url = String(config.url).trim().replace(/\/+$/, '');
  config.contact.email = String(config.contact.email || '').trim();
  config.contact.formEndpoint = String(config.contact.formEndpoint || '').trim();

  let siteUrl;
  try {
    siteUrl = new URL(config.url);
    if (!/^https?:$/.test(siteUrl.protocol)) throw new Error();
  } catch {
    errors.push(`url must be an absolute http(s) URL, got "${config.url}"`);
  }

  if (config.contact.email && !EMAIL_PATTERN.test(config.contact.email)) {
    errors.push(`contact.email is not a valid email address: "${config.contact.email}"`);
  }

  let formOrigin = '';
  if (config.contact.formEndpoint) {
    try {
      const endpoint = new URL(config.contact.formEndpoint);
      if (endpoint.protocol !== 'https:') throw new Error();
      formOrigin = endpoint.origin;
    } catch {
      errors.push(`contact.formEndpoint must be an https URL, got "${config.contact.formEndpoint}"`);
    }
  }

  const updated = String(config.legal.privacyLastUpdated);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(updated) || Number.isNaN(Date.parse(`${updated}T00:00:00Z`))) {
    errors.push(`legal.privacyLastUpdated must be a date like 2026-10-28, got "${updated}"`);
  }

  if (errors.length) {
    throw new Error(`Invalid site configuration:\n  - ${errors.join('\n  - ')}`);
  }

  const now = new Date();
  return {
    ...config,
    host: siteUrl.host,
    contact: {
      ...config.contact,
      emailEnabled: Boolean(config.contact.email),
      formEnabled: Boolean(config.contact.formEndpoint),
      formOrigin,
      formProviderLabel: config.contact.formProviderName || 'a third-party form service',
      formProviderPrivacyEnabled: Boolean(config.contact.formProviderPrivacyUrl),
    },
    legal: {
      ...config.legal,
      entity: config.legal.entityName || config.name,
      // e.g. "October 28, 2026" for display; the ISO date stays in <time datetime>.
      privacyLastUpdatedLabel: new Date(`${config.legal.privacyLastUpdated}T00:00:00Z`).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
      }),
    },
    year: String(now.getFullYear()),
    buildDate: now.toISOString().slice(0, 10),
  };
}

// Items that must be settled before a public launch. Reported by the build and
// enforced by `npm run check:launch`.
export function launchIssues(config) {
  const issues = [];
  if (!config.contact.emailEnabled) issues.push('contact.email is empty — no business email is published.');
  if (!config.contact.formEnabled) {
    issues.push(config.contact.emailEnabled
      ? 'contact.formEndpoint is empty — optional: the form opens the visitor’s email app instead of sending directly.'
      : 'contact.formEndpoint is empty — the contact form cannot deliver messages.');
  }
  if (config.contact.formEnabled && !config.contact.formProviderName) {
    issues.push('contact.formProviderName is empty — the privacy notice cannot name the form provider.');
  }
  if (!config.legal.entityName) issues.push('legal.entityName is empty — the brand name is used in place of a legal entity name.');
  if (!config.allowIndexing) issues.push('allowIndexing is false — search engines are asked not to index the site.');
  if (!config.url.startsWith('https://')) issues.push(`url "${config.url}" is not https.`);
  return issues;
}

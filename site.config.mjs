/**
 * Texponex website configuration — the single place for business details.
 *
 * Edit the values below, then run `npm run build`. Every page, the sitemap,
 * robots.txt, structured data and the security headers are generated from here.
 *
 * Several values can also be overridden with environment variables at build
 * time (useful in Cloudflare Pages → Settings → Environment variables):
 *
 *   SITE_URL         overrides `url`             e.g. https://texponex.pages.dev
 *   ALLOW_INDEXING   overrides `allowIndexing`   "true" or "false"
 *   CONTACT_EMAIL    overrides `contact.email`
 *   FORM_ENDPOINT    overrides `contact.formEndpoint`
 *
 * Nothing in this file is secret. Never put passwords or private API keys here:
 * everything is published with the website.
 */
export default {
  name: 'Texponex',
  tagline: 'Building What’s Next',

  // Production domain (registered with Cloudflare Registrar). No trailing slash.
  url: 'https://texponex.com',

  // Set to false (or ALLOW_INDEXING=false) to keep a deployment out of search
  // engines. When false, robots.txt disallows crawling and pages carry `noindex`.
  allowIndexing: true,

  description:
    'Texponex designs, engineers and delivers custom software across web, mobile, desktop and enterprise platforms — tailored to the needs of every business.',

  contact: {
    // Official business email. Shown in the contact section, footer and privacy
    // notice, and used for the contact form's email fallback. If emptied, the
    // site shows an honest "coming soon" note instead.
    email: 'hello@texponex.com',

    // Contact-form delivery endpoint from a static-form provider, e.g.
    // 'https://formspree.io/f/abcdwxyz'. Must be https. While empty, the form
    // validates input and offers to open the visitor's email app, pre-filled,
    // addressed to `email` — it never claims a message was sent.
    formEndpoint: '',

    // Shown in the privacy notice once the form is connected, e.g. 'Formspree'.
    formProviderName: '',
    formProviderPrivacyUrl: '',
  },

  // Named in the privacy notice. Change if the site is hosted elsewhere.
  hosting: {
    providerName: 'Cloudflare',
    privacyUrl: 'https://www.cloudflare.com/privacypolicy/',
  },

  legal: {
    // Registered legal entity name, once confirmed. While empty, "Texponex" is used.
    entityName: '',
    // Date shown on the privacy notice. Update whenever the notice changes.
    privacyLastUpdated: '2026-10-28',
  },

  // Browser UI color (matches the dark header).
  themeColor: '#0E0F0D',
};

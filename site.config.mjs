/**
 * Inskavex website configuration — the single place for business details.
 *
 * Edit the values below, then run `npm run build`. Every page, the sitemap,
 * robots.txt, structured data and the security headers are generated from here.
 *
 * Several values can also be overridden with environment variables at build
 * time (useful in Cloudflare Pages → Settings → Environment variables):
 *
 *   SITE_URL         overrides `url`             e.g. https://inskavex.pages.dev
 *   ALLOW_INDEXING   overrides `allowIndexing`   "true" or "false"
 *   CONTACT_EMAIL    overrides `contact.email`
 *   FORM_ENDPOINT    overrides `contact.formEndpoint`
 *
 * Nothing in this file is secret. Never put passwords or private API keys here:
 * everything is published with the website.
 */
export default {
  name: 'Inskavex',
  tagline: 'Building What’s Next',

  // Planned production domain. Confirm after the domain has been purchased and
  // connected in Cloudflare Pages. No trailing slash.
  url: 'https://inskavex.com',

  // Set to false for preview deployments (e.g. *.pages.dev before the domain is
  // live). When false, robots.txt disallows crawling and pages carry `noindex`.
  allowIndexing: true,

  description:
    'Inskavex designs and builds websites, web and mobile applications, and system integrations — practical, well-engineered software made to be maintained.',

  contact: {
    // PLACEHOLDER — the business email address has not been created yet.
    // Leave empty until it exists, e.g. 'hello@inskavex.com'. While empty, the
    // site shows an honest "coming soon" note instead of an email link.
    email: '',

    // Contact-form delivery endpoint from a static-form provider, e.g.
    // 'https://formspree.io/f/abcdwxyz'. Must be https. While empty, the form
    // validates input but clearly tells visitors their message was NOT sent.
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
    // Registered legal entity name, once confirmed. While empty, "Inskavex" is used.
    entityName: '',
    // Date shown on the privacy notice. Update whenever the notice changes.
    privacyLastUpdated: '2026-10-23',
  },

  // Browser UI color (matches the dark header).
  themeColor: '#0E0F0D',
};

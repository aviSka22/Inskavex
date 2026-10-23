// Browser tests run against real builds served by scripts/serve.mjs, which
// applies the same _headers (including the Content Security Policy) as Cloudflare.
//
// Three builds are tested:
//   :4321  the site as configured in site.config.mjs
//   :4322  a variant with a form endpoint + email (example values, tests only)
//   :4323  a variant with an email address but no form endpoint
import { defineConfig, devices } from '@playwright/test';

const serve = (port, outDir, env = {}) => ({
  command: `node scripts/build.mjs && node scripts/serve.mjs --port ${port} --dir ${outDir}`,
  url: `http://127.0.0.1:${port}/`,
  env: { BUILD_OUT_DIR: outDir, ...env },
  reuseExistingServer: false,
  timeout: 60_000,
});

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:4321',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    serve(4321, '.test-builds/default'),
    serve(4322, '.test-builds/endpoint', {
      FORM_ENDPOINT: 'https://forms.example.com/f/test',
      CONTACT_EMAIL: 'hello@example.com',
    }),
    serve(4323, '.test-builds/email', { CONTACT_EMAIL: 'hello@example.com' }),
  ],
});

// End-to-end checks of the built site in Chromium.
import { createRequire } from 'node:module';
import { expect, test } from '@playwright/test';

const require = createRequire(import.meta.url);
const AXE_PATH = require.resolve('axe-core/axe.min.js');

const WIDTHS = [320, 360, 375, 390, 430, 768, 1024, 1280, 1440, 1920];
const PAGES = ['/', '/privacy', '/this-page-does-not-exist'];
const SECTIONS = ['about', 'services', 'approach', 'focus', 'why', 'faq', 'contact'];
// The site as configured (site.config.mjs: email set, no form endpoint) runs on
// :4321; these test builds cover the other contact-form configurations.
const ENDPOINT_SITE = 'http://127.0.0.1:4322';
const UNCONFIGURED_SITE = 'http://127.0.0.1:4323';

// Fails the test on console errors, page errors and CSP violations.
function trackErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function fillValidForm(page) {
  await page.fill('#cf-name', 'Ada Example');
  await page.fill('#cf-email', 'ada@example.com');
  await page.fill('#cf-organization', 'Example Ltd');
  await page.selectOption('#cf-topic', 'Website');
  await page.fill('#cf-message', 'We would like to discuss a new website for our organization.');
}

test.describe('Pages and content', () => {
  for (const path of PAGES) {
    test(`${path} loads without errors or CSP violations`, async ({ page }) => {
      const errors = trackErrors(page);
      const failedResources = [];
      page.on('response', (response) => {
        if (response.status() >= 400 && response.request().resourceType() !== 'document') failedResources.push(response.url());
      });
      const response = await page.goto(path);
      const expectedStatus = path.startsWith('/this-page') ? 404 : 200;
      expect(response.status()).toBe(expectedStatus);
      await page.waitForLoadState('networkidle');
      expect(failedResources).toEqual([]);
      // Chromium logs the intended 404 status of the document itself as a console error.
      expect(errors.filter((text) => !(expectedStatus === 404 && text.includes('status of 404')))).toEqual([]);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('header.site-header')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
    });
  }

  test('home page has every required section, in order', async ({ page }) => {
    await page.goto('/');
    const ids = await page.locator('main > section[id]').evaluateAll((sections) => sections.map((s) => s.id));
    expect(ids).toEqual(SECTIONS);
    await expect(page.locator('.statement')).toBeVisible();
    await expect(page.locator('.standards__list li')).toHaveCount(6);
    await expect(page.locator('h1')).toContainText('Building what’s next');
    await expect(page.locator('.service')).toHaveCount(6);
    await expect(page.locator('.step')).toHaveCount(6);
    await expect(page.locator('.focus__item')).toHaveCount(6);
    await expect(page.locator('.principle')).toHaveCount(6);
  });

  test('metadata is present', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Texponex/);
    for (const selector of [
      'meta[name="description"]',
      'link[rel="canonical"]',
      'meta[property="og:image"]',
      'meta[name="twitter:card"]',
      'meta[name="theme-color"]',
      'link[rel="icon"][type="image/svg+xml"]',
      'script[type="application/ld+json"]',
    ]) {
      await expect(page.locator(selector)).toHaveCount(1);
    }
  });

  test('footer shows the current year', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-year]')).toHaveText(String(new Date().getFullYear()));
    await expect(page.locator('.site-footer')).toContainText('Texponex. All rights reserved.');
  });

  test('clean URLs, robots.txt and sitemap are served', async ({ request }) => {
    expect((await request.get('/privacy')).status()).toBe(200);
    expect((await request.get('/robots.txt')).status()).toBe(200);
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain('<loc>');
    const redirect = await request.get('/privacy.html', { maxRedirects: 0 });
    expect(redirect.status()).toBe(308);
  });

  test('all images and fonts load', async ({ page }) => {
    const failed = [];
    page.on('response', (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').length)).toBeGreaterThan(0);
    expect(failed).toEqual([]);
  });
});

test.describe('Responsive layout', () => {
  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const path of PAGES) {
        await page.goto(path);
        const overflow = await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const offenders = [...document.querySelectorAll('body *')]
            .filter((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && (rect.right > viewport + 1 || rect.left < -1) && !el.closest('.hero, .sprite, .visually-hidden, .form-honeypot, .skip-link');
            })
            .slice(0, 5)
            .map((el) => `${el.tagName.toLowerCase()}.${el.className}`);
          return { scrollWidth: document.documentElement.scrollWidth, viewport, offenders };
        });
        expect(overflow.scrollWidth, `${path} scroll width`).toBeLessThanOrEqual(overflow.viewport);
        expect(overflow.offenders, `${path} elements outside the viewport`).toEqual([]);
      }
    });
  }

  test('body text stays readable on the smallest phones', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/');
    const smallest = await page.evaluate(() =>
      Math.min(...[...document.querySelectorAll('p, li, dd, a, label, summary')]
        .filter((el) => el.offsetParent && el.textContent.trim())
        .map((el) => parseFloat(getComputedStyle(el).fontSize))),
    );
    expect(smallest).toBeGreaterThanOrEqual(12);
  });

  test('interactive targets meet the 24px minimum (WCAG 2.5.8)', async ({ page }) => {
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('button, input:not([type=hidden]), select, textarea, summary, .site-header a, .site-footer a, .button, .link-arrow')]
          .filter((el) => el.offsetParent && !el.closest('.form-honeypot'))
          .map((el) => ({ el: el.textContent.trim() || el.id, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.width < 24 || rect.height < 24)
          .map(({ el }) => el),
      );
      expect(small, `at ${width}px`).toEqual([]);
    }
  });
});

test.describe('Navigation', () => {
  test('desktop navigation scrolls sections into view below the sticky header', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('[data-nav-toggle]')).toBeHidden();
    for (const id of ['services', 'contact']) {
      await page.locator(`.site-menu a[href="/#${id}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await page.waitForTimeout(900); // smooth scrolling
      const { headerBottom, headingTop } = await page.evaluate((sectionId) => ({
        headerBottom: document.querySelector('.site-header').getBoundingClientRect().bottom,
        headingTop: document.querySelector(`#${sectionId} h2`).getBoundingClientRect().top,
      }), id);
      expect(headingTop).toBeGreaterThanOrEqual(headerBottom);
    }
  });

  test('mobile menu opens, traps background, closes with Escape and returns focus', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const toggle = page.locator('[data-nav-toggle]');
    const menu = page.locator('#site-menu');

    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await expect(page.locator('.site-menu a[href="/#about"]')).toBeVisible();
    expect(await page.evaluate(() => document.querySelector('main').inert)).toBe(true);

    // Background content (skip link, main, footer) is unreachable while the menu is open.
    // Past the last menu item, focus may move to the browser UI, as with a native modal dialog.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
      const inBackground = await page.evaluate(() => Boolean(document.activeElement.closest('.skip-link, main, .site-footer')));
      expect(inBackground).toBe(false);
    }

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();
    expect(await page.evaluate(() => document.querySelector('main').inert)).toBe(false);
  });

  test('mobile menu link closes the menu and reaches the section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('[data-nav-toggle]').click();
    await page.locator('.site-menu a[href="/#focus"]').click();
    await expect(page.locator('[data-nav-toggle]')).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/#focus$/);
    await page.waitForTimeout(900);
    const headingTop = await page.locator('#focus h2').evaluate((el) => el.getBoundingClientRect().top);
    const headerBottom = await page.locator('.site-header').evaluate((el) => el.getBoundingClientRect().bottom);
    expect(headingTop).toBeGreaterThanOrEqual(headerBottom);
  });

  test('mobile menu closes when the viewport grows to desktop', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await page.goto('/');
    await page.locator('[data-nav-toggle]').click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('[data-nav-toggle]')).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.classList.contains('nav-open'))).toBe(false);
  });

  test('skip link is the first focus stop and moves focus to main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(page.locator('main')).toBeFocused();
  });

  test('FAQ items toggle with the keyboard', async ({ page }) => {
    await page.goto('/#faq');
    const first = page.locator('.faq__item').first();
    await first.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(first).toHaveAttribute('open', '');
    await expect(first.locator('p')).toBeVisible();
  });
});

test.describe('Contact form — validation (current site)', () => {
  test('validates required fields with accessible errors', async ({ page }) => {
    await page.goto('/#contact');
    await page.locator('[data-submit]').click();
    for (const field of ['name', 'email', 'message']) {
      const input = page.locator(`#cf-${field}`);
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      const describedBy = await input.getAttribute('aria-describedby');
      expect(describedBy).toContain(`cf-${field}-error`);
      await expect(page.locator(`#cf-${field}-error`)).not.toBeEmpty();
    }
    await expect(page.locator('#cf-name')).toBeFocused();
    await expect(page.locator('#cf-organization')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('rejects malformed email and short messages, then clears errors when fixed', async ({ page }) => {
    await page.goto('/#contact');
    await page.fill('#cf-name', 'Ada Example');
    await page.fill('#cf-email', 'ada@example');
    await page.fill('#cf-message', 'Too short');
    await page.locator('[data-submit]').click();
    await expect(page.locator('#cf-email-error')).toContainText('valid email');
    await expect(page.locator('#cf-message-error')).toContainText('at least 20 characters');
    await expect(page.locator('#cf-email')).toBeFocused();

    await page.fill('#cf-email', 'ada@example.com');
    await expect(page.locator('#cf-email')).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cf-email-error')).toBeEmpty();
  });

  test('clicking submit straight from a field with an error still submits (no layout shift mid-click)', async ({ page }) => {
    await page.goto('/#contact');
    await page.fill('#cf-email', 'ada@example');
    await page.locator('[data-submit]').click();
    // The submit handler ran: every required field was validated, not just the blurred one.
    await expect(page.locator('#cf-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cf-message')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cf-name')).toBeFocused();
  });

  test('character counter follows the message', async ({ page }) => {
    await page.goto('/#contact');
    await page.fill('#cf-message', 'Hello there');
    await expect(page.locator('[data-char-count]')).toHaveText('11 / 5000');
  });
});

test.describe('Contact form — endpoint configured (test build)', () => {
  test('reports success only after a 2xx response', async ({ page }) => {
    let posted;
    await page.route('https://forms.example.com/**', async (route) => {
      posted = route.request().postData();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    const errors = trackErrors(page);
    await page.goto(`${ENDPOINT_SITE}/#contact`);
    await expect(page.locator('[data-form-notice]')).toHaveCount(0);
    await fillValidForm(page);
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-form-status]')).toContainText('Message sent.');
    expect(posted).toContain('ada@example.com');
    expect(posted).toContain('Example Ltd');
    await expect(page.locator('#cf-name')).toHaveValue('');
    expect(errors).toEqual([]);
  });

  test('shows an error and keeps the text when delivery fails', async ({ page }) => {
    await page.route('https://forms.example.com/**', (route) => route.fulfill({ status: 500, body: 'error' }));
    await page.goto(`${ENDPOINT_SITE}/#contact`);
    await fillValidForm(page);
    await page.locator('[data-submit]').click();
    const status = page.locator('[data-form-status]');
    await expect(status).toContainText('could not be sent');
    await expect(status).toContainText('hello@example.com');
    await expect(status).toHaveAttribute('data-state', 'error');
    await expect(page.locator('#cf-name')).toHaveValue('Ada Example');
  });

  test('handles network failure honestly', async ({ page }) => {
    await page.route('https://forms.example.com/**', (route) => route.abort('internetdisconnected'));
    await page.goto(`${ENDPOINT_SITE}/#contact`);
    await fillValidForm(page);
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-form-status]')).toContainText('could not be sent');
  });

  test('CSP and privacy notice reflect the configured endpoint', async ({ page, request }) => {
    const response = await request.get(`${ENDPOINT_SITE}/`);
    expect(response.headers()['content-security-policy']).toContain('connect-src \'self\' https://forms.example.com');
    await page.goto(`${ENDPOINT_SITE}/privacy`);
    await expect(page.locator('#contacting + p')).toContainText('are sent to');
    await expect(page.locator('main')).toContainText('hello@example.com');
  });
});

test.describe('Contact form — email (current site: hello@texponex.com)', () => {
  test('explains how the form works and publishes the business email', async ({ page }) => {
    await page.goto('/#contact');
    await expect(page.locator('[data-form-notice]')).toContainText('your email app opens');
    await expect(page.locator('[data-form-notice]')).toContainText('hello@texponex.com');
    await expect(page.locator('.contact__email')).toHaveAttribute('href', 'mailto:hello@texponex.com');
    await expect(page.locator('.site-footer a[href="mailto:hello@texponex.com"]')).toBeVisible();
  });

  test('prepares a pre-filled email and never claims delivery', async ({ page }) => {
    const errors = trackErrors(page);
    const requests = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') requests.push(request.url());
    });
    await page.goto('/#contact');
    await fillValidForm(page);
    await page.selectOption('#cf-timeline', 'Within 1–3 months');
    await page.locator('[data-submit]').click();
    const status = page.locator('[data-form-status]');
    await expect(status).toContainText('Nothing has been sent yet');
    await expect(status).not.toContainText('Message sent');
    await expect(status).toBeFocused();
    const href = await status.locator('a').getAttribute('href');
    expect(href).toMatch(/^mailto:hello@texponex\.com\?subject=/);
    expect(decodeURIComponent(href)).toContain('We would like to discuss a new website');
    expect(decodeURIComponent(href)).toContain('Timeline: Within 1–3 months');
    // Opening the email app leaves the page in place, with the visitor's text kept.
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(page.locator('#cf-message')).not.toBeEmpty();
    expect(requests).toEqual([]);
    expect(errors).toEqual([]);
  });

  test('privacy notice describes the email behavior', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.locator('main')).toContainText('opens your own email application');
    await expect(page.locator('main a[href="mailto:hello@texponex.com"]').first()).toBeVisible();
  });
});

test.describe('Contact form — nothing configured (test build)', () => {
  test('shows an honest notice, says nothing was sent and makes no request', async ({ page }) => {
    const requests = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') requests.push(request.url());
    });
    await page.goto(`${UNCONFIGURED_SITE}/#contact`);
    await expect(page.locator('[data-form-notice]')).toContainText('not yet connected');
    await expect(page.locator('.contact__email--pending')).toBeVisible();
    await fillValidForm(page);
    await page.locator('[data-submit]').click();
    const status = page.locator('[data-form-status]');
    await expect(status).toContainText('has not been sent');
    await expect(status).not.toContainText('Message sent');
    expect(requests).toEqual([]);
  });
});

test.describe('Motion and progressive enhancement', () => {
  test('reduced-motion preference disables reveals and animation', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4321/');
    expect(await page.evaluate(() => document.documentElement.classList.contains('motion-ready'))).toBe(false);
    const opacity = await page.locator('#why .principle').last().evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    const duration = await page.locator('.hero-art__next').evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
    expect(duration).toBeLessThan(0.01);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
    // Without motion, headings are not split and the statement is fully lit.
    expect(await page.locator('#services-title .w').count()).toBe(0);
    await expect(page.locator('[data-statement]')).not.toHaveClass(/statement--scrub/);
    await context.close();
  });

  test('content reveals as it scrolls into view with motion enabled', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.classList.contains('motion-ready'))).toBe(true);
    const target = page.locator('#faq .faq__list');
    await target.scrollIntoViewIfNeeded();
    await expect(target).toHaveClass(/is-visible/);
  });

  test('headings keep their exact text after being split into words', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('Building what’s next, engineered to last.');
    await expect(page.locator('#services-title')).toHaveText('What we do');
    await expect(page.locator('#contact-title')).toHaveText('Let’s talk about what you’re building.');
    expect(await page.locator('#services-title .w').count()).toBe(3);
  });

  test('every animated element ends fully visible after scrolling the page', async ({ page }) => {
    await page.goto('/');
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 500) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(1800);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll('.reveal, .section-title .w > span, .focus__item, .step')]
        .filter((el) => {
          const style = getComputedStyle(el);
          return parseFloat(style.opacity) < 0.99 || (style.transform !== 'none' && style.transform !== 'matrix(1, 0, 0, 1, 0, 0)');
        })
        .map((el) => el.className || el.textContent),
    );
    expect(hidden).toEqual([]);
    expect(await page.locator('.rule-draw:not(.is-visible)').count()).toBe(0);
  });

  test('statement band lights up as it is read', async ({ page }) => {
    await page.goto('/');
    const statement = page.locator('[data-statement]');
    await expect(statement).toHaveClass(/statement--scrub/);
    expect(await statement.locator('.sw.is-lit').count()).toBe(0);
    // Fully lit once the passage's bottom reaches the reading line (45% of the viewport).
    await statement.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 0.4));
    await expect.poll(() => statement.locator('.sw:not(.is-lit)').count()).toBe(0);
    await expect(statement).toHaveText(/That is the standard we build to\.$/);
  });

  test('header progress line follows the scroll position', async ({ page }) => {
    await page.goto('/');
    const progress = () => page.locator('[data-header]').evaluate((el) => parseFloat(el.style.getPropertyValue('--progress')));
    expect(await progress()).toBe(0);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(progress).toBeGreaterThan(0.99);
  });

  test('site is readable and navigable without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4321/');
    await expect(page.locator('.site-menu a[href="/#services"]')).toBeVisible();
    await expect(page.locator('#why .principle').last()).toBeVisible();
    expect(await page.locator('#why .principle').last().evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    await expect(page.locator('[data-submit]')).toBeDisabled();
    const widths = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    expect(widths[0]).toBeLessThanOrEqual(widths[1]);
    await context.close();
  });
});

test.describe('Accessibility (axe-core, WCAG 2.2 A/AA)', () => {
  test.use({ bypassCSP: true }); // needed only to inject the axe script

  async function axe(page, label) {
    await page.addScriptTag({ path: AXE_PATH });
    const results = await page.evaluate(() =>
      window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } }),
    );
    const violations = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
    expect(violations, label).toEqual([]);
  }

  for (const path of PAGES) {
    for (const width of [375, 1440]) {
      test(`${path} at ${width}px has no violations`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.goto(path);
        await axe(page, `${path} @ ${width}`);
      });
    }
  }

  test('open mobile menu has no violations', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.locator('[data-nav-toggle]').click();
    await axe(page, 'mobile menu open');
  });

  test('form in error and status states has no violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#contact');
    await page.locator('[data-submit]').click();
    await axe(page, 'form errors');
    await fillValidForm(page);
    await page.locator('[data-submit]').click();
    await axe(page, 'form status');
  });
});

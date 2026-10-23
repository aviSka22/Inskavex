/*
 * Inskavex — progressive enhancement.
 * The site is fully readable without this file; it adds the mobile menu,
 * section highlighting, gentle reveals and contact-form validation/delivery.
 */
(() => {
  'use strict';

  const root = document.documentElement;
  const desktop = window.matchMedia('(min-width: 64em)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* Footer year ----------------------------------------------------------- */

  const year = String(new Date().getFullYear());
  document.querySelectorAll('[data-year]').forEach((element) => {
    element.textContent = year;
  });

  /* Header state ---------------------------------------------------------- */

  const header = document.querySelector('[data-header]');
  if (header) {
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* Mobile navigation ----------------------------------------------------- */

  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.querySelector('[data-nav-menu]');
  const label = document.querySelector('[data-nav-label]');
  const backgroundRegions = [...document.querySelectorAll('.skip-link, main, .site-footer')];

  const isOpen = () => toggle && toggle.getAttribute('aria-expanded') === 'true';

  function setMenu(open, { returnFocus = false } = {}) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    if (label) label.textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('nav-open', open);
    // Keep keyboard and screen-reader focus inside the open menu.
    backgroundRegions.forEach((region) => {
      region.inert = open;
    });
    if (!open && returnFocus) toggle.focus();
  }

  if (toggle && menu) {
    toggle.addEventListener('click', () => setMenu(!isOpen()));

    menu.addEventListener('click', (event) => {
      if (event.target.closest('a') && isOpen()) setMenu(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) setMenu(false, { returnFocus: true });
    });

    document.addEventListener('click', (event) => {
      if (isOpen() && !header.contains(event.target)) setMenu(false);
    });

    desktop.addEventListener('change', (event) => {
      if (event.matches && isOpen()) setMenu(false);
    });
  }

  /* Current-section highlighting ------------------------------------------ */

  const navLinks = [...document.querySelectorAll('.site-menu__link[href^="/#"]')];
  const sections = navLinks
    .map((link) => document.getElementById(link.getAttribute('href').slice(2)))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const visible = new Map();
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => visible.set(entry.target.id, entry.isIntersecting));
      const current = sections.find((section) => visible.get(section.id));
      navLinks.forEach((link) => {
        if (current && link.getAttribute('href') === `/#${current.id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach((section) => observer.observe(section));
  }

  /* Reveal on scroll ------------------------------------------------------ */

  const revealItems = [...document.querySelectorAll('.reveal')];
  if (revealItems.length && 'IntersectionObserver' in window && !reducedMotion.matches) {
    // Anything already on screen is shown immediately to avoid a flash.
    revealItems.forEach((item) => {
      if (item.getBoundingClientRect().top < window.innerHeight) item.classList.add('is-visible');
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach((item) => {
      if (!item.classList.contains('is-visible')) observer.observe(item);
    });
    root.classList.add('motion-ready');
  }

  /* Contact form ---------------------------------------------------------- */

  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const REQUEST_TIMEOUT = 15000;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const delivery = form.dataset.delivery; // "endpoint" | "email" | "none"
  const businessEmail = form.dataset.email;
  const submitButton = form.querySelector('[data-submit]');
  const submitLabel = form.querySelector('[data-submit-label]');
  const status = form.querySelector('[data-form-status]');
  const counter = form.querySelector('[data-char-count]');
  const message = form.elements.message;

  const rules = {
    name: (value) => {
      if (!value) return 'Please enter your name.';
      if (value.length < 2) return 'Please enter your full name.';
      return '';
    },
    email: (value) => {
      if (!value) return 'Please enter your email address so we can reply.';
      if (!EMAIL_PATTERN.test(value)) return 'Please enter a valid email address, for example name@example.com.';
      return '';
    },
    message: (value) => {
      if (!value) return 'Please enter a message.';
      if (value.length < 20) return `Please add a little more detail — at least 20 characters (currently ${value.length}).`;
      if (value.length > 5000) return 'Please shorten your message to 5,000 characters or fewer.';
      return '';
    },
  };

  let attempted = false;
  form.noValidate = true; // JavaScript takes over validation with accessible messages.
  if (submitButton) submitButton.disabled = false;

  function fieldParts(name) {
    const input = form.elements[name];
    const wrapper = input.closest('[data-field]');
    return { input, wrapper, error: wrapper.querySelector('[data-error]') };
  }

  function validateField(name) {
    const { input, wrapper, error } = fieldParts(name);
    const problem = rules[name](input.value.trim());
    error.textContent = problem;
    wrapper.classList.toggle('is-invalid', Boolean(problem));
    if (problem) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !problem;
  }

  Object.keys(rules).forEach((name) => {
    const { input } = fieldParts(name);
    input.addEventListener('blur', (event) => {
      // When focus moves to the submit button, the submit handler validates
      // everything; validating here would shift the layout mid-click.
      if (event.relatedTarget === submitButton) return;
      if (attempted || input.value.trim()) validateField(name);
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true') validateField(name);
    });
  });

  function updateCounter() {
    if (counter) counter.textContent = `${message.value.length} / 5000`;
  }
  message.addEventListener('input', updateCounter);
  updateCounter();

  // Status messages are built with DOM methods and textContent only.
  function showStatus(state, title, paragraphs = [], extra) {
    status.replaceChildren();
    status.dataset.state = state;
    const heading = document.createElement('p');
    heading.className = 'form-status__title';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${{ success: 'i-check', error: 'i-alert', info: 'i-info' }[state]}`);
    svg.append(use);
    heading.append(svg, title);
    status.append(heading);
    paragraphs.forEach((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      status.append(paragraph);
    });
    if (extra) status.append(extra);
    status.focus();
  }

  function clearStatus() {
    status.replaceChildren();
    delete status.dataset.state;
  }

  function setBusy(busy) {
    submitButton.setAttribute('aria-disabled', String(busy));
    form.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Sending…' : 'Send message';
  }

  function collect() {
    const value = (name) => form.elements[name].value.trim();
    return {
      name: value('name'),
      email: value('email'),
      organization: value('organization'),
      topic: value('topic'),
      message: value('message'),
    };
  }

  function mailtoLink(data) {
    const subject = `${data.topic} — enquiry from ${data.name}`;
    const details = [`Name: ${data.name}`, `Email: ${data.email}`];
    if (data.organization) details.push(`Organization: ${data.organization}`);
    details.push(`Topic: ${data.topic}`);
    const body = `${details.join('\n')}\n\n${data.message}`;
    return `mailto:${businessEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  async function sendToEndpoint(data) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    setBusy(true);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      form.reset();
      updateCounter();
      showStatus('success', 'Message sent.', [
        `Thank you, ${data.name}. Your message has been delivered, and we’ll reply to ${data.email}.`,
      ]);
    } catch (error) {
      const fallback = businessEmail ? ` You can also email us directly at ${businessEmail}.` : '';
      showStatus('error', 'Your message could not be sent.', [
        `${error.name === 'AbortError' ? 'The request took too long.' : 'Something went wrong while sending.'} Your text is still in the form — please try again in a moment.${fallback}`,
      ]);
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (submitButton.getAttribute('aria-disabled') === 'true') return;
    attempted = true;
    clearStatus();

    const invalid = Object.keys(rules).filter((name) => !validateField(name));
    if (invalid.length) {
      fieldParts(invalid[0]).input.focus();
      return;
    }

    const data = collect();

    if (delivery === 'endpoint') {
      sendToEndpoint(data);
    } else if (delivery === 'email' && businessEmail) {
      const link = document.createElement('a');
      link.className = 'button button--accent';
      link.href = mailtoLink(data);
      link.textContent = 'Open in your email app';
      const note = document.createElement('p');
      note.className = 'form-status__small';
      note.textContent = 'This opens your own email application with the message filled in. It is only sent once you press send there.';
      const wrapper = document.createElement('div');
      wrapper.append(link, note);
      showStatus('info', 'Your message has not been sent yet.', [
        'Online delivery for this form is not set up, so it cannot send your message directly. You can send it from your email app instead — we have prepared it for you.',
      ], wrapper);
    } else {
      showStatus('info', 'Your message has not been sent.', [
        'This form is not connected to a delivery service yet, so nothing has been sent or stored. Online enquiries will open when the website launches — please check back soon.',
      ]);
    }
  });
})();

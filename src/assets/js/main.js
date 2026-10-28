/*
 * Texponex — progressive enhancement.
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

  /* Scroll loop: one rAF-throttled listener shared by all scroll effects ---- */

  const scrollTasks = [];
  let ticking = false;
  const runScrollTasks = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      scrollTasks.forEach((task) => task());
      ticking = false;
    });
  };
  window.addEventListener('scroll', runScrollTasks, { passive: true });
  window.addEventListener('resize', runScrollTasks, { passive: true });

  /* Header state and reading progress ------------------------------------- */

  const header = document.querySelector('[data-header]');
  if (header) {
    const updateHeader = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0;
      header.style.setProperty('--progress', progress.toFixed(4));
    };
    scrollTasks.push(updateHeader);
    updateHeader();
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

  /* Motion: word splitting, staggered reveals, statement band ------------ */

  // Wraps every word inside `element` (including nested elements) using
  // makeWord(text). Spaces stay as plain text, so line breaking and the text
  // read by assistive technology are unchanged.
  function splitWords(element, makeWord) {
    const words = [];
    [...element.childNodes].forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        words.push(...splitWords(node, makeWord));
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
        const fragment = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            fragment.append(part);
          } else {
            const word = makeWord(part);
            words.push(word);
            fragment.append(word);
          }
        });
        node.replaceWith(fragment);
      }
    });
    return words;
  }

  const maskedWord = (text) => {
    const outer = document.createElement('span');
    const inner = document.createElement('span');
    outer.className = 'w';
    inner.textContent = text;
    outer.append(inner);
    return outer;
  };

  const motionAllowed = 'IntersectionObserver' in window && !reducedMotion.matches;

  if (motionAllowed) {
    document.querySelectorAll('.section-title').forEach((title) => {
      splitWords(title, maskedWord).forEach((word, index) => word.style.setProperty('--dl', index));
    });

    const targets = [...document.querySelectorAll('.reveal, .section-title, .rule-draw, .step')];
    let firstCallback = true;

    const observer = new IntersectionObserver((entries) => {
      const arriving = entries.filter((entry) => entry.isIntersecting);
      arriving.forEach((entry) => observer.unobserve(entry.target));

      if (firstCallback) {
        // Whatever is already on screen is shown as-is; only then is motion
        // switched on, so nothing visible ever flashes. No layout is read here.
        firstCallback = false;
        arriving.forEach((entry) => entry.target.classList.add('is-visible'));
        root.classList.add('motion-ready');
        return;
      }

      // Items arriving together (a grid row, a list) are staggered in reading order.
      arriving
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
        .forEach(({ target }, index) => {
          if (target.classList.contains('reveal') || target.classList.contains('step')) {
            target.style.setProperty('--dl', Math.min(index, 6));
          }
          target.classList.add('is-visible');
        });
    }, { rootMargin: '0px 0px -10% 0px' });
    targets.forEach((target) => observer.observe(target));

    // Once revealed, give elements back their own transitions (e.g. button hovers).
    document.addEventListener('transitionend', (event) => {
      const target = event.target;
      if (event.propertyName === 'opacity' && target.classList.contains('reveal') && target.classList.contains('is-visible')) {
        target.classList.remove('reveal');
        target.style.removeProperty('--dl');
      }
    });

    // Statement band: words light up as the passage is read.
    const statement = document.querySelector('[data-statement]');
    if (statement) {
      const words = splitWords(statement, (text) => {
        const word = document.createElement('span');
        word.className = 'sw';
        word.textContent = text;
        return word;
      });
      statement.classList.add('statement--scrub');
      let litCount = -1;
      const scrub = () => {
        const rect = statement.getBoundingClientRect();
        const viewport = window.innerHeight;
        // 0 when the text's top reaches 85% of the viewport, 1 when its bottom reaches 45%.
        const progress = (viewport * 0.85 - rect.top) / (viewport * 0.4 + rect.height);
        const count = Math.round(Math.max(0, Math.min(1, progress)) * words.length);
        if (count === litCount) return;
        litCount = count;
        words.forEach((word, index) => word.classList.toggle('is-lit', index < count));
      };
      scrollTasks.push(scrub);
      scrub();
    }
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
      timeline: value('timeline'),
      message: value('message'),
    };
  }

  function mailtoLink(data) {
    const subject = `${data.topic} — inquiry from ${data.name}`;
    const details = [`Name: ${data.name}`, `Email: ${data.email}`];
    if (data.organization) details.push(`Organization: ${data.organization}`);
    details.push(`Topic: ${data.topic}`);
    if (data.timeline) details.push(`Timeline: ${data.timeline}`);
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
      const href = mailtoLink(data);
      const link = document.createElement('a');
      link.className = 'button button--accent';
      link.href = href;
      link.textContent = 'Open in your email app';
      const note = document.createElement('p');
      note.className = 'form-status__small';
      note.textContent = `If your email app did not open, use the button above or write to ${businessEmail} directly.`;
      const wrapper = document.createElement('div');
      wrapper.append(link, note);
      showStatus('info', 'Your message is ready to send.', [
        `Nothing has been sent yet: your email app is opening with your message filled in, addressed to ${businessEmail}. Press Send there to deliver it.`,
      ], wrapper);
      window.location.href = href;
    } else {
      showStatus('info', 'Your message has not been sent.', [
        'This form is not connected to a delivery service yet, so nothing has been sent or stored. Online inquiries will open when the website launches — please check back soon.',
      ]);
    }
  });
})();

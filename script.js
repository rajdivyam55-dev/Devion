(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('js');
  const byId = (id) => document.getElementById(id);

  // Retain the startup treatment, but keep it brief so the page is ready quickly.
  const bootScreen = byId('bootScreen');
  const bootText = byId('bootText');
  const bootStatus = byId('bootStatus');
  const bootStartedAt = Date.now();
  const bootDuration = 3000;
  const bootFadeDuration = 250;
  const bootLines = [
    ['system ready', 'Core interface initialized.'],
    ['developer online..........', 'Connection established.'],
    ['welcome to devion', 'Entering portfolio.']
  ];
  let lineIndex = 0;
  let charIndex = 0;
  const dismissBoot = () => bootScreen?.classList.add('boot-complete');
  const bootFailsafe = window.setTimeout(dismissBoot, bootDuration - bootFadeDuration);

  function typeBootLine() {
    if (!bootScreen || !bootText || !bootStatus) {
      window.clearTimeout(bootFailsafe);
      return;
    }
    if (lineIndex >= bootLines.length) {
      bootStatus.textContent = 'Launching Devion...';
      const remaining = Math.max(0, bootDuration - (Date.now() - bootStartedAt) - bootFadeDuration);
      window.setTimeout(() => {
        dismissBoot();
        window.clearTimeout(bootFailsafe);
      }, remaining);
      return;
    }
    const [line, status] = bootLines[lineIndex];
    if (charIndex < line.length) {
      bootText.textContent += line[charIndex++];
      window.setTimeout(typeBootLine, 10);
      return;
    }
    bootStatus.textContent = status;
    lineIndex += 1;
    charIndex = 0;
    window.setTimeout(() => {
      bootText.textContent = '';
      typeBootLine();
    }, 75);
  }
  window.setTimeout(typeBootLine, 45);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) dismissBoot();
  });

  const year = byId('year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Responsive navigation.
  const menuToggle = byId('menuToggle');
  const navLinks = byId('navLinks');
  if (menuToggle && navLinks) {
    const closeMenu = () => {
      navLinks.classList.remove('nav-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open navigation');
    };
    menuToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    navLinks.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMenu();
    });
  }

  // Theme toggle with safe storage fallback.
  const themeToggle = byId('themeToggle');
  try {
    if (window.localStorage.getItem('devion-theme') === 'light') root.dataset.theme = 'light';
  } catch (_) { /* Storage can be disabled in private or embedded browsers. */ }
  function updateThemeButton() {
    if (!themeToggle) return;
    const light = root.dataset.theme === 'light';
    const icon = themeToggle.querySelector('.theme-icon');
    const label = themeToggle.querySelector('.theme-label');
    if (icon) icon.textContent = light ? '☀' : '☾';
    if (label) label.textContent = light ? 'Dark' : 'Light';
    themeToggle.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
  }
  updateThemeButton();
  themeToggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    try { window.localStorage.setItem('devion-theme', root.dataset.theme); } catch (_) { /* Theme remains usable for this visit. */ }
    updateThemeButton();
  });

  // Restore and clamp the movable local-time widget.
  const clock = byId('digitalClock');
  if (clock) {
    const clockTime = clock.querySelector('.clock-time');
    const clockDate = clock.querySelector('.clock-date');
    const storageKey = 'devion-clock-position';
    const clampPosition = (left, top) => ({
      left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - clock.offsetWidth)),
      top: Math.min(Math.max(0, top), Math.max(0, window.innerHeight - clock.offsetHeight))
    });
    const setClockPosition = (left, top) => {
      const position = clampPosition(left, top);
      clock.style.left = `${position.left}px`;
      clock.style.top = `${position.top}px`;
      clock.style.right = 'auto';
    };
    try {
      const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null');
      if (Number.isFinite(saved?.left) && Number.isFinite(saved?.top)) setClockPosition(saved.left, saved.top);
    } catch (_) { /* Default top-right position is sufficient. */ }

    let drag = null;
    clock.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      const rect = clock.getBoundingClientRect();
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rect.left, top: rect.top, moved: false };
      clock.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    clock.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 3) return;
      drag.moved = true;
      clock.classList.add('clock-dragging');
      setClockPosition(drag.left + dx, drag.top + dy);
    });
    const finishDrag = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.moved;
      drag = null;
      clock.classList.remove('clock-dragging');
      if (!moved) return;
      const rect = clock.getBoundingClientRect();
      try { window.localStorage.setItem(storageKey, JSON.stringify({ left: rect.left, top: rect.top })); } catch (_) { /* Dragging still works without storage. */ }
    };
    clock.addEventListener('pointerup', finishDrag);
    clock.addEventListener('pointercancel', finishDrag);
    window.addEventListener('resize', () => {
      if (clock.style.left) {
        const rect = clock.getBoundingClientRect();
        setClockPosition(rect.left, rect.top);
      }
    }, { passive: true });

    const updateClock = () => {
      const now = new Date();
      if (clockTime) clockTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      if (clockDate) clockDate.textContent = now.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    };
    updateClock();
    let clockTimer = window.setInterval(updateClock, 1000);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.clearInterval(clockTimer);
        clockTimer = 0;
      } else if (!clockTimer) {
        updateClock();
        clockTimer = window.setInterval(updateClock, 1000);
      }
    });
  }

  // Keep every section rendered and visible before the first scroll.
  const revealItems = document.querySelectorAll('.reveal');
  revealItems.forEach((item) => item.classList.add('is-visible'));

})();

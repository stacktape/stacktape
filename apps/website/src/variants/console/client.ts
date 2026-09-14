/*
 * The page-side behaviour of the "console" study: the sidebar that follows the scroll, the reveal
 * divider on the Review screen, the screens that fade in, and the command boxes' switcher and Copy.
 * Everything the server rendered is already correct; this only adds motion and feedback.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ── Sidebar follows the scroll ───────────────────────────────────────────────────────────────────

const mountSidebar = () => {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-side-link]'));
  const screens = Array.from(document.querySelectorAll<HTMLElement>('[data-screen]'));
  if (links.length === 0 || screens.length === 0) return;

  let currentId = '';
  const setCurrent = (id: string) => {
    if (id === currentId) return;
    currentId = id;
    for (const link of links) {
      const active = link.dataset.sideLink === id;
      if (active) {
        link.setAttribute('aria-current', 'location');
        // In the mobile strip the active tab should be visible without the visitor scrolling it.
        link.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      } else {
        link.removeAttribute('aria-current');
      }
    }
  };

  // The screen whose top is closest above the reading line wins. This reads better than the
  // largest-intersection rule for tall screens that fill more than one viewport. The same pass
  // marks every screen that has entered the viewport, which is what the entrance transition keys on.
  const pick = () => {
    const line = window.innerHeight * 0.35;
    const enter = window.innerHeight * 0.92;
    let best = screens[0];
    for (const screen of screens) {
      const top = screen.getBoundingClientRect().top;
      if (top <= line) best = screen;
      if (top <= enter) screen.classList.add('is-in');
    }
    if (best) setCurrent(best.dataset.screen ?? '');
  };

  // Seven rect reads per scroll event: cheap enough to run directly. The trailing call covers a
  // browser that coalesces the last scroll events of a smooth scroll.
  let trailing = 0;
  const onScroll = () => {
    pick();
    window.clearTimeout(trailing);
    trailing = window.setTimeout(pick, 160);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  for (const link of links) {
    link.addEventListener('click', (event) => {
      const target = document.getElementById(link.dataset.sideLink ?? '');
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${target.id}`);
      setCurrent(target.id);
    });
  }
  pick();
};

// ── Screens fade in as they enter ────────────────────────────────────────────────────────────────

// The scroll pass above adds `is-in` as screens enter. Under reduced motion there is no entrance,
// so every screen is marked at once and the stylesheet shows them static.
const mountEntrances = () => {
  if (!reducedMotion.matches) return;
  for (const screen of document.querySelectorAll<HTMLElement>('.cs-screen')) screen.classList.add('is-in');
};

// ── The reveal divider ───────────────────────────────────────────────────────────────────────────

const mountReveal = (reveal: HTMLElement) => {
  const handle = reveal.querySelector<HTMLElement>('[data-reveal-handle]');
  if (!handle) return;
  const min = 8;
  const max = 92;
  const home = 46;
  let value = home;

  const apply = (next: number) => {
    value = Math.min(max, Math.max(min, next));
    reveal.style.setProperty('--reveal', `${value}%`);
    handle.setAttribute('aria-valuenow', String(Math.round(value)));
  };
  const fromPointer = (clientX: number) => {
    const box = reveal.getBoundingClientRect();
    apply(((clientX - box.left) / box.width) * 100);
  };

  const move = (event: PointerEvent) => fromPointer(event.clientX);
  const release = () => {
    reveal.classList.remove('is-dragging');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', release);
    window.removeEventListener('pointercancel', release);
  };
  handle.addEventListener('pointerdown', (event: PointerEvent) => {
    event.preventDefault();
    reveal.classList.add('is-dragging');
    // Capture keeps the drag on the handle while the pointer is over the diagram or the file; the
    // window listeners carry the drag in a browser that refuses the capture.
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // The window listeners below are enough.
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    fromPointer(event.clientX);
  });
  handle.addEventListener('dblclick', () => apply(home));
  handle.addEventListener('keydown', (event: KeyboardEvent) => {
    const step = event.shiftKey ? 12 : 4;
    if (event.key === 'ArrowLeft') apply(value - step);
    else if (event.key === 'ArrowRight') apply(value + step);
    else if (event.key === 'Home') apply(min);
    else if (event.key === 'End') apply(max);
    else return;
    event.preventDefault();
  });
};

// ── The command box ──────────────────────────────────────────────────────────────────────────────

const mountCommand = (box: HTMLElement) => {
  const methods = Array.from(box.querySelectorAll<HTMLButtonElement>('[data-method]'));
  const text = box.querySelector<HTMLElement>('[data-command-text]');
  const copy = box.querySelector<HTMLButtonElement>('[data-copy]');
  const label = box.querySelector<HTMLElement>('[data-copy-label]');
  if (!text || !copy || !label) return;

  for (const method of methods) {
    method.addEventListener('click', () => {
      for (const other of methods) {
        const active = other === method;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-selected', String(active));
      }
      text.textContent = method.dataset.command ?? '';
      box.classList.remove('is-copied');
      label.textContent = 'Copy';
    });
  }

  let timer = 0;
  copy.addEventListener('click', async () => {
    const command = text.textContent ?? '';
    try {
      await navigator.clipboard.writeText(command);
      box.classList.add('is-copied');
      label.textContent = 'Copied';
    } catch {
      // Clipboard access can be denied (insecure context, permissions). Select the text so a manual
      // copy is one keystroke away.
      const range = document.createRange();
      range.selectNodeContents(text);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
      label.textContent = 'Select and copy';
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      box.classList.remove('is-copied');
      label.textContent = 'Copy';
    }, 1800);
  });
};

// ── Mount ────────────────────────────────────────────────────────────────────────────────────────

document.documentElement.classList.add('cs-js');
mountEntrances();
mountSidebar();
for (const reveal of document.querySelectorAll<HTMLElement>('[data-reveal]')) mountReveal(reveal);
for (const box of document.querySelectorAll<HTMLElement>('[data-cs-command]')) mountCommand(box);

// A module, not a script: keeps these names off the global scope shared with other studies.
export {};

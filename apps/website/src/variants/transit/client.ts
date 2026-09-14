/**
 * Behaviour for the transit study: the install command boxes, the compact sticky bar (station
 * progress and its copy button), and which stations have been reached.
 *
 * Line drawing is pure CSS (scroll-driven animations, see transit.css). This file marks stations
 * as reached (marker fill) and current (the bar's progress), and runs the copy buttons.
 */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ── Clipboard ──────────────────────────────────────────────────────────────────────────────────

async function writeClipboard(value: string) {
  if (!navigator.clipboard) throw new Error('clipboard unavailable');
  await navigator.clipboard.writeText(value);
}

function selectContents(node: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

const FALLBACK_MESSAGE = 'Clipboard is not available. The command is selected; press Ctrl+C or Cmd+C to copy it.';

// ── Command box ────────────────────────────────────────────────────────────────────────────────

function setupCommandBox(box: HTMLElement) {
  const tabs = Array.from(box.querySelectorAll<HTMLButtonElement>('[data-cmd-tab]'));
  const text = box.querySelector<HTMLElement>('[data-cmd-text]');
  const copy = box.querySelector<HTMLButtonElement>('[data-cmd-copy]');
  const copyLabel = box.querySelector<HTMLElement>('[data-cmd-copy-label]');
  const live = box.querySelector<HTMLElement>('[data-cmd-live]');
  if (!text || !copy || !copyLabel || !live) return;

  const commandFor = (id: string) =>
    box.querySelector<HTMLTemplateElement>(`[data-cmd-template="${id}"]`)?.content.textContent?.trim() ?? '';

  const select = (tab: HTMLButtonElement, focus = false) => {
    for (const other of tabs) {
      const active = other === tab;
      other.setAttribute('aria-selected', active ? 'true' : 'false');
      other.tabIndex = active ? 0 : -1;
    }
    text.textContent = commandFor(tab.dataset.cmdTab ?? 'npx');
    resetCopy();
    if (focus) tab.focus();
  };

  let resetTimer: number | undefined;
  const resetCopy = () => {
    window.clearTimeout(resetTimer);
    copy.classList.remove('is-copied', 'is-failed');
    copyLabel.textContent = 'Copy';
  };
  const feedback = (state: 'copied' | 'failed', message: string) => {
    copy.classList.toggle('is-copied', state === 'copied');
    copy.classList.toggle('is-failed', state === 'failed');
    copyLabel.textContent = state === 'copied' ? 'Copied' : 'Select & copy';
    live.textContent = message;
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      resetCopy();
      live.textContent = '';
    }, 2400);
  };

  copy.addEventListener('click', async () => {
    const value = text.textContent?.trim() ?? '';
    try {
      await writeClipboard(value);
      feedback('copied', `Copied: ${value}`);
    } catch {
      selectContents(text);
      feedback('failed', FALLBACK_MESSAGE);
    }
  });

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => select(tab));
    tab.addEventListener('keydown', (event) => {
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (delta === 0) return;
      event.preventDefault();
      select(tabs[(index + delta + tabs.length) % tabs.length]!, true);
    });
  });
}

document.querySelectorAll<HTMLElement>('[data-cmd]').forEach(setupCommandBox);

// ── Sticky bar: copy button ────────────────────────────────────────────────────────────────────

const nav = document.querySelector<HTMLElement>('[data-nav]');
const navCopy = nav?.querySelector<HTMLButtonElement>('[data-nav-copy]');
const navCopyLabel = nav?.querySelector<HTMLElement>('[data-nav-copy-label]');
const navLive = nav?.querySelector<HTMLElement>('[data-nav-live]');

if (navCopy && navCopyLabel && navLive) {
  let resetTimer: number | undefined;
  navCopy.addEventListener('click', async () => {
    const value = 'npx stacktape init';
    try {
      await writeClipboard(value);
      navCopy.classList.add('is-copied');
      navCopyLabel.textContent = 'Copied';
      navLive.textContent = `Copied: ${value}`;
    } catch {
      // No clipboard: jump to the hero's command box and select the command there.
      const heroText = document.querySelector<HTMLElement>('#hero-cmd-panel [data-cmd-text]');
      if (heroText) {
        heroText.scrollIntoView({ block: 'center', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
        selectContents(heroText);
      }
      navLive.textContent = FALLBACK_MESSAGE;
    }
    window.clearTimeout(resetTimer);
    resetTimer = window.setTimeout(() => {
      navCopy.classList.remove('is-copied');
      navCopyLabel.textContent = 'Copy';
      navLive.textContent = '';
    }, 2400);
  });
}

// ── Stations: reached markers, current station, compact bar ────────────────────────────────────

const stations = Array.from(document.querySelectorAll<HTMLElement>('[data-station]'));
const segments = new Map(
  Array.from(document.querySelectorAll<HTMLElement>('[data-progress-item]')).map((item) => [
    item.dataset.progressItem,
    item
  ])
);
const stationNo = nav?.querySelector<HTMLElement>('.tr-nav__station-no');
const stationName = nav?.querySelector<HTMLElement>('.tr-nav__station-name');
const beats = Array.from(document.querySelectorAll<HTMLElement>('.tr-beat'));

function setProgress(current: HTMLElement | undefined) {
  let passed = current !== undefined;
  for (const station of stations) {
    const segment = segments.get(station.dataset.station);
    segment?.classList.toggle('is-reached', passed);
    segment?.classList.toggle('is-current', station === current);
    if (station === current) passed = false;
  }
  if (!stationNo || !stationName) return;
  if (!current) {
    stationNo.textContent = '';
    stationName.textContent = 'The journey · 10 stations';
    return;
  }
  const no = current.querySelector('.tr-plate__no')?.textContent ?? '';
  const name = current.querySelector('.tr-plate__name')?.textContent ?? '';
  stationNo.textContent = no;
  stationNo.style.setProperty('--c', getComputedStyle(current).getPropertyValue('--line-in'));
  stationName.textContent = name;
}

// Scroll events already arrive at most once per frame, and the work is ten rect reads.
function update() {
  nav?.classList.toggle('is-compact', window.scrollY > 96);
  // A station is reached once its top passes the lower half of the viewport; the last one reached
  // is the current one in the bar. Stops on the incident rail fill a little later, one by one.
  const limit = window.innerHeight * 0.55;
  let current: HTMLElement | undefined;
  for (const station of stations) {
    if (station.getBoundingClientRect().top < limit) {
      station.classList.add('is-reached');
      current = station;
    }
  }
  for (const beat of beats) {
    if (beat.getBoundingClientRect().top < window.innerHeight * 0.7) beat.classList.add('is-reached');
  }
  setProgress(current);
}

window.addEventListener('scroll', update, { passive: true });
window.addEventListener('resize', update);
update();

if (reducedMotion.matches) {
  for (const station of stations) station.classList.add('is-reached');
  for (const beat of beats) beat.classList.add('is-reached');
}

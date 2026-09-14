/**
 * The page's three behaviours, all passive:
 *
 * - the nav gains the ground colour once the page has scrolled 40px;
 * - the stage crossing the viewport centre sets `data-stage` on <html>, which recolours the floor's
 *   horizon glow (stage 05 turns from red to green once the incident has "recovered");
 * - a key crossing the middle of the viewport presses itself for 900ms.
 *
 * Under reduced motion the keys stay pressed (the stylesheet does that too) and the incident glow
 * is green from the start.
 */

// A module, not a global script: keeps these names out of the page's global scope.
export {};

const html = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── Nav ─────────────────────────────────────────────────────────────────────────────────────── */

const nav = document.querySelector<HTMLElement>('[data-ky-nav]');

/* ── Windows ─────────────────────────────────────────────────────────────────────────────────── */

// The entrance is scroll-driven (`animation-timeline: view()`, range `entry 0%` to `entry 60%`).
// Once 60% of a window has entered, the animation has reached its final, flat frame; marking the
// window settled there removes the animation without a visible change, and the window then stays
// flat for good instead of tilting back down whenever it leaves and re-enters the viewport. The
// wrapper is measured rather than the window itself because the wrapper never transforms.
const unsettled = new Set(document.querySelectorAll<HTMLElement>('.ky-stage__screen'));
const settleWindows = () => {
  if (unsettled.size === 0) return;
  const viewportBottom = window.innerHeight;
  for (const screen of unsettled) {
    const rect = screen.getBoundingClientRect();
    if (rect.top + rect.height * 0.6 > viewportBottom) continue;
    screen.querySelector('.ky-stage__window')?.classList.add('is-in');
    unsettled.delete(screen);
  }
};

let frame = 0;
const applyScroll = () => {
  frame = 0;
  nav?.classList.toggle('is-scrolled', window.scrollY > 40);
  settleWindows();
};
const scheduleScroll = () => {
  if (!frame) frame = window.requestAnimationFrame(applyScroll);
};
window.addEventListener('scroll', scheduleScroll, { passive: true });
window.addEventListener('resize', scheduleScroll);
applyScroll();

/* ── Stage glow ──────────────────────────────────────────────────────────────────────────────── */

let recoverTimer = 0;
const setStage = (value: string) => {
  if (html.dataset.stage === value) return;
  html.dataset.stage = value;
  window.clearTimeout(recoverTimer);
  html.classList.remove('is-recovered');
  if (value === '05') {
    if (reduceMotion.matches) html.classList.add('is-recovered');
    else recoverTimer = window.setTimeout(() => html.classList.add('is-recovered'), 1800);
  }
};

const stages = document.querySelectorAll<HTMLElement>('[data-ky-stage]');
if (typeof IntersectionObserver !== 'undefined') {
  const centre = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setStage((entry.target as HTMLElement).dataset.kyStage ?? 'hero');
      }
    },
    { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
  );
  stages.forEach((stage) => centre.observe(stage));
}

/* ── Keys ────────────────────────────────────────────────────────────────────────────────────── */

const keys = document.querySelectorAll<HTMLElement>('[data-ky-key]');
if (reduceMotion.matches || typeof IntersectionObserver === 'undefined') {
  keys.forEach((key) => key.classList.add('is-pressed'));
} else {
  const timers = new WeakMap<Element, number>();
  const band = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const key = entry.target as HTMLElement;
        key.classList.add('is-pressed');
        window.clearTimeout(timers.get(key));
        timers.set(
          key,
          window.setTimeout(() => key.classList.remove('is-pressed'), 900)
        );
      }
    },
    { rootMargin: '-32% 0px -32% 0px', threshold: 0 }
  );
  keys.forEach((key) => band.observe(key));
}

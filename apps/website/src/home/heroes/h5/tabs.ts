/**
 * The tape tabs above the hero window. The page is rendered with the first screen open, so the hero reads without
 * this script. A link to a tab (for example `#h5-tab-costs`) opens its screen.
 */
const strip = document.querySelector<HTMLElement>('[data-h5-tabs]');
const screenFor = (tab: HTMLButtonElement) => document.getElementById(tab.getAttribute('aria-controls') ?? '');

if (strip) {
  const tabs = Array.from(strip.querySelectorAll<HTMLButtonElement>('button[role="tab"]'));

  const choose = (chosen: HTMLButtonElement) => {
    for (const tab of tabs) {
      const on = tab === chosen;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      const screen = screenFor(tab);
      if (screen) screen.hidden = !on;
    }
  };

  const fromHash = tabs.find((tab) => `#${tab.id}` === location.hash);
  if (fromHash) choose(fromHash);

  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      choose(tab);
      history.replaceState(null, '', `#${tab.id}`);
    });
  }

  /** Arrow keys, Home and End move between tabs and open the screen, as in any tab list. */
  strip.addEventListener('keydown', (event) => {
    const current = tabs.findIndex((tab) => tab === document.activeElement);
    if (current === -1) return;
    const last = tabs.length - 1;
    const step = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const next = tabs[step > last ? 0 : step < 0 ? last : step];
    choose(next);
    next.focus();
  });
}

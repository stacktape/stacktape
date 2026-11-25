/**
 * Tape tabs in structure a. A `[data-sa-tabs]` root holds `role="tab"` buttons with `data-tab`, and elements with
 * `data-panel` for each tab. The selected tab's panels get `data-active="true"`; the page's CSS decides how the
 * others hide. The server renders the default selection, so the page reads without this script.
 */
for (const root of document.querySelectorAll<HTMLElement>('[data-sa-tabs]')) {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const select = (tab: HTMLButtonElement) => {
    for (const other of tabs) {
      other.setAttribute('aria-selected', String(other === tab));
      other.tabIndex = other === tab ? 0 : -1;
    }
    for (const panel of root.querySelectorAll<HTMLElement>('[data-panel]')) {
      panel.dataset.active = String(panel.dataset.panel === tab.dataset.tab);
    }
  };
  const linked = tabs.find((tab) => `#${tab.id}` === window.location.hash);
  if (linked) select(linked);
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => {
      select(tab);
      history.replaceState(null, '', `#${tab.id}`);
    });
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (!step) return;
      const next = tabs[(index + step + tabs.length) % tabs.length];
      next.focus();
      next.click();
    });
  }
}

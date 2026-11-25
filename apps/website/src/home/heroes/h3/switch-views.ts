/**
 * Switches the hero window between Console screens. The server renders the first screen, so the hero reads
 * without this script. A link to a tab's id (for example `#see-costs`) opens that screen.
 */
const stage = document.querySelector<HTMLElement>('[data-h3-views]');

if (stage) {
  const tabs = [...stage.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const screens = [...stage.querySelectorAll<HTMLElement>('[role="tabpanel"]')];

  const open = (tab: HTMLButtonElement, focus: boolean) => {
    tabs.forEach((each) => {
      const chosen = each === tab;
      each.ariaSelected = String(chosen);
      each.tabIndex = chosen ? 0 : -1;
    });
    screens.forEach((screen) => {
      screen.hidden = screen.id !== tab.getAttribute('aria-controls');
    });
    if (focus) tab.focus();
  };

  const linked = tabs.find((tab) => location.hash === `#${tab.id}`);
  if (linked) open(linked, false);

  stage.addEventListener('click', (event) => {
    const tab = (event.target as Element).closest<HTMLButtonElement>('[role="tab"]');
    if (!tab) return;
    open(tab, false);
    history.replaceState(null, '', `#${tab.id}`);
  });

  stage.addEventListener('keydown', (event) => {
    const at = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (at < 0) return;
    const moves: Record<string, number> = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: tabs.length - 1 };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    open(tabs[(target + tabs.length) % tabs.length], true);
  });
}

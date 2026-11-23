import { atom } from 'nanostores';

// Shared across islands (Header hamburger, mobile nav drawer). nanostores is the Astro-blessed
// cross-island store — a single module-level atom every island subscribes to.
export const $mobileNavOpen = atom(false);

export const toggleMobileNav = (open?: boolean) => {
  $mobileNavOpen.set(open === undefined ? !$mobileNavOpen.get() : open);
};

// Mirror the drawer state onto <html> so the layout's CSS can hide the main column, take the page under the drawer
// out of the tab order while it is open, and close the drawer after a view transition or when the window grows past
// the phone layout (the drawer is hidden there). Wired here at module scope rather than in a React effect for the
// same reason the sidebar wires its scroll listeners that way: the navigation islands use `transition:persist`, and
// Astro freezes a persisted island's effects during the swap.
// Everything under the drawer is inert while it is open: the article, and every other element directly under <body>
// except the header and the drawer's own column. That covers elements other components append to <body>, such as the
// code blocks' type popups, which would otherwise take keyboard focus behind the drawer.
const madeInert = new Set<Element>();
const coveredByDrawer = () => {
  const covered = [...document.querySelectorAll('.docs-skip-link, #main-content')];
  for (const child of document.body.children) {
    if (child.tagName === 'SCRIPT' || child.querySelector('#docs-drawer, #docs-nav-toggle')) continue;
    covered.push(child);
  }
  return covered;
};

if (typeof document !== 'undefined') {
  $mobileNavOpen.subscribe((open) => {
    document.documentElement.toggleAttribute('data-mobile-nav-open', open);
    if (open) {
      for (const element of coveredByDrawer()) {
        if (element.hasAttribute('inert')) continue;
        element.setAttribute('inert', '');
        madeInert.add(element);
      }
    } else {
      for (const element of madeInert) element.removeAttribute('inert');
      madeInert.clear();
    }
  });
  document.addEventListener('astro:after-swap', () => $mobileNavOpen.set(false));
  window.matchMedia('(min-width: 800px)').addEventListener('change', (query) => {
    if (query.matches) $mobileNavOpen.set(false);
  });
}

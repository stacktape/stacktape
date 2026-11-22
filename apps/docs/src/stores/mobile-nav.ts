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
if (typeof document !== 'undefined') {
  $mobileNavOpen.subscribe((open) => {
    document.documentElement.toggleAttribute('data-mobile-nav-open', open);
    for (const covered of document.querySelectorAll('.docs-skip-link, #main-content')) {
      covered.toggleAttribute('inert', open);
    }
  });
  document.addEventListener('astro:after-swap', () => $mobileNavOpen.set(false));
  window.matchMedia('(min-width: 800px)').addEventListener('change', (query) => {
    if (query.matches) $mobileNavOpen.set(false);
  });
}

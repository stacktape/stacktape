import { atom } from 'nanostores';

// Shared across islands (Header hamburger, mobile nav drawer). nanostores is the Astro-blessed
// cross-island store — a single module-level atom every island subscribes to.
export const $mobileNavOpen = atom(false);

export const toggleMobileNav = (open?: boolean) => {
  $mobileNavOpen.set(open === undefined ? !$mobileNavOpen.get() : open);
};

// Mirror the drawer state onto <html> so the layout's CSS can hide the main column, and close the
// drawer after a view transition. Wired here at module scope rather than in a React effect for the
// same reason the sidebar wires its scroll listeners that way: the navigation islands use
// `transition:persist`, and Astro freezes a persisted island's effects during the swap.
if (typeof document !== 'undefined') {
  $mobileNavOpen.subscribe((open) => document.documentElement.toggleAttribute('data-mobile-nav-open', open));
  document.addEventListener('astro:after-swap', () => $mobileNavOpen.set(false));
}

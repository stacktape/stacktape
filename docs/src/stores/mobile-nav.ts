import { atom } from 'nanostores';

// Shared across islands (Header hamburger, mobile nav drawer, layout main toggle). nanostores is
// the Astro-blessed cross-island store — a single module-level atom every island subscribes to.
export const $mobileNavOpen = atom(false);

export const toggleMobileNav = (open?: boolean) => {
  $mobileNavOpen.set(open === undefined ? !$mobileNavOpen.get() : open);
};

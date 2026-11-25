/**
 * "Get started" links (`#install`) land on the setup card. Without this script the browser jumps to the card. With it:
 * when the card is already fully in view, only the focus moves, to the selected installer tab; on a computer, where the
 * card sits beside the headline, the page scrolls to the hero so the headline stays in view; on a phone, where the
 * card follows the words, the page scrolls to the card.
 */
const card = document.getElementById('install');
const hero = card?.closest('section.h5');

const focusInstaller = () =>
  card?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true });

const inView = (element: Element) => {
  const box = element.getBoundingClientRect();
  const top = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  return box.top >= top && box.bottom <= window.innerHeight;
};

if (card && hero) {
  const besideHeadline = window.matchMedia('(min-width: 64.0625rem)');
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest<HTMLAnchorElement>('a[href$="#install"]');
    if (!link || new URL(link.href).pathname !== location.pathname) return;
    event.preventDefault();
    if (!inView(card)) (besideHeadline.matches ? hero : card).scrollIntoView({ block: 'start' });
    history.replaceState(null, '', '#install');
    focusInstaller();
  });
}

import { openSearch } from './open-search';

/** The 404 search field: prefilled with the words of the missing URL, and it opens the search dialog with them. */
const setUp = () => {
  const form = document.querySelector<HTMLFormElement>('[data-docs-404-search]');
  const input = form?.querySelector<HTMLInputElement>('input[name="q"]');
  if (!form || !input || form.dataset.ready) return;
  form.dataset.ready = '';
  const missing = window.location.pathname.split('/').findLast(Boolean) ?? '';
  if (!input.value)
    input.value = decodeURIComponent(missing)
      .replace(/\.html?$/, '')
      .replace(/[-_]+/g, ' ')
      .trim();
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    openSearch(input.value.trim());
  });
};

setUp();
document.addEventListener('astro:page-load', setUp);

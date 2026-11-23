import { openSearch } from '@/components/Search/open-search';

/** The filter of `<Directory>` (Directory.astro): hides rows that do not match and the sections left empty. */
const normalize = (value: string | null) => (value ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

const ITEMS = 'li.docs-dir-row, tbody tr';

const setUp = (root: HTMLElement) => {
  const input = root.querySelector<HTMLInputElement>('[data-directory-filter]');
  const body = root.querySelector<HTMLElement>('[data-directory-body]');
  const empty = root.querySelector<HTMLElement>('[data-directory-empty]');
  const count = root.querySelector<HTMLElement>('[data-directory-count]');
  if (!input || input.closest('[hidden]') || !body || root.dataset.directoryReady) return;
  root.dataset.directoryReady = '';

  const itemSelector = root.dataset.directoryItems ?? ITEMS;
  const items = [...body.querySelectorAll<HTMLElement>(itemSelector)];
  // An item may name what it is found by (a flag's name, alias and first sentence); otherwise its whole text.
  const searchable = new Map(items.map((item) => [item, normalize(item.dataset.directoryKey ?? item.textContent)]));
  const blocks = [...body.children] as HTMLElement[];

  const apply = () => {
    const words = normalize(input.value).split(' ').filter(Boolean);
    const filtering = words.length > 0;
    for (const item of items) item.hidden = filtering && !words.every((word) => searchable.get(item)!.includes(word));

    // A block shows while it has a matching row; prose between the rows steps aside while filtering.
    const shown = new Map<HTMLElement, boolean>();
    for (const block of blocks) {
      if (/^H[2-4]$/.test(block.tagName)) continue;
      const rows = block.matches(itemSelector) ? [block] : [...block.querySelectorAll<HTMLElement>(itemSelector)];
      shown.set(block, !filtering || rows.some((row) => !row.hidden));
    }
    // A heading shows while any block in its section (up to the next heading of its level or above) shows.
    blocks.forEach((block, index) => {
      if (!/^H[2-4]$/.test(block.tagName)) return;
      const level = Number(block.tagName[1]);
      let visible = !filtering;
      for (const next of blocks.slice(index + 1)) {
        if (/^H[2-4]$/.test(next.tagName) && Number(next.tagName[1]) <= level) break;
        if (shown.get(next)) visible = true;
      }
      shown.set(block, visible);
    });
    for (const [block, visible] of shown) block.hidden = !visible;
    const matches = items.filter((item) => !item.hidden).length;
    if (empty) empty.hidden = !filtering || matches > 0;
    if (count) {
      count.hidden = !filtering || matches === 0;
      count.textContent = `${matches} ${matches === 1 ? 'match' : 'matches'}`;
    }
  };

  input.addEventListener('input', apply);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && input.value) {
      input.value = '';
      apply();
    } else if (event.key === 'Enter') {
      items
        .find((item) => !item.hidden)
        ?.querySelector<HTMLAnchorElement>('a[href]')
        ?.click();
    }
  });
  root.querySelector('[data-directory-search]')?.addEventListener('click', () => openSearch(input.value.trim()));
  // A value the browser restored on back navigation still filters.
  if (input.value) apply();
};

const setUpAll = () => document.querySelectorAll<HTMLElement>('[data-directory]').forEach(setUp);

/** Sets up every filter on the page now and after each client-side navigation. Safe to call more than once. */
export const setUpDirectoryFilters = () => {
  setUpAll();
  document.addEventListener('astro:page-load', setUpAll);
};

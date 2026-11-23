/** Opens the header's search dialog, optionally with a query already typed. Used by the 404 page and lookup lists. */
export const OPEN_SEARCH_EVENT = 'docs:open-search';

export type OpenSearchDetail = { query?: string };

export const openSearch = (query?: string) =>
  document.dispatchEvent(new CustomEvent<OpenSearchDetail>(OPEN_SEARCH_EVENT, { detail: { query } }));

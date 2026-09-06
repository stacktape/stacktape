/*
 * The one message the desk's islands and the page script exchange.
 *
 * Types only plus a constant: safe to import from React islands and from `.astro` page scripts.
 */
export const DESK_CHANGE_EVENT = 'stp-desk:change';

export type DeskLanguage = 'yaml' | 'typescript';

export type DeskChangeDetail = {
  project: string;
  language: DeskLanguage;
};

export const dispatchDeskChange = (detail: DeskChangeDetail): void => {
  document.dispatchEvent(new CustomEvent<DeskChangeDetail>(DESK_CHANGE_EVENT, { detail }));
};

import type { DocSearchHit, DocSearchTransformClient } from '@docsearch/react';
import * as docSearchNs from '@docsearch/react';
import { navigate } from 'astro:transitions/client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import config from '@/site-config';
import { isV3Path } from '@/utils/v3-archive-routes';
import { OPEN_SEARCH_EVENT, type OpenSearchDetail } from './open-search';
import { searchContextFor } from './search-context';

// The package points ESM builds at its named exports but SSR at a UMD/CJS entry. Read them reflectively so Vite does
// not warn about a statically impossible ESM `.default` access.
const defaultExport = Reflect.get(docSearchNs, 'default') as typeof docSearchNs | undefined;
const pick = <K extends 'DocSearchButton' | 'DocSearchModal' | 'useDocSearchKeyboardEvents'>(name: K) =>
  (Reflect.get(docSearchNs, name) ?? defaultExport?.[name]) as (typeof docSearchNs)[K];
const DocSearchButton = pick('DocSearchButton');
const DocSearchModal = pick('DocSearchModal');
const useDocSearchKeyboardEvents = pick('useDocSearchKeyboardEvents');

/**
 * Each result is grouped by what kind of page it is and where it sits ("Commands", "Guides · Observability"), and
 * links to this host. The page type comes from the URL, so the grouping is right whatever the crawler recorded as
 * the top level. The v3 archive is noindex; any of its pages the crawler indexed anyway are dropped.
 */
/** Algolia's highlight data for a hit. DocSearch titles a result group with its `hierarchy.lvl0`. */
const HIGHLIGHT = '_highlightResult';

const withPageContext = (hits: DocSearchHit[]): DocSearchHit[] => {
  const kept = hits.filter((hit) => !isV3Path(new URL(hit.url, config.metadata.url).pathname));
  for (const hit of kept) {
    const url = new URL(hit.url, config.metadata.url);
    const { group } = searchContextFor(url.pathname);
    hit.url = `${url.pathname}${url.hash}`;
    hit.url_without_anchor = url.pathname;
    hit.hierarchy.lvl0 = group;
    const lvl0 = hit[HIGHLIGHT]?.hierarchy?.lvl0;
    if (lvl0) Object.assign(lvl0, { value: group, matchedWords: [] });
  }
  return kept;
};

const transformSearchClient = (client: DocSearchTransformClient): DocSearchTransformClient => ({
  ...client,
  search: (async (...args: Parameters<DocSearchTransformClient['search']>) => {
    const response = await client.search(...args);
    for (const result of response.results) {
      if ('hits' in result)
        result.hits = withPageContext(result.hits as unknown as DocSearchHit[]) as typeof result.hits;
    }
    return response;
  }) as DocSearchTransformClient['search']
});

const translations = {
  button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
  modal: {
    startScreen: {
      noRecentSearchesText:
        'Search guides, resources, CLI commands and the Console. Try deploy, Redis or custom domain.'
    }
  }
};

/**
 * Algolia DocSearch, assembled from its parts so other pages can open it with a query (`openSearch` in
 * `open-search.ts`). Credentials come from `site-config.ts`. `insights` stays off: enabling it makes DocSearch fetch
 * `search-insights` from jsDelivr at runtime, which this site does not do. The `.DocSearch-*` theme lives in
 * `src/styles/search.css`.
 */
export function DocSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState<string | undefined>();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => {
    setIsOpen(false);
    setInitialQuery(undefined);
  }, []);
  // Typing while the search button has focus opens the dialog with that character.
  const onInput = useCallback((event: KeyboardEvent) => {
    setIsOpen(true);
    setInitialQuery(event.key);
  }, []);
  useDocSearchKeyboardEvents({ isOpen, onOpen, onClose, onInput, searchButtonRef: buttonRef });

  useEffect(() => {
    const open = (event: Event) => {
      setInitialQuery((event as CustomEvent<OpenSearchDetail>).detail?.query || undefined);
      setIsOpen(true);
    };
    document.addEventListener(OPEN_SEARCH_EVENT, open);
    return () => document.removeEventListener(OPEN_SEARCH_EVENT, open);
  }, []);

  return (
    <>
      <DocSearchButton ref={buttonRef} onClick={onOpen} translations={translations.button} />
      {isOpen &&
        createPortal(
          <DocSearchModal
            appId={config.algolia.appId}
            indexName={config.algolia.indexName}
            apiKey={config.algolia.apiKey}
            insights={false}
            placeholder="Search the docs"
            initialScrollY={window.scrollY}
            initialQuery={initialQuery}
            onClose={onClose}
            maxResultsPerGroup={6}
            transformSearchClient={transformSearchClient}
            navigator={{
              navigate: ({ itemUrl }) => void navigate(itemUrl),
              navigateNewTab: ({ itemUrl }) => window.open(itemUrl, '_blank', 'noopener'),
              navigateNewWindow: ({ itemUrl }) => window.open(itemUrl, '_blank', 'noopener')
            }}
            translations={translations.modal}
          />,
          document.body
        )}
    </>
  );
}

import type { DocSearchProps } from '@docsearch/react';
import * as docSearchNs from '@docsearch/react';

// @docsearch/react v3 resolves as ESM in the client build but CJS during SSR/prerender. A namespace
// import + fallback chain picks the component in every interop shape (named, cjs-lexer, default).
const DocSearchComponent: typeof import('@docsearch/react').DocSearch =
  (docSearchNs as any).DocSearch ?? (docSearchNs as any).default?.DocSearch ?? (docSearchNs as any).default;
import config from '../../../config';

// The DocSearch theme overrides (the `.DocSearch-*` selectors + `:root` custom properties) now live
// as plain global CSS in src/styles/global.css, since they target Algolia's own DOM.
export function DocSearch(props: Partial<DocSearchProps>) {
  return (
    <DocSearchComponent
      appId={config.algolia.appId}
      indexName={config.algolia.indexName}
      apiKey={config.algolia.apiKey}
      {...props}
    />
  );
}

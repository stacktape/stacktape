import type { DocSearchProps } from '@docsearch/react';
import * as docSearchNs from '@docsearch/react';
import config from '@/site-config';

// The package points ESM builds at its named export but SSR at a UMD/CJS entry. Read the default
// export reflectively so Vite does not warn about a statically impossible ESM `.default` access.
const defaultExport = Reflect.get(docSearchNs, 'default');
const DocSearchComponent: typeof import('@docsearch/react').DocSearch =
  Reflect.get(docSearchNs, 'DocSearch') ?? defaultExport?.DocSearch ?? defaultExport;

/**
 * Props a caller may set. Credentials come from `site-config.ts`, and `insights` is not a caller's
 * choice — enabling it makes DocSearch fetch `search-insights` from jsDelivr at runtime, which this
 * site does not do. Excluding them from the type and overriding them after the spread means neither
 * a new call site nor a typo can turn either back on.
 */
export type DocSearchOwnProps = Omit<Partial<DocSearchProps>, 'appId' | 'apiKey' | 'indexName' | 'insights'>;

/**
 * Algolia DocSearch. The `.DocSearch-*` theme overrides live as plain global CSS in
 * `src/styles/global.css`, since they target Algolia's own DOM.
 *
 * `search-insights` stays in the manifest only because DocSearch declares it as a strict peer.
 */
export function DocSearch(props: DocSearchOwnProps) {
  return (
    <DocSearchComponent
      {...props}
      appId={config.algolia.appId}
      indexName={config.algolia.indexName}
      apiKey={config.algolia.apiKey}
      insights={false}
    />
  );
}

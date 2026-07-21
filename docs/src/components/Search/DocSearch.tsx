import type { DocSearchProps } from '@docsearch/react';
import * as docSearchNs from '@docsearch/react';

// The package points ESM builds at its named export but SSR at a UMD/CJS entry. Read the default
// export reflectively so Vite does not warn about a statically impossible ESM `.default` access.
const defaultExport = Reflect.get(docSearchNs, 'default');
const DocSearchComponent: typeof import('@docsearch/react').DocSearch =
  (docSearchNs as any).DocSearch ?? defaultExport?.DocSearch ?? defaultExport;
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

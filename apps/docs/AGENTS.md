# Documentation site

This is the static Astro site at `docs.stacktape.com`. It has no runtime dependency on Console or CLI code.

## Canonical content

`content/**/*.mdx` is product documentation and also feeds the CLI's shipped MCP/LLM corpus. Preserve authored
formatting: content is excluded from `bun fmt` because code-example whitespace can be meaningful.

Change canonical MDX or resource data, then run the CLI generator. Never patch `apps/cli/@generated/llm-docs` directly.
`aws:call` documentation must match the exact allowlist in `packages/aws-read-only/src/operations.ts`.

## v3 archive

`archive/v3/` holds the frozen Stacktape 3.7.1 documentation, served under `/v3/` and kept out of search, the sitemap
and the LLM corpus. It is owned content, not generated output; read `archive/v3/README.md` before touching it. Do not
move it into `content/`.

## Routes and generated inputs

`src/pages/[...slug].astro` renders the content collection. `src/utils/route-slugs.ts` owns file-to-URL mapping and
`tests/expected-routes.txt` is the reviewed public URL contract. Update the manifest deliberately when a route changes.
When a change renames or removes a heading that readers may have bookmarked or found in search, map the old fragment to
its new section in `src/utils/moved-sections.ts`.

Turbo materializes the current checkout's CLI-generated inputs before docs tasks run:

- resource and CLI-command reference data and LLM text from CLI `generate`;
- Monaco/Twoslash declarations from `generate:monaco`;
- starter metadata from CLI `generate`;
- the config schema exported by `@stacktape/config`.

Missing inputs must fail with the producing command. Do not fall back to a CDN or published package. The docs site reads
finished API-reference data; it does not own another schema extractor. YAML/TypeScript examples use
`@stacktape/config-authoring/converter` rather than a copied conversion table.

`CliCommandsApiReference` takes only a command name. Its options come from the current generated command metadata, which
also supplies the CLI's LLM corpus; do not embed option snapshots in MDX.

The rendered Twoslash component hides diagnostics from readers, so the build checks complete rendered config examples
against the served Stacktape declarations and Node types. `tests/twoslash-types.test.ts` also checks the browser
type-loading contract. IntelliSense blocks are complete config examples by default. Mark contextual snippets with
`configExample="fragment"` and complete config blocks without IntelliSense with `configExample="complete"`. The build
selects examples from this metadata rather than requiring valid source syntax. The served LLM text must remain
byte-identical to the CLI corpus.

## UI and assets

Shared values come from `@stacktape/design-tokens`; shared controls come from `@stacktape/ui-react`. Site-specific
typography, spacing and layout stay here. Keep the cascade-layer declaration first in `global.css` so Tailwind utilities
can override shared component styles.

`public` is committed app-owned static content. Generated assets go to `dist` during build; builds must not rewrite
`public`.

## Search

Algolia DocSearch serves search from the index the Algolia crawler builds from the live site (app `PFTWPISD3F`, index
`Docs crawler`); its configuration lives in the Algolia dashboard. Every v4 page carries `docsearch:lvl0` (the result
group, such as `Guides · Observability` or `Commands`) and `docsearch:type` (`Guide`, `Resource`, `Command` or
`Console`) meta tags from `src/components/Search/search-context.ts`. The crawler's record extractor reads them and takes
headings and text only from the article (`.docs-page-title`, `.mdx-content`), never from the header, sidebar, outline or
footer. The search dialog derives the same groups from each result's URL, so a stale index still groups correctly.
Recrawl from the dashboard after pages move.

## Publishing

`stacktape.ts` deploys the site: `pnpm deploy:docs:preview` publishes `https://preview-docs.stacktape.com`, and
`pnpm deploy:docs` publishes production. Redirects live in `src/utils/site-redirects.ts`; Astro renders them as
meta-refresh pages, and the CDN answers them with a 301 through a CloudFront Function that reads the table from a
CloudFront KeyValueStore. An `afterDeploy` hook writes the table after the upload (`src/build/cdn-redirects.ts`,
`src/build/redirect-store-sync.ts`, `scripts/write-redirect-store.ts`, `tests/cdn-redirects.test.ts`). The procedure,
verification and rollback are in [releasing](../../docs/releasing.md#documentation-site).

## Checks

```sh
pnpm --filter @stacktape/docs run typecheck
pnpm --filter @stacktape/docs run test
pnpm --filter @stacktape/docs run build
```

The build validates routes, metadata, canonical URLs, links, fragments, local assets, accessibility basics, sitemap,
robots policy and LLM-corpus identity. After content changes, also run the CLI's `generate` and `test:llm-docs` tasks.

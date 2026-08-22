# Documentation site

This is the static Astro site at `docs.stacktape.com`. It has no runtime dependency on Console or CLI code.

## Canonical content

`content/**/*.mdx` is product documentation and also feeds the CLI's shipped MCP/LLM corpus. Preserve authored
formatting: content is excluded from oxfmt because code-example whitespace can be meaningful.

Change canonical MDX or resource data, then run the CLI generator. Never patch `apps/cli/@generated/llm-docs` directly.
`aws:call` documentation must match the exact allowlist in
`apps/cli/src/domain/debug-services/aws-read-only-operations.ts`.

## Routes and generated inputs

`src/pages/[...slug].astro` renders the content collection. `src/utils/route-slugs.ts` owns file-to-URL mapping and
`tests/expected-routes.txt` is the reviewed public URL contract. Update the manifest deliberately when a route changes.

Turbo materializes the current checkout's CLI-generated inputs before docs tasks run:

- API reference data and LLM text from CLI `generate`;
- Monaco/Twoslash declarations from `generate:monaco`;
- starter metadata from CLI `generate`;
- the config schema exported by `@stacktape/config`.

Missing inputs must fail with the producing command. Do not fall back to a CDN or published package. The docs site reads
finished API-reference data; it does not own another schema extractor. YAML/TypeScript examples use
`@stacktape/config-authoring/converter` rather than a copied conversion table.

The rendered Twoslash component hides diagnostics from readers, so `tests/twoslash-types.test.ts` is the actual type
correctness gate. The served LLM text must remain byte-identical to the CLI corpus.

## UI and assets

Shared values come from `@stacktape/design-tokens`; shared controls come from `@stacktape/ui-react`. Site-specific
typography, spacing and layout stay here. Keep the cascade-layer declaration first in `global.css` so Tailwind utilities
can override shared component styles.

`public` is committed app-owned static content. Generated assets go to `dist` during build; builds must not rewrite
`public`.

## Checks

```sh
pnpm --filter @stacktape/docs run typecheck
pnpm --filter @stacktape/docs run test
pnpm --filter @stacktape/docs run build
```

The build validates routes, metadata, canonical URLs, links, fragments, local assets, accessibility basics, sitemap,
robots policy and LLM-corpus identity. After content changes, also run the CLI's `generate` and `test:llm-docs` tasks.

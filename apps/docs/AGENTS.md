# Stacktape documentation

The public Astro documentation site: `https://docs.stacktape.com`. Static output, no server, no
runtime dependency on `apps/console`.

## Canonical documentation data

- `content/**/*.mdx` contains the 194 canonical narrative/reference pages migrated from v3.
- `.resources.json` contains the resource metadata used to render referenceable parameters.
- These files are also inputs to the CLI's shipped LLM documentation corpus.
- `content/**` is intentionally excluded from Oxfmt. MDX pages contain template-string code examples
  whose whitespace is meaningful, and the formatter can rewrite that embedded source. Preserve
  authored formatting and make deliberate edits only.

The CLI owns the single LLM-docs generator because it is the only code consumer. It reads this
application as data; `apps/docs` does not import CLI implementation. Do not edit
`apps/cli/@generated/llm-docs` directly or create a page-specific patcher. Update the canonical
MDX/resource data and run the ordinary Turbo generation path.

`aws:call` documentation must match the runtime allowlist in
`apps/cli/src/domain/debug-services/aws-read-only-operations.ts`: exact service/operation pairs,
required deployed stack, debug-role preference with caller-credential fallback, and stack defaults as
the only reason project/stage may be omitted.

## Routes and MDX components

`src/pages/[...slug].astro` renders every collection entry; `src/utils/route-slugs.ts` owns the
file → URL mapping and is shared with the validator and the tests so all three agree.

`tests/expected-routes.txt` is the compatibility baseline: the reviewed, sorted list of every public
URL. Derivation and the built-site validator prove the build matches the corpus; only that manifest
says which URLs customers were promised. Renaming, adding, or removing a page fails
`tests/routes.test.ts` until the manifest is updated in the same change — which is the point.

`src/components/mdx-react-components.tsx` maps the static components; the page adds the `.astro`
island wrappers for the interactive ones (`CodeBlock`, `Tabs`, `ApiReference`,
`StarterProjectGallery`). MDX already fails the build on a component it cannot resolve;
`tests/mdx-components.test.ts` additionally asserts the opposite direction, so a registration the
corpus stopped using does not linger. Add a component only together with the content that uses it.

## Generated inputs and the no-network invariant

`src/build/cli-generated-inputs.ts` names every artifact this application consumes from `apps/cli`.
Turbo supplies them: see the `@stacktape/docs#build`, `#typecheck`, and `#dev` entries in the root
`turbo.json`. A missing artifact fails the build with the exact command to run — it never falls back
to a published package or a CDN.

| Input                                                 | Produced by         | Used for                                          |
| ----------------------------------------------------- | ------------------- | ------------------------------------------------- |
| `apps/cli/@generated/schemas/api-reference-data.json` | `generate:llm-docs` | The `<ApiReference />` dataset                    |
| `apps/cli/@generated/llm-docs/llms*.txt`              | `generate:llm-docs` | Served verbatim at the site root                  |
| `apps/cli/generated/monaco-declarations/*.d.ts`       | `generate:monaco`   | In-browser Twoslash types, served at `/stacktape` |
| `apps/cli/starter-projects-metadata.json`             | `generate`          | The starter-project gallery                       |
| `@stacktape/config/config-schema.json`                | CLI `generate`      | YAML hover descriptions in code blocks            |

Three invariants follow, and all three are enforced:

- **Documented types are this checkout's types.** Code samples type-check against the declarations
  `generate:monaco` produces and the workspace's own TypeScript standard library, both copied into the
  output by `src/build/generated-runtime-assets.ts`. There is no automatic type acquisition and no
  jsDelivr/playground fallback, so a sample can never silently describe a released npm version.
  Production renders Twoslash with `noErrorValidation: true` so a reader never sees a red block —
  that suppression is cosmetic and proves nothing, so `tests/twoslash-types.test.ts` re-runs the same
  loader with validation ON. Treat that test, not the site, as the evidence that imports resolve.
- **The served LLM corpus equals the shipped one.** `llms.txt`, `llms-full.txt`, and
  `llms-api-reference.txt` are copied byte-for-byte, and the validator compares them against their
  source. Do not transform them on the way out.
- **The API reference is data, not an algorithm this app owns.** `apps/cli`'s `generate:llm-docs`
  performs the schema normalization and emits the finished result; the same data is what it renders
  into the corpus. This app has DTOs (`src/utils/api-reference-dto.ts`) and a reader
  (`src/build/api-reference-data.ts`), and nothing else. It previously carried its own copy of the
  extractor, which drifted — it stopped decoding HTML entities and shipped `&#39;` to readers. Do not
  reintroduce `enhance-config-schema`, `generate-api-reference`, or `generate-llm-docs` here.
  `src/utils/api-reference-text.ts` decodes at the presentation boundary as a second line of defence.

## Styling

The Tailwind theme, `stp-*` component classes, and every palette value in `src/styles/` belong to
this site. The single exception is the brand colour: `packages/design-tokens` owns
`--stp-color-brand` and its typed twin, because the marketing site has to render the same green.
`global.css` imports the generated token CSS and aliases `--color-brand` to it;
`src/styles/variables.ts` reads the same value for JS-side styles. Do not move the rest of the
palette, typography, or spacing into that package — one consumer's theme is not a shared token.

## Static assets

`public/` is the one app-owned static tree: favicons, `robots.txt`, the OpenGraph image, the starter
icons the metadata actually references, and the screenshots the corpus actually references. It is
committed as-is and never written to during a build. Everything generated goes to `dist/` through the
build hook instead.

## Checks

`scripts/validate-built-site.ts` is the gate on the built output, and `run build` runs it. It derives
the expected route set from `content/` rather than trusting the build, then checks per-page metadata,
JSON-LD, a single H1, indexability (the 404 is noindex with no canonical; every other page is the
reverse), the exact canonical URL for each output path, internal links, fragments, local assets,
image alt text, the sitemap, `robots.txt`, and the byte-identity of the LLM discovery corpus.
`run validate:site` re-runs it against an existing `dist/`.

Run `typecheck`, then `test` (routes, MDX components, API-reference data, Twoslash types), then
`build` (which ends by validating the built site):

```sh
pnpm --filter @stacktape/docs run typecheck && pnpm --filter @stacktape/docs run test
pnpm --filter @stacktape/docs run build
```

After changing canonical content, regenerate the CLI's corpus with
`pnpm exec turbo run generate:llm-docs --filter @stacktape/cli` and re-run
`pnpm --filter @stacktape/cli run test:llm-docs`.

## Deliberate differences from the v3 site

- The glossary tooltip (`<Jargon>` over markdown emphasis) is not ported. Its `jargon.yml` data was not
  part of the migrated corpus, and the tooltip needed client JS that the server-only component map
  never provided — it rendered a `?` marker that did nothing. Restoring it means adding the data file
  and hydrating the component, not just copying the old code.
- `<ConsoleScreenshot>` renders statically. Its only reason to hydrate was a placeholder for a missing
  capture, which the validator now turns into a build failure instead.
- Deployment, publishing, and live-upstream generation scripts were not imported.

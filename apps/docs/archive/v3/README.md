# Stacktape v3 documentation archive

The documentation of Stacktape 3.7.1, the last v3 release, served under `/v3/` with the current site's layout. It is
owned, frozen content: a one-time copy, not generated output. Do not edit the pages to describe v4, and do not
regenerate the data from current code.

## Source

Imported from tag `3.7.1` (commit `e37335d5046eddcdf7a71e09323629ab07ae256f`): the 94 pages in `docs/docs/`, which
the v3 site served. The `_new-docs/` and `_curated-docs/` drafts were never published and are not included.

| Path                               | From 3.7.1                                                            |
| ---------------------------------- | --------------------------------------------------------------------- |
| `content/**/*.mdx`                 | `docs/docs/**/*.mdx`                                                  |
| `data/property-tables.json`        | `@generated/schemas/enhanced-config-schema.json`, via v3's extractor  |
| `data/prop-descriptions.json`      | the same schema, as v3's `PropDescription` resolved it                |
| `data/referenceable-params.json`   | `docs/.resources.json`, descriptions rendered to HTML                 |
| `data/rds-engine-versions.json`    | `@generated/db-engine-versions/versions.json` (`rds`)                 |
| `data/jargon.json`                 | `docs/docs/jargon.yml`                                                |
| `data/resource-list.json`          | the cards of v3's `ResourceList`, derived from `docs/.resources.json` |
| `../../public/v3/static/**`        | the 46 screenshots the pages show, from `docs/docs/static/`           |

The page text is unchanged. The import made only these mechanical changes:

- Each `` `embed:<path>` `` line is replaced by a fenced code block with that file from `docs/code-snippets/`, as v3's
  remark plugin did at render time.
- Screenshot paths point to `/v3/static/`. PNG and JPEG screenshots were converted to WebP (quality 82), which
  reduced them from 16 MB to 3 MB.

## Rendering

`src/pages/v3/[...slug].astro` renders the `v3` content collection (`src/content.config.ts`) with the components in
`src/components/v3/`, which keep v3's component names and props. `src/utils/remark-v3-archive.ts` moves headings one
level down (the layout owns the only H1), converts v3's `{start-highlight}` code markers and keeps links inside the
archive. `src/utils/v3-archive.ts` and `src/utils/v3-archive-routes.ts` hold the link, redirect and v3 ↔ v4 page rules.

The archive is `noindex`, has no canonical link or structured data, and is excluded from the sitemap, search results
and the CLI's LLM corpus (which reads only `content/`). `scripts/validate-built-site.ts` checks these rules.

## Known differences from the published v3 site

- The published v3 site was built from a schema older than tag 3.7.1. Property tables here use the 3.7.1 schema, so
  some descriptions are shorter, and a few definitions the pages name had been renamed: the tables use the 3.7.1
  names (`UpstashProvider`, `LambdaDeploymentConfig`, `ContainerWorkloadNetworkLoadBalancerIntegration`,
  `SlackIntegration`, `MsTeamsIntegration`, `DynamoDbAttribute`). Where 3.7.1 had no long description for a
  `PropDescription`, the short one is shown.
- Tables for definitions 3.7.1 no longer has render nothing, as v3's component did: `ContainerLanguageSpecificConfig`
  (five container pages), `BudgetControl` and `BudgetNotification`, `TagFilter`, `CdnResponseHeader`.
- Links that were dead in v3 point to the v3 page on the same topic (see `V3_PATH_ALIASES`); `/starter-projects/`
  points to the current starter projects. In-page anchors that v3's own pages never had are kept; they are listed in
  `known-missing-anchors.txt`, and the site validator fails on any other missing anchor.
- v3's resource icons on the home page, jargon tooltips (now a native `title`) and its expandable-row animation use
  the current site's simpler equivalents.

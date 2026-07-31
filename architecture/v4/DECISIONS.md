# Stacktape v4 decision register

## Pinned product and repository decisions

| Area                   | Decision                                                                                                                                                                                                | Goal                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repository identity    | Keep `stacktape/stacktape` as the public GitHub repository and `stacktape/console-app` as the private repository. Build v4 on fresh/orphan histories and change default branches only after validation. | Clean history without losing repository URLs, issues, stars, release links, or npm trusted-publisher identity. |
| Privacy                | Use one private submodule at `apps/console`. It contains `api` and `ui`. The submodule URL and commit SHA do not need to be hidden.                                                                     | Only two applications remain private while all shared tooling stays public.                                    |
| Public clone           | The complete public workspace must install, generate, lint, typecheck, test, build, and pack with `apps/console` absent. Public CI never initializes it.                                                | Fork-safe contributor experience without private credentials.                                                  |
| Maintainer clone       | Maintainers initialize `apps/console` and run integrated checks from the public parent. Private CI clones a selected public ref and mounts itself at `apps/console`.                                    | One coherent workspace with explicit, pinned private source.                                                   |
| History                | Losing old file history is acceptable and preferred. Keep the existing repository identities; do not merge old website history.                                                                         | Simpler migration and clean baseline.                                                                          |
| Applications           | Public applications are CLI, docs, and a fresh Astro website. Private applications are Console API and Console UI. The helper Lambdas are neither: they are CLI-owned deployment artifacts (see below). | `apps` represents independently consumed or deployed surfaces.                                                 |
| SDK                    | Do not create or restore a Stacktape SDK.                                                                                                                                                               | Avoid maintaining a second public API without clear value.                                                     |
| Core                   | Superseded: do not create `packages/core`. The existing CLI implementation is the v4 runtime (see below).                                                                                               | The headless-runtime rewrite cost more concepts than any migrated behavior needed.                             |
| Package philosophy     | Create packages only for coherent, reusable capabilities. Do not create domain/infrastructure layers or generic dumping grounds merely to increase package count.                                       | Pleasant interfaces and understandable ownership.                                                              |
| Private apps placement | Mount the single private repository at `apps/console`, with `apps/console/api` and `apps/console/ui`. Do not use two submodules or public-clone symlinks.                                               | Every application remains under `apps` while preserving one atomic private boundary.                           |

### Helper Lambdas stay in `apps/cli`

Superseded: helper Lambdas were previously pinned as a workspace package. They remain at `apps/cli/helper-lambdas`.

They are separately built artifacts, but their source is not separable. Resolving every import from the four
entrypoints shows the four artifacts transitively reach 31 non-helper CLI modules (~9,000 lines), and 30 of those 31
have other CLI consumers — 1,809 distinct non-helper CLI files import at least one. The closure includes the 3,434-line
AWS SDK manager, the 1,418-line S3 sync engine and the 760-line `aws-resource-names` model. The runtime source is also
typed against the CLI's resolved configuration modules, which are separate from the authored configuration package
and remain owned by `apps/cli`.

A package therefore requires a package-to-app dependency, duplicated deployed implementation, an
`aws`/`naming`/`config` package cascade, or refactoring the runtimes to erase imports. Each costs more concepts than
co-location and misrepresents who owns the code, so co-location is the decision rather than a deferral.

Revisit when a separately justified slice has narrowed the closure to a small, helper-dominant set and removed the
dependency on CLI-owned resolved configuration contracts. `apps/cli/helper-lambdas/AGENTS.md` holds the measurement,
the rejected alternatives and the compatibility contract.

### No `packages/core` runtime extraction

Superseded: the runtime was previously pinned for extraction into a headless, port-driven `packages/core`, with
`config`, `command-contracts`, `aws`, and `naming` packages beneath it.

`SIMPLIFIED-MIGRATION.md` replaced that plan. The existing CLI implementation is the v4 starting point, and no
`OperationContext`, port layer, operation framework, parallel runtime, or compatibility shell is built for it. Code is
extracted into a package only when the package has a concrete present-day responsibility and consumer:
`@stacktape/packaging` owns the self-contained split/layer engine because it met that test, and
`apps/cli/helper-lambdas` stays in the CLI because it did not.

`TARGET-ARCHITECTURE.md`, `ORCHESTRATION-PLAN.md`, and `MIGRATION-RUNBOOK.md` describe the rejected plan and are
retained only as history.

## API and tRPC decisions

- tRPC remains the transport and type-safe client mechanism.
- Direct router inference is allowed inside the private repository between Console API and Console UI.
- Cross-boundary APIs use explicit public Zod input/output schemas and intentionally public DTOs.
- Public clients expose distinct typed surfaces for anonymous, API-key, AWS-identity, and any other external
  authentication modes.
- The private API imports public schemas and carries compile-time conformance checks.
- Public artifacts must not be generated from the complete private router and must not expose Prisma-inferred models,
  private procedure names, or database column shapes.
- The Console UI migrates to `@trpc/tanstack-react-query`.
- JSONL/machine output may be redesigned for v4. The v3 byte-level envelope is not a public compatibility constraint.
  The v4 format must be intentionally specified and tested for ordering, terminal results, redaction, cancellation,
  and error semantics.
- `projectName` is part of the authored configuration and `--projectName` overrides it. The obsolete top-level
  `serviceName` property and `recordStackOperation.serviceName` wire field are removed rather than carried as v4
  aliases.
- `package`, `synth`, and `validate` do not authenticate with the Stacktape Console. They use the standard local AWS
  credential chain: account identity is part of deterministic infrastructure naming, and synthesis/validation read
  the AWS metadata needed for an account-specific template. Deploy and organization/account-management commands keep
  their Console authorization boundary.

The validated [public proof of concept](https://github.com/matuscongrady/stacktape-monorepo-poc) at `6631d7d` and its
private Console submodule at `4d1b604` demonstrate this contract-first boundary on TypeScript 6 in both public-only
and integrated clones.

## Tooling decisions

| Tooling area       | Decision                                                                                                                                                                                                                                                                                       |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager    | pnpm for installation, workspaces, catalogs, and frozen lockfiles.                                                                                                                                                                                                                             |
| Lockfiles          | Use pnpm's non-shared workspace lockfile mode. Public root/packages and each optional private workspace keep reproducible lockfiles without requiring private packages to appear in a public root lockfile.                                                                                    |
| Runtime/test/build | Keep Bun where it is valuable. Do not require Bun as the package manager.                                                                                                                                                                                                                      |
| Task graph         | Turborepo with explicit task descriptions, inputs, outputs, and dependencies.                                                                                                                                                                                                                  |
| TypeScript         | TypeScript 6 is authoritative for workspace validation. The CLI retains TypeScript 5.9 as a runtime dependency for its compiler-API config/code-generation consumers; isolate those only when a concrete extraction is justified.                                                              |
| Lint               | Oxlint immediately; no long-lived ESLint compatibility layer. TypeScript 6 remains authoritative for type-aware checks until Oxlint's TS-Go semantics are an intentional choice.                                                                                                               |
| Format             | Oxfmt for repository sources and dprint `markup_fmt` for `.astro`. Prettier remains a CLI runtime dependency used only to format emitted npm declaration artifacts.                                                                                                                            |
| Vite+              | Do not adopt it.                                                                                                                                                                                                                                                                               |
| AI guardrails      | Use TypeScript, Oxlint, package exports, dependency-cruiser, Knip, Sherif, publint, a narrow ast-grep no-barrel rule, and duplication regression checks where they provide signal. The migrated CLI explicitly remains non-strict until strictness is addressed as its own measured migration. |

Knip still checks unused files/exports, duplicate exports, unresolved imports, and other source-graph issues. Its
unused-dependency category is disabled in the backbone because Knip currently misclassifies dependencies that are
resolved through pnpm's non-shared per-workspace lockfiles. Sherif, pnpm frozen installs, TypeScript, Oxlint, and
dependency-cruiser continue to cover version consistency, declaration, resolution, and boundary failures. Re-enable
Knip's dependency category if upstream support for this lockfile mode becomes reliable.

Additional tooling rules:

- Do not create re-export-only barrel modules. Use explicit package exports and direct entry points.
- Deterministic generators required by ordinary build/typecheck/test tasks run through Turbo, and committed outputs
  receive freshness checks where their canonical inputs reproduce reliably. The config JSON Schema and runtime Zod
  validator are generated by the CLI's ordinary uncached `generate` task and checked with a scoped Git diff. Their
  TypeScript root files are ordered by normalized relative path so Windows and Linux emit identical unions.
  The larger LLM corpus, its enhanced documentation schema, and the normalized API-reference data the documentation
  site renders use a separate cached task keyed by canonical `apps/docs` content, the config package, retained CLI
  declarations and generator code. It stages the complete corpus before replacement, contains no clock-derived
  metadata, and is covered by the same scoped generated diff.
  Live-upstream CLI generators remain deliberate manual operations.
- There is no universal generator watcher. A development command may start a native watcher only when derived output
  must change while that process remains alive.
- Pre-commit operates only on staged formatting, lint, and new-secret checks. Expensive architecture, dead-code,
  build, and test checks run in pre-push or CI.

pnpm 11 non-registry settings live in `pnpm-workspace.yaml`; `.npmrc` is reserved for registry/auth configuration.
Turbo remote caching and `turbo prune` remain disabled for v4 orchestration until their dependency-closure behavior is
validated with non-shared workspace lockfiles. Local task inputs include each workspace lockfile plus the root pnpm and
TypeScript policies.

[Claude Code currently reads `CLAUDE.md`, not `AGENTS.md`](https://code.claude.com/docs/en/memory#agents-md), and
officially supports importing `AGENTS.md` with `@AGENTS.md`. Use that one-line import rather than a symlink: it is
explicit and reliable on Windows without requiring Developer Mode or elevated symlink privileges. Do not duplicate
the instruction text.

## UI and design-system decisions

- Do not introduce styled-components or styled-component APIs.
- Console may continue using Emotion object styles and the `css` prop.
- Docs and website remain native Astro/CSS/Tailwind-oriented; do not move Astro shells to Emotion.
- `packages/design-tokens` owns brand primitives only — today, the Stacktape green. A token belongs there when at
  least two frontends must agree on its value; an application's palette, typography, and spacing stay with that
  application. The package deliberately does not define semantic or layout tokens.
- Typed raw values and CSS-variable references are available directly to TypeScript consumers.
- A tiny deterministic emitter writes the committed CSS variables. Consumers import that CSS and map it into their own
  theme (`apps/docs` aliases `--color-brand` to `--stp-color-brand` inside its Tailwind `@theme`); there is no adapter
  package or generator between them.
- Shared visual recipes are ordinary CSS classes using a stable `stp-` prefix.
- `packages/ui-react` is allowed, but components enter it only when they are genuinely shared, presentational,
  router-neutral, styling-system-neutral at the API boundary, and used by at least two consumers.
- Shared Link/Button components must not import React Router, Astro, or framework-specific navigation. Prefer `href`,
  render props, `asChild`, or consumer adapters.
- Logos and generally usable icons should be static assets or SVG exports rather than React-only components.
- `apps/docs` keeps its own Tailwind theme and `stp-` classes, and consumes exactly one shared primitive — the brand
  green — from `packages/design-tokens`. Docs and Website are therefore both real consumers of that package, and its
  accent is the actual Stacktape green rather than a placeholder.

## Documentation-site decisions

- `apps/docs/content/**/*.mdx` and `.resources.json` are the canonical documentation data and are inputs to the CLI's
  LLM corpus. The site reads them; it never rewrites or copies them.
- The documentation site consumes CLI-generated artifacts as data through explicit Turbo task dependencies
  (`@stacktape/docs#build`, `#typecheck`, `#dev`). It does not re-implement `enhance-config-schema`,
  `generate-api-reference`, or `generate-llm-docs`.
- `apps/cli`'s `generate:llm-docs` is the single owner of API-reference normalization. It emits
  `@generated/schemas/api-reference-data.json` — the same normalized data it renders into the corpus — as a
  freshness-owned generated output. `apps/docs` reads that artifact and keeps only presentation DTOs. The previous
  arrangement, where the site carried its own copy of the extractor, diverged in practice: the copy stopped decoding
  HTML entities and rendered `&#39;` to readers.
- Documentation code samples type-check in the browser against `apps/cli/generated/monaco-declarations` and the
  workspace's own TypeScript standard library, both served same-origin from the build output. Automatic type
  acquisition and the jsDelivr/TypeScript-playground fallbacks the v3 site used are removed: a sample must describe
  this checkout or fail visibly, never a released npm version. Twoslash renders with error validation disabled so a
  reader never sees a red block, so that suppression may never be cited as evidence the types resolve; the docs test
  suite re-runs the same virtual filesystem with validation enabled and asserts real hover output.
- The published URL set is a reviewed compatibility baseline (`apps/docs/tests/expected-routes.txt`), not merely a
  derived one. Slug derivation and the built-site validator prove the build agrees with the corpus; the manifest is
  what says which URLs were promised.
- `llms.txt`, `llms-full.txt`, and `llms-api-reference.txt` are copied into the built site byte-for-byte and the
  built-site validator asserts that equality. The site must not transform the corpus it republishes.
- `apps/docs/public` is the single committed static tree. Nothing writes to it during config evaluation or build;
  derived files are copied into `dist/` by an explicit build hook.

## Security and compatibility status

- Console security hardening is committed as `b098a76`.
- Stacktape scoped deployment credentials are committed as `747d6371`.
- Prisma uses a real baseline plus `migrate deploy`; fresh and previously `db push`-managed databases were tested with
  zero schema drift.
- API key and deployment token secrets exist for dev and production; values are not recorded in repository documents.
- The focused Console security suite passes. The legacy Console repository's full typecheck still has pre-existing
  application/generated-type debt; it is migration work, not an accepted v4 warning baseline.
- No security-hardening or production deployment was performed. At public commit `f091e541`, a separate disposable
  packaging fixture was deployed to the development account, exercised, redeployed unchanged, and deleted on
  2026-07-30.
- Production rollout order remains Console database/secrets/backend first, then Stacktape clients/runners.
- Credential rotation and full historical secret scanning are intentionally deferred.
- Legacy agent/playbook text is not imported verbatim: it contains stale commands, production-risky guidance, and
  embedded credentials. The v4 instructions contain no credential values and permit deployment/costed AWS activity
  only with explicit authorization.
- The old website is not imported. Only a fresh Astro application shell is created in v4.
- Release binary checksum publication and verification remains a pre-migration safety gate. The npm launcher receives
  an independently distributed manifest through the npm package; direct installers fetch archive and manifest from
  the same GitHub release and therefore provide corruption/integrity detection, not protection from a compromised
  GitHub release channel.
- Direct installers require manifests from `3.7.1` onward and retain the legacy path only for older pinned versions;
  unknown or malformed version labels fail closed.

## v4 behavior policy

V4 may break customer-facing configuration and CLI behavior. Do not maintain a general v3 compatibility or removal
ledger and do not add compatibility shims by default. Record broad product choices in this decision register and test
the chosen v4 contract directly.

The following remain risk-sensitive and must not change accidentally during structural work:

- CloudFormation logical IDs and deterministic physical/resource names for unchanged configurations;
- references, dependency ordering, IAM intent, and replacement-sensitive resource properties;
- artifact include/exclude rules and content hashing;
- safe database migration behavior;
- authentication and organization/project/account scoping;
- cleanup of temporary credentials and deployment artifacts;
- the npm binary/exports/config-authoring surface unless a v4 replacement is deliberately chosen.

The correction tables below are retained as historical reasoning for already-completed work; they do not establish an
ongoing per-change classification process.

### Classified published-declaration corrections

Extracting `@stacktape/config` added a strict consumer check over the built `stacktape` declarations, which
surfaced three declarations that never compiled for a customer. All three are `known-v3-bug` in behavior and
`intentional-v4-break` at the compile-time surface; each has a regression test.

| Correction                                                                                                                                                                                                                                                                                                                                                     | Classification                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `Convex` no longer declares `overrides`/`transforms`. Its CloudFormation children are not modelled, so `ConvexPropsWithOverrides`, `ConvexOverrides` and `ConvexTransforms` were referenced but never defined; `supportsOverrides: false` in the resource metadata now says so once, for every generator. Restore the property when the children are modelled. | `known-v3-bug`, compile-time `intentional-v4-break` |
| `IotIntegrationProps` is generated from its authored declaration instead of a `Record<string, unknown>` placeholder, so `sql` and `sqlVersion` are typed. A config that passed only because the placeholder accepted anything now fails to compile.                                                                                                            | `known-v3-bug`, compile-time `intentional-v4-break` |
| `StacktapeBudgetControl`/`StacktapeBudgetControlPlain` resolve. They aliased `./plain.BudgetControl`, which the schema-driven `plain.d.ts` never contained because `BudgetControl` is not reachable from `StacktapeConfig`.                                                                                                                                    | `known-v3-bug`                                      |

`BudgetControl`, `BudgetNotification`, `IotIntegration` and `IotIntegrationProps` are authored configuration that
the npm package publishes without being reachable from the configuration root. `@stacktape/config` owns them for
that reason: the package's rule is "authored configuration", not "reachable from `StacktapeConfig`", which is
only the test used to classify the bulk of the model.

### Classified config-schema corrections

Restoring deterministic generation exposed stale or invalid defaults in the committed JSON Schema and generated Zod
validator. The following are `known-v3-bug` corrections: Python 3.12, Lambda 90-day log retention, and Redis 30-day
log retention. The validator now matches the existing runtime behavior for those values. Defaults for HTTP payload
format, container architecture, and OpenSearch version previously included literal quote characters in the published
JSON Schema; the Zod generator already normalized those strings, so correcting their authored tags fixes the public
schema without changing runtime validation.

Node version, OpenSearch log retention, and JavaScript output module format are context-dependent. Their schema
defaults were also a `known-v3-bug`: one scalar value could not represent the synthesis/packaging rules. Their
generated defaults are therefore omitted, while the descriptions document and tests pin the runtime choices. Node
packaging selects an explicit `nodeVersion`, then an explicit Lambda runtime, then the Node 24 product fallback.
Generated union ordering is an `implementation-detail`; only union membership and behavior are compatibility
contracts.

## Explicit non-goals for the preflight

- Do not deploy the security work or v4 infrastructure.
- Do not rotate the previously identified Sentry/website credentials yet.
- Do not scan or rewrite historical repository secrets yet.
- Do not import the old website code or history.
- Do not build an SDK.
- Do not freeze the v3 JSONL byte representation.
- Do not deglobalize the CLI runtime as migration work; the headless-core rewrite is not a v4 goal.
- Do not update every dependency merely because the backbone exists; upgrades belong to owned migration slices with
  tests.

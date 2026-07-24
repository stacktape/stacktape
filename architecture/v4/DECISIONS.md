# Stacktape v4 decision register

## Pinned product and repository decisions

| Area                   | Decision                                                                                                                                                                                                | Goal                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repository identity    | Keep `stacktape/stacktape` as the public GitHub repository and `stacktape/console-app` as the private repository. Build v4 on fresh/orphan histories and change default branches only after validation. | Clean history without losing repository URLs, issues, stars, release links, or npm trusted-publisher identity. |
| Privacy                | Use one private submodule at `apps/console`. It contains `api` and `ui`. The submodule URL and commit SHA do not need to be hidden.                                                                     | Only two applications remain private while all shared tooling stays public.                                    |
| Public clone           | The complete public workspace must install, generate, lint, typecheck, test, build, and pack with `apps/console` absent. Public CI never initializes it.                                                | Fork-safe contributor experience without private credentials.                                                  |
| Maintainer clone       | Maintainers initialize `apps/console` and run integrated checks from the public parent. Private CI clones a selected public ref and mounts itself at `apps/console`.                                    | One coherent workspace with explicit, pinned private source.                                                   |
| History                | Losing old file history is acceptable and preferred. Keep the existing repository identities; do not merge old website history.                                                                         | Simpler migration and clean baseline.                                                                          |
| Applications           | Public applications are CLI, docs, and a fresh Astro website. Private applications are Console API and Console UI. `helper-lambdas` is a package, not an app.                                           | `apps` represents independently consumed or deployed surfaces.                                                 |
| SDK                    | Do not create or restore a Stacktape SDK.                                                                                                                                                               | Avoid maintaining a second public API without clear value.                                                     |
| Core                   | Create `packages/core` and refactor the old runtime into a headless, in-process operation engine during migration.                                                                                      | Testability, composability, and removal of process-global constraints.                                         |
| Package philosophy     | Create packages only for coherent, reusable capabilities. Do not create domain/infrastructure layers or generic dumping grounds merely to increase package count.                                       | Pleasant interfaces and understandable ownership.                                                              |
| Private apps placement | Mount the single private repository at `apps/console`, with `apps/console/api` and `apps/console/ui`. Do not use two submodules or public-clone symlinks.                                               | Every application remains under `apps` while preserving one atomic private boundary.                           |

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

The validated [public proof of concept](https://github.com/matuscongrady/stacktape-monorepo-poc) at `6631d7d` and its
private Console submodule at `4d1b604` demonstrate this contract-first boundary on TypeScript 6 in both public-only
and integrated clones.

## Tooling decisions

| Tooling area       | Decision                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager    | pnpm for installation, workspaces, catalogs, and frozen lockfiles.                                                                                                                                          |
| Lockfiles          | Use pnpm's non-shared workspace lockfile mode. Public root/packages and each optional private workspace keep reproducible lockfiles without requiring private packages to appear in a public root lockfile. |
| Runtime/test/build | Keep Bun where it is valuable. Do not require Bun as the package manager.                                                                                                                                   |
| Task graph         | Turborepo with explicit task descriptions, inputs, outputs, and dependencies.                                                                                                                               |
| TypeScript         | TypeScript 6 is authoritative initially. Isolate programmatic-compiler consumers in `schema-codegen`.                                                                                                       |
| Lint               | Oxlint immediately; no long-lived ESLint compatibility layer. TypeScript 6 remains authoritative for type-aware checks until Oxlint's TS-Go semantics are an intentional choice.                            |
| Format             | Oxfmt for supported files and dprint `markup_fmt` for `.astro`. No Prettier in the v4 workspace.                                                                                                            |
| Vite+              | Do not adopt it.                                                                                                                                                                                            |
| AI guardrails      | Use strict TypeScript, Oxlint, package exports, dependency-cruiser, Knip, Sherif, publint, a narrow ast-grep no-barrel rule, and duplication regression checks where they provide signal.                   |

Knip still checks unused files/exports, duplicate exports, unresolved imports, and other source-graph issues. Its
unused-dependency category is disabled in the backbone because Knip currently misclassifies dependencies that are
resolved through pnpm's non-shared per-workspace lockfiles. Sherif, pnpm frozen installs, TypeScript, Oxlint, and
dependency-cruiser continue to cover version consistency, declaration, resolution, and boundary failures. Re-enable
Knip's dependency category if upstream support for this lockfile mode becomes reliable.
| Barrel exports | Do not create re-export-only barrel modules. Use explicit package exports and direct entry points. |
| Generation | Every generator is deterministic and one-shot. Build/typecheck/test tasks depend on generation through Turbo. CI checks committed outputs for freshness. |
| Watch mode | No universal generator watcher. A development command may start a native watcher only when derived output must change while the process remains alive. |
| Hooks | Pre-commit operates only on staged formatting/lint/new-secret checks. Expensive architecture, dead-code, build, and test checks run in pre-push or CI. |

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
- `packages/design-tokens` owns TypeScript primitives and semantic themes.
- Typed raw values and CSS-variable references are available directly to TypeScript consumers.
- A tiny deterministic emitter writes committed CSS variables and a Tailwind `@theme` adapter.
- Shared visual recipes are ordinary CSS classes using a stable `stp-` prefix.
- `packages/ui-react` is allowed, but components enter it only when they are genuinely shared, presentational,
  router-neutral, styling-system-neutral at the API boundary, and used by at least two consumers.
- Shared Link/Button components must not import React Router, Astro, or framework-specific navigation. Prefer `href`,
  render props, `asChild`, or consumer adapters.
- Logos and generally usable icons should be static assets or SVG exports rather than React-only components.

## Security and compatibility status

- Console security hardening is committed as `b098a76`.
- Stacktape scoped deployment credentials are committed as `747d6371`.
- Prisma uses a real baseline plus `migrate deploy`; fresh and previously `db push`-managed databases were tested with
  zero schema drift.
- API key and deployment token secrets exist for dev and production; values are not recorded in repository documents.
- The focused Console security suite passes. The legacy Console repository's full typecheck still has pre-existing
  application/generated-type debt; it is migration work, not an accepted v4 warning baseline.
- No deployment was performed.
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

## v4 compatibility policy

Each behavioral baseline or observed v3/v4 difference must be marked as one of:

1. `must-preserve` — changing it risks customer infrastructure, data, security, or an explicitly retained interface.
2. `intentional-v4-break` — reviewed and documented as part of the major release.
3. `known-v3-bug` — changed with a regression test describing the corrected behavior.
4. `implementation-detail` — deliberately not captured as a contract.

Even for v4, the following default to `must-preserve` unless explicitly approved:

- CloudFormation logical IDs and deterministic physical/resource names for unchanged configurations;
- references, dependency ordering, IAM intent, and replacement-sensitive resource properties;
- artifact include/exclude rules and content hashing;
- safe database migration behavior;
- authentication and organization/project/account scoping;
- cleanup of temporary credentials and deployment artifacts;
- the npm binary/exports/config-authoring surface unless a v4 replacement is documented.

## Explicit non-goals for the preflight

- Do not deploy the security work or v4 infrastructure.
- Do not rotate the previously identified Sentry/website credentials yet.
- Do not scan or rewrite historical repository secrets yet.
- Do not import the old website code or history.
- Do not build an SDK.
- Do not freeze the v3 JSONL byte representation.
- Do not perform the complete core deglobalization before the orchestrated migration.
- Do not update every dependency merely because the backbone exists; upgrades belong to owned migration slices with
  tests.

# Simplified Stacktape v4 migration

This document supersedes the earlier runtime-extraction plan for all ongoing and new work on `v4/integration`. The
previous implementation remains recoverable at `v4/complex-archive`; do not copy its architecture into the simplified
line. `TARGET-ARCHITECTURE.md`, `ORCHESTRATION-PLAN.md`, and `MIGRATION-RUNBOOK.md` describe that rejected plan and are
retained only as history. Where this document disagrees with any other document in `architecture/v4`, this one wins.
Issues intentionally deferred from the active refactor are tracked in `DEFERRED-ISSUES.md`.

## Goal

Create a maintainable pnpm monorepo without rewriting working Stacktape behavior merely to fit an idealized
architecture.

The migration starts by moving the existing applications with the smallest practical set of path and tooling changes.
Code is extracted into a package only when that package has a concrete present-day responsibility or consumer.

## Target repository

```text
apps/
├── cli/                 # existing public Stacktape implementation, initially moved mostly unchanged
├── docs/                # public Astro documentation app
├── website/             # public Astro marketing app
└── console/             # private Git submodule
    ├── api/
    └── ui/

packages/
├── packaging/           # extracted only after the migrated CLI works
├── console-api/         # public external tRPC schemas/contracts when Console is migrated
├── design-tokens/       # added when at least two frontends consume the same tokens
└── ui-react/            # only components used by at least two applications
```

The directory list is a destination, not a requirement to create empty packages. A package is absent until it owns
real code.

The helper Lambdas are deliberately not in that list. They are separately built deployment artifacts, but their source
transitively needs 31 non-helper CLI modules — 30 of which have other CLI consumers — and is typed against the ambient
`types/` config declarations that produce the published config schema. Extracting them would mean a package-to-app
dependency, duplicated implementation, or an `aws`/`naming`/`config` package cascade, so they stay in
`apps/cli/helper-lambdas`, whose `AGENTS.md` records the measurement and the condition for revisiting.

## Conceptual-complexity budget

Conceptual complexity is an acceptance criterion, not a stylistic preference.

- Prefer a direct function call or existing application object over a new port, registry, factory, service container,
  or framework.
- Do not introduce an interface for a single implementation unless it is an actual external boundary.
- Do not split code merely to make directories look architecturally symmetric.
- Do not create packages for possible future consumers.
- Do not make type-level APIs harder to understand than the runtime behavior they describe.
- Preserve an existing, understandable design during the move. Refactor it later only with a concrete problem and
  focused behavioral evidence.
- Apply adversarial input hardening at genuinely untrusted boundaries. Internal trusted objects do not need to defend
  against exotic Proxies, monkey-patched built-ins, or deliberately hostile JavaScript runtimes.
- A reviewer must be able to explain the changed execution path plainly. If that requires teaching a new framework,
  the implementation has not passed maintainability review.

An abstraction is justified only when it reduces the total number of concepts a maintainer must hold in their head.

## Tooling

- pnpm owns workspace installation and dependency resolution.
- Turbo coordinates ordinary package tasks; it is not a substitute for understandable package scripts.
- TypeScript 6, Oxlint, and Oxfmt are the default tools.
- Bun remains allowed where the existing CLI intentionally uses it for execution or build tooling.
- Generation is invoked by normal build/check dependencies; there is no human-only generation ritual.
- Keep the useful public-clone, private-boundary, package, secret, and Git-worktree checks. Remove gates whose only
  purpose was enforcing the abandoned runtime architecture.

## Migration sequence

1. Import the current public CLI as a working application with minimal code changes.
2. Import the private Console into its submodule while retaining its reviewed security hardening and Prisma migrations.
3. Establish behavioral baselines around important CLI outputs and ordinary failure paths.
4. Extract `packaging` from working code without redesigning it. Keep the helper Lambdas in `apps/cli` for the reason
   recorded above.
5. Establish the practical tRPC public-contract boundary during the Console migration.
6. Add shared design tokens and React components only when real frontend consumers exist.

The existing CLI implementation is the v4 starting point. There is no copied compatibility shell, parallel native
compiler, SDK, or general-purpose headless runtime.

## Review process

Opus 5 at `xhigh` effort implements each coarse phase. GPT-5.6 Sol independently reviews the exact commit. The
implementer repairs confirmed findings, the reviewer re-checks the repaired commit, and the orchestrator alone
integrates it.

Reviews prioritize:

- behavior and customer compatibility;
- code readability and conceptual economy;
- public/private isolation;
- real security boundaries;
- packaging and release correctness;
- tests that fail when meaningful behavior regresses.

No deployment or costed AWS test is implied by migration work.

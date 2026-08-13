# Phase S1: import the existing public CLI

## Goal

Replace the placeholder `apps/cli` with the real public Stacktape CLI from exact source commit
`17aef681cf6fdf1cc2516bba87e66d17f225180b`, and make it an ordinary pnpm workspace application without redesigning its
runtime.

## Why this phase exists

The previous migration attempted to build a second runtime, compatibility shell, native compiler, and custom AWS
framework before the existing product was running in the monorepo. This phase reverses that order: first obtain a
faithful, understandable, runnable application; extract or refactor only afterward.

## Source and provenance

- Source repository/worktree: `C:\Projects\stacktape`
- Source commit: `17aef681cf6fdf1cc2516bba87e66d17f225180b`
- Public integration base: the exact `v4/integration` commit recorded in `.stacktape-agent.json`
- Import tracked Git content from the source commit, never untracked working-tree files.
- Never copy `.env*`, `.sentryclirc`, credentials, caches, build outputs, `node_modules`, or another repository's `.git`
  data.

Expected application content includes the existing `src`, `shared`, `scripts`, `tests`, `types`, `@generated`,
`helper-lambdas`, and starter-project assets required by build/release behavior. Existing docs and GitHub workflows
remain out of scope for this phase unless a focused CLI gate proves that a small file is required.

## User-visible behavior

- The CLI remains the existing Stacktape implementation.
- Existing commands, synthesis, naming, packaging, helper-Lambda handling, MCP behavior, and release assembly are not
  reimplemented.
- `stacktape --version` and help execute from the built/packed application.
- The important existing deterministic characterization and release-security checks remain runnable.

## Required implementation approach

- Move first; refactor later.
- Preserve existing source structure inside `apps/cli` where practical.
- Make only path, manifest, workspace, TypeScript 6, formatting/lint, build, test, and package-manager changes required
  for the application to work from its new package root.
- pnpm owns installation. Existing intentional Bun scripts may remain and can be invoked by package scripts.
- Remove unused placeholder packages and abandoned runtime-specific root gates rather than satisfying them with empty
  code or exclusions.
- Keep the optional private `apps/console` submodule absent-compatible.
- Keep root task names small and obvious: install, build, typecheck, test, lint, format, package/public checks.
- Generated data may remain committed where the current product requires it, but generated directories must be
  explicitly identified and excluded from hand-edit expectations.

## Conceptual-complexity constraints

- Do not add `packages/core`, an operation framework, ports, registries, a compatibility shell, or a second synthesis
  path.
- Do not introduce a custom AWS client factory or transport layer.
- Do not extract config, naming, command contracts, packaging, or helper Lambdas in this phase.
- Do not create wrapper modules solely to avoid changing an import path.
- Do not turn existing managers into dependency-injection abstractions during the move.
- Every new abstraction must solve a problem demonstrated by at least two current call sites or an actual untrusted
  boundary.
- Prefer one explicit package script over a custom workspace script when both express the same operation.

## Quality expectations

- No new `any` used to bridge the move.
- No broad `@ts-ignore`, lint-disable, or generated-directory exemption used to hide newly introduced problems.
- It is acceptable to record narrowly scoped pre-existing lint/type debt if fixing it would redesign runtime behavior,
  but the imported application must typecheck under the selected TypeScript 6 configuration.
- Formatting may be normalized once because repository history is intentionally fresh.
- Comments explain non-obvious constraints, not ordinary syntax.
- The final application flow must remain recognizable to a maintainer familiar with the current CLI.

## Required deterministic checks

At minimum:

- frozen pnpm installation from a public checkout;
- CLI TypeScript 6 typecheck;
- existing deterministic characterization tests;
- helper-Lambda artifact check if it is part of the ordinary build;
- release-security and release-artifact/package checks that do not contact AWS;
- built or packed `stacktape --version` and help smoke tests;
- root public workspace build/typecheck/test/lint/format/package checks;
- secret scan over the imported tracked tree;
- proof that `apps/console` is not required by the public checks.

Do not deploy, contact real AWS, publish packages, push branches, or run evaluation scripts that spend external service
credits.

## Compatibility classifications

Must preserve:

- CloudFormation synthesis behavior and infrastructure identifiers;
- ordinary command behavior;
- packaging and helper-Lambda artifact behavior;
- current security hardening at source commit `17aef681`;
- release contents needed by installed users.

Allowed implementation changes:

- repository-relative build paths;
- pnpm workspace metadata and lockfiles;
- v4 development package version;
- TypeScript/Oxlint/Oxfmt configuration;
- removal of unused placeholder packages and abandoned architecture gates.

## Handoff

Commit all tracked changes on the assigned slice branch. Report:

- exact source and result commits;
- files/directories imported and deliberately omitted;
- path/tooling changes made;
- concepts or abstractions introduced, with present-day justification;
- tests run and failures not resolved;
- customer-visible differences;
- residual migration risks.

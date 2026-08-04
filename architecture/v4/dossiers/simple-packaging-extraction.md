# Phase S3: extract the existing packaging implementation

## Goal

Move the CLI's real artifact-building implementation into `packages/packaging` while preserving behavior and making
the code easier—not harder—to follow.

This is a structural extraction from the working v4 CLI. It is not a packaging redesign.

## Why this phase exists

Packaging is a concrete capability with many current consumers inside the CLI and a meaningful independent test
surface. It owns language bundlers, buildpacks, artifact assembly, content tracking, and related filesystem/Docker
work. Keeping all of that under `apps/cli/shared` makes the application own a reusable capability and makes the later
helper-Lambda package depend on CLI-internal paths.

The current implementation already works. The purpose of this phase is to give it honest ownership and package
boundaries without replacing it with a framework.

## Starting point

- Public integration commit: `7fe0a7962599f14ff86528c407c96a600a4cd007`.
- The existing implementation is primarily under `apps/cli/shared/packaging`.
- `apps/cli/src/domain/packaging-manager` is application orchestration and should remain in the CLI unless moving a
  specific piece clearly reduces coupling.
- Existing characterization coverage includes custom-artifact contents, content digests, cache invalidation,
  synthesis behavior, CLI smoke, npm/release assembly, and helper-Lambda artifact verification.
- The exact public line has passed a clean native-WSL public proof. Bun 1.3.9 can crash while building the CLI from a
  sparse Windows worktree because of its own backslash path assertion; reproduce suspicious Windows-only failures in
  native WSL before treating them as product defects.

## Required result

- Create the real `@stacktape/packaging` workspace package with source, package metadata, TypeScript configuration,
  focused tests, and explicit subpath exports for paths that have actual consumers.
- Move coherent packaging implementation out of `apps/cli/shared/packaging`; do not copy it and leave two sources of
  truth.
- Update CLI consumers to import the package directly.
- Preserve artifact bytes/structure, handler names, file selection, hashes, cache behavior, source maps, layers,
  buildpack behavior, Docker invocation semantics, and release composition unless a difference is explicitly proven
  to be a pre-existing bug and documented.
- Keep `apps/cli` as the composition root. CLI command flow, managers, user interaction, event reporting, and global
  application state remain application concerns.
- Leave helper-Lambda source and its extraction for the following phase, but its existing packaging and verification
  must continue to pass.
- Do not create or revive `packages/core`, `packages/aws`, `packages/config`, `packages/naming`, ports, registries,
  adapters, runtime factories, or compatibility shells.

## Dependency and complexity rules

Conceptual complexity is an acceptance criterion.

- Prefer moving a small utility with the capability that overwhelmingly owns it over inventing an interface for it.
- A package must not import from `apps/cli` or resolve CLI aliases back into the application.
- Do not create a generic utility package. Leave genuinely shared application utilities where they are unless their
  ownership is clearly packaging.
- Where packaging genuinely needs an application action (for example progress/event reporting or resolved project
  state), pass the concrete value or callback the function needs. Do not introduce a multi-method port, service
  container, context object, registry, or factory.
- Do not wrap every moved function merely to preserve old import paths. Update internal consumers directly.
- Avoid a barrel export. Use explicit package subpaths that correspond to concrete modules consumed today.
- Do not split files or rename concepts simply to make the new directory look designed.
- Do not tighten legacy types or modernize unrelated dependencies in this phase.
- A maintainer should still be able to trace `package` command → CLI packaging manager → concrete packaging function
  with ordinary “go to definition.”

If a file cannot cross the boundary without a disproportionate abstraction, leave that application-specific
orchestration in the CLI and extract the coherent lower-level implementation it calls. Report the deliberate seam.

## Owned paths

- `packages/packaging/**`
- `apps/cli/shared/packaging/**`
- imports and package metadata needed for current CLI consumers
- directly relevant packaging characterization tests and workspace/tool configuration

Changes outside those paths must be small and directly required by the extraction.

## Compatibility classification

This phase is behavior-preserving. Treat changes to the following as blockers unless explicitly justified:

- packaged file sets and archive layout;
- artifact and cache digests;
- Lambda handlers, layer assignment, and native dependency handling;
- language runtime/buildpack defaults;
- Dockerfile and Docker command behavior;
- generated source maps and rewritten imports;
- hosting/SSR/Next.js artifact layout;
- npm, binary, and helper-Lambda release contents;
- command output/error behavior visible to users or automation.

No external consumer depends on internal JSONL details, but changing them is unnecessary here.

## Required tests

At minimum:

- package-local typecheck and focused unit tests;
- existing CLI packaging characterization tests;
- helper-Lambda artifact build/verification;
- CLI smoke and release artifact verification;
- dense credential-free synthesis characterization;
- workspace architecture, pattern, secret, format, lint, dead-code, and duplicate gates;
- a clean public-only proof with the private submodule absent.

Add focused characterization only where an important moved behavior lacks evidence. Do not add tests that merely
assert file paths or restate implementation details.

## Safety

- No AWS calls, deployment, publication, push, remote secret creation, remote database access, or credential output.
- Do not run Docker cleanup commands. Remove only disposable containers/artifacts created by this phase.
- Do not weaken a gate or enlarge a baseline to make the move pass.
- Do not modify the private Console submodule.

## Review questions

The independent reviewer must be able to answer:

1. Is `packages/packaging` a real capability package, or just the old directory behind indirection?
2. Does any dependency point from the package back into the CLI application?
3. Were application-specific concerns left in the CLI without creating elaborate ports?
4. Are artifact, cache, release, and helper-Lambda behaviors materially preserved?
5. Did the extraction reduce ownership ambiguity without increasing the number of concepts?

## Handoff

Commit the public slice only. Report the exact commit, moved/remaining ownership, import direction, tests and artifact
comparisons, known platform limitations, and any behavior intentionally left unchanged despite imperfect legacy code.

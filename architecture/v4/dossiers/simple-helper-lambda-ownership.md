# Phase S4: make helper-Lambda ownership honest

## Goal

Give Stacktape's four internally deployed helper Lambda artifacts the clearest maintainable ownership available in the
simplified monorepo, while preserving their runtime contents and avoiding a fake workspace boundary.

The desired result is `packages/helper-lambdas` only if it can be a real, independently understandable package. A token
package that reaches backward into `apps/cli` is worse than keeping this tightly coupled artifact module inside the CLI.

## Starting point

- Public integration commit: `d12913996e6edfa73272deb01116484765f4c186`.
- Helper-Lambda source currently lives at `apps/cli/helper-lambdas`.
- Packaging and verification currently live in:
  - `apps/cli/scripts/package-helper-lambdas.ts`;
  - `apps/cli/scripts/verify-helper-lambda-artifacts.ts`;
  - `apps/cli/src/utils/helper-lambdas.ts`.
- The artifact set is:
  - `stacktapeServiceLambda`;
  - `batchJobTriggerLambda`;
  - `cdnOriginRequestLambda`;
  - `cdnOriginResponseLambda`.
- Clean public checks build and structurally verify all four artifacts.
- The new `@stacktape/packaging` package deliberately owns only the self-contained split/layer engine. The CLI still
  owns buildpacks typed against its configuration/error/progress vocabulary.

## The dependency problem to resolve, not hide

The deployed helper source currently imports general CLI implementation such as:

- AWS SDK manager and CloudFormation helpers;
- AWS identity tRPC signing/client code;
- resource/tag/console-link naming;
- ZIP, role-policy, constants, and miscellaneous utilities.

Some of those modules have many non-helper CLI consumers. Moving them wholesale into a helper-Lambda package would make
that package a misleading general utility/AWS package. Copying them would create multiple sources of truth. Importing
them from `apps/cli` would reverse the monorepo dependency direction.

## Acceptable outcomes

### Outcome A — real package

Create `@stacktape/helper-lambdas` only if all of the following are true:

- it owns the actual deployed source, artifact manifest, focused runtime tests, packaging entrypoint, and structural
  artifact verification;
- it typechecks and tests as an ordinary workspace package;
- it has no import, path alias, build-time path, or hidden resolution back into `apps/cli`;
- `apps/cli` consumes it in one direction;
- no deployed implementation is duplicated;
- no new general-purpose package, port, registry, factory, context, service container, or compatibility wrapper is
  introduced;
- general code is moved into it only when helper-Lambda runtime behavior is its honest dominant owner and other
  consumers naturally depend on the helper package.

### Outcome B — intentional co-location

If Outcome A requires backward dependencies, duplication, misleading ownership, or the package cascade abandoned by the
simplified migration:

- do not create `packages/helper-lambdas`;
- keep the actual source and build flow co-located in `apps/cli`;
- make its boundary explicit with a focused local `AGENTS.md` and/or similarly small existing instruction update;
- update `SIMPLIFIED-MIGRATION.md` and the decision record so the target no longer falsely promises a workspace package
  under current constraints;
- record the concrete dependency evidence and the condition that would justify revisiting the decision;
- improve only a small, directly useful artifact test or ownership detail if evidence shows a real gap. Do not create
  work merely to make the slice non-empty.

Outcome B is a successful result when it has fewer concepts and a more truthful dependency model.

## Conceptual-complexity rules

- No `packages/aws`, `packages/naming`, `packages/config`, `packages/core`, or generic shared package.
- No package-to-app dependency, even if hidden behind TypeScript paths or a build script.
- No copied CLI utilities or generated mirrors.
- No interface for a single implementation merely to cross a directory boundary.
- No package whose only purpose is pointing a script at `apps/cli/helper-lambdas`.
- Do not refactor the helper runtimes merely to erase imports.
- Prefer current understandable coupling over dishonest decoupling.
- Do not turn four deployment artifacts into four workspace packages.

## Compatibility

Unless fixing a separately proven existing bug, preserve:

- exactly four artifacts and their names;
- `index.default` handlers;
- Node target, minification, externals, and source-map behavior;
- extracted artifact file contents and layout;
- bundle size limits;
- digest/cache inputs;
- CLI release layout and runtime lookup;
- custom-resource, alarm, issue, CloudFront, and batch-trigger behavior.

ZIP container bytes may vary because of timestamps; compare extracted contents and semantic metadata.

## Required work

1. Map actual helper-source imports and their non-helper consumers.
2. Attempt the cleanest dependency ownership model on paper before moving files.
3. Choose Outcome A or B based on total conceptual complexity, not target-tree aesthetics.
4. Implement the chosen outcome narrowly.
5. Preserve and run focused runtime tests already present under helper source.
6. Build and verify all four real artifacts.
7. Compare extracted artifact trees with the base commit from the same absolute path.
8. Run CLI typecheck, characterization, smoke, release artifact, architecture, workspace, secret, format, lint,
   dead-code, duplicate, and public-only checks as applicable.

## Safety

- No AWS calls, deployment, publication, push, remote mutation, credential access/output, or private-submodule change.
- Remove only scratch artifacts created by this slice.
- Do not weaken gates or add known-violation exemptions.

## Review questions

1. Is the chosen ownership more truthful and easier to maintain?
2. If a workspace package was created, is it genuinely independent of the CLI application?
3. If co-location was retained, is that backed by concrete dependency evidence rather than reluctance?
4. Are all four artifact contents and runtime contracts preserved?
5. Did the slice avoid new concepts whose only purpose is satisfying the target directory diagram?

## Handoff

Commit the public slice and report the exact SHA, chosen outcome, dependency evidence, changed ownership/instructions,
artifact comparison, tests, and any explicit condition for revisiting the decision.

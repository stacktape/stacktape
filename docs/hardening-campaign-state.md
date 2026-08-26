# Hardening campaign checkpoint — 2026-08-26

Read [the work instructions](hardening-work-instructions.md) before continuing. This checkpoint records a bounded
campaign, not release approval. Import, packaging, runtime and AWS results are separate kinds of evidence.

## Workspace and reusable inputs

- Product integration: `C:/Projects/.worktrees/stacktape-project-qualification`, branch
  `codex/project-qualification-final`. Do not merge into the unrelated dirty `C:/Projects/stacktape` checkout.
- Corpus: `C:/Projects/stacktape-qualification-corpus`. It contains pinned references to public projects, complete
  synthetic source, semantic expectations and provenance. Reports are ignored.
- Pinned public-source cache: `C:/Projects/stacktape-qualification-cache`.
- Standalone JobDesk adoption source: `C:/Projects/qualification-synthetic-bun-jobdesk`, clean commit
  `ea81f74593615cb6170b09cd162679d04663aec2`. Its 38 tracked files were copied byte-for-byte into the corpus. Keep the
  standalone repository as provenance; do not copy dependency trees or generated output.

The corpus has 21 projects: 12 real applications, three official examples, three official starters and three synthetic
applications. Fifteen have exact import expectations; six are still discovery cases: Miniflux, Chatwoot, Twenty, Plane,
T3 Turbo and Bedrock WordPress. An expectation does not by itself prove that a case passed. Inspect its report.

## Accepted product behavior

- Compose release selection uses release/default/development priority before counting applications. Published-image
  commands retain their argument boundaries, and an unrelated development Dockerfile no longer causes a pointless
  source-packaging choice for an authoritative release image.
- Parameterized Go release images claim only source compiled by the selected argument in the final Docker stage's
  dependency graph. Same-named sibling applications and unused stages do not establish ownership.
- Dockerfile aliases work with true symlinks and Windows materialized links. Consumers retain the declared build
  context. If canonicalization could change `.dockerignore` policy, import blocks and saved YAML retains the original
  alias, including after ownership decisions and config reload.
- NuxtHub configuration, runtime APIs, modules and migration hooks produce explicit production-storage guidance. A
  configured database is not declared AWS-ready merely because no query was found. Plain Nuxt remains a positive
  control. Atidone is an intentional negative contract, not a successful AWS migration.
- DocFlow preserves its real setting names and service ownership. Its custom S3 endpoint/static-credential usage keeps
  the import review-only; the importer does not promise that substituting an AWS bucket makes the code portable.
- The qualification harness checks `expect.serviceEnvironment` against the saved YAML per named resource, requiring
  exactly one entry with the expected value. A worker's correct connection cannot hide a disconnected API. A changed
  expectation invalidates resume reuse; diagnostics do not print observed environment values.

These repairs received independent boundary-focused review. Review found and corrected additional problems, including
unused Docker-stage ownership, lost ignore policies after saving, and unrelated source packaging choices.

## Verified checkpoint evidence

- Product `9c633b7d`: all 14 then-current exact corpus contracts passed in a fresh import run. Report:
  `C:/Projects/stacktape-qualification-corpus/reports/combined-9c633b7d/qualification-report.json`.
- Product `63204fd0`: independent integration review accepted all conflict resolutions and the authoritative-image
  correction. The previously failing release array/string command cases passed without weakening expectations.
- Product `2c277cb8`: independent harness review accepted per-resource environment assertions. All 74 harness tests, all
  1,027 CLI source tests, all 44 init UI tests, and full CLI/inference/UI typechecks passed. Instructions, workspace,
  pattern, architecture and secret checks passed. The preceding combined inference run passed 691 tests; the two added
  authoritative-image controls also passed.
- The stronger DocFlow per-process wiring contract passed at `2c277cb8`:
  `C:/Projects/stacktape-qualification-corpus/reports/docflow-scoped-env-2c277cb8/qualification-report.json`.
- Eight dependency-free Docker COPY fixtures passed on Docker 29.1.3: identity, file/directory remapping, later
  overwrites, named/numeric stage copies, stage inheritance and changed working directories. These verify Docker's
  actual filesystem behavior, not full project packaging. Their labeled containers and images were removed after
  inspection. Report: `C:/Projects/qualification-reports/docker-copy-oracle-mt9dp1ar.json`.

The initial `pnpm check:public` stopped at the two release-command tests fixed by `63204fd0`. Its full CLI source suite
was then rerun successfully. This is **not** a green complete public gate: later build/release gates have not been rerun
at this checkpoint. Logs are under `C:/Projects/qualification-reports`.

## Current unfinished item

JobDesk's literal entryfile ownership and array-form migration citations are under final review in
`codex/jobdesk-importer-repair`. Its ordinary exact contract passes, but independent review found two edge defects:
absolute container entry paths could claim unrelated repository source, and migration argv lost boundaries when
converted to a shell string. The repair must include the native Windows hook consumer: POSIX single-quoting alone does
not preserve arguments there. Do not accept only generated-YAML tests or merge an unreviewed intermediate fix.

After that repair is accepted, merge it, run the combined focused checks and all 15 exact corpus contracts, then commit
the pending corpus adoption. Preserve the application source; do not simplify it to make inference pass.

## Environment limits and next execution order

The host C: drive has about 1.7 GiB free. Two obsolete harness-owned runner images were removed; the latest was kept. No
source cache, reusable project or run report was deleted. Docker-internal free space is not equivalent to host free
space. Large builds are deferred rather than risking a full host disk. Do not work around a denied cleanup operation
with a different deletion mechanism.

Once adequate disk space or a disposable runner is available:

1. Run sandboxed import + packaging for the **corrected Debian Vaultwarden Dockerfile**, then JobDesk. The earlier
   Alpine Vaultwarden build did not prove the corrected path. Inspect the exact Dockerfile in the generated config.
2. Run adjacent affected package cases as capacity permits. Finish the complete public gate and runtime lane for any
   command/packaging changes. Record environment and upstream failures separately from product defects.
3. Only then expand the corpus into a missing customer behavior from `candidate-backlog.md`; do not collect more
   variants of an already-covered hello-world application while known build failures remain.
4. Live AWS still needs the explicit disposable-account identity, region, credential mode, owner, API key and canary
   guard inputs described in [project qualification](project-qualification.md). No AWS deployment ran in this resumed
   session. Do not infer permission or target identity from available credentials.

External-model availability at this checkpoint: Grok 4.6 xhigh supplied candidate research and blind JobDesk source;
Antigravity Flash 3.7 high was quota-blocked, with a reported reset around 03:13 local time; the Opus CLI OAuth session
was expired. Recheck availability once when resuming, not in a polling loop. Delegate a concrete bounded repair or
source audit, request compact evidence, and review the affected boundary rather than repeatedly re-auditing everything.

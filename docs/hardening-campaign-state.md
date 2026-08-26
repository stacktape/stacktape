# Hardening campaign checkpoint — 2026-08-26

Read [the work instructions](hardening-work-instructions.md) before continuing. This checkpoint records a bounded
campaign, not release approval. Import, packaging, runtime and AWS results are separate kinds of evidence.

## Workspace and reusable inputs

- Product integration: `C:/Projects/.worktrees/stacktape-project-qualification`, branch
  `codex/project-qualification-final`. The importer batch passed at `35f0027a`; the later source-copy repair and Linux
  Vaultwarden packaging passed at clean commit `2480d98c`. Subsequent checkpoint edits are documentation only. Do not
  merge into the unrelated dirty `C:/Projects/stacktape` checkout.
- Corpus: `C:/Projects/stacktape-qualification-corpus`. It contains pinned references to public projects, complete
  synthetic source, semantic expectations and provenance. Source adoption is committed at `bca5bc0`, and the final
  JobDesk/DocFlow contracts at `861888d`. Packaging-status documentation is at `dce72c9`. Reports are ignored.
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
- JobDesk's root Dockerfile produces one API and one private worker with their exact Bun commands, separate
  PostgreSQL/Redis connections and one Drizzle migration. A bounded Docker COPY/WORKDIR mapper proves entryfile
  ownership; path resemblance does not. Remapping, overwrites, install hooks and incomplete scans cannot silently attach
  unrelated source. Alias-based ownership uses the original declared Dockerfile's ignore rules.
- Array-form migration commands retain literal arguments through saved YAML and the real CLI hook consumer on Windows.
  Recognized literal commands run without shell expansion. Unsafe arguments through Windows `.cmd`/`.bat` wrappers stop
  with actionable guidance instead of being misquoted; native Bun/Node commands preserve the tested arguments.

These repairs received independent boundary-focused review. Review found and corrected additional problems, including
unused Docker-stage ownership, lost ignore policies after saving, and unrelated source packaging choices.

## Packaging continuation — completed 2026-08-26 morning

Antigravity Flash 3.7 high ran the builds and repair. The coordinator reviewed the patch, strengthened its negative
control, reran the source and qualification tests, checked the saved configuration/template, verified host-recorded
artifact hashes and independently checked run-owned Docker cleanup. No AWS deployment ran.

- **JobDesk passed import and full packaging** on clean product `b9869435`, corpus `861888d`. Both API and worker
  produced non-skipped image artifacts, and the synthesized ECS task definitions retained their separate Bun commands
  and database/Redis connections. The migration hook was preserved, not executed. Report:
  `C:/Projects/qualification-reports/jobdesk-package-b9869435-0608/qualification-report.json`.
- **The first Linux Vaultwarden run failed its import contract.** It built Alpine successfully, but lost the declared
  Debian path and the expected database/domain configuration. Do not count that build as a passing qualification.
  Evidence: `C:/Projects/qualification-reports/vaultwarden-debian-package-b9869435-0623/qualification-report.json`.
- **The cause was the harness's source copy, not an importer preference.** `fs.cp` rewrote a relative Dockerfile symlink
  into an absolute link to the original checkout. The importer correctly refused that outside-project target. Windows
  materialized pointer files had hidden this problem. `83c663fd` sets `verbatimSymlinks: true` for the source/history
  copies without weakening the scanner. Test commits `1426a376` and `2480d98c` cover acquisition followed by import,
  including rejection of a real external Dockerfile that remains reachable after copying.
- **The corrected Linux import and Debian packaging both passed** at `2480d98c`, with the unchanged source pin and
  expectations. The final run built the Debian image, preserved root context, port 80, single-instance scaling, `/data`
  persistence, PostgreSQL/bastion and DOMAIN/DATABASE_URL wiring, and synthesized the template offline. Reports:
  `C:/Projects/qualification-reports/vaultwarden-linux-import-2480d98c/qualification-report.json` and
  `C:/Projects/qualification-reports/vaultwarden-debian-package-2480d98c/qualification-report.json`.
- The final **78 qualification tests** and **nine source-copy tests** passed. CLI typechecks, changed-file formatting
  and lint passed; the architecture gate found no new violations. The production change is limited to source-copy
  options. Importer preferences, corpus expectations and application source were not changed to obtain these passes.

All metadata-listed artifact SHA-256 hashes matched. The successful runs' containers, volumes and networks were removed;
reusable product runner images remain. These are packaging/template results, not application startup, real database
migration, persistence, CloudFormation API validation or AWS deployment results.

## Earlier combined importer evidence

- All **15 exact corpus contracts passed** in a fresh run at clean product `35f0027a`. This includes the new JobDesk
  case and stronger per-resource DocFlow connection assertions. The six discovery cases were not counted as passes.
  Report: `C:/Projects/stacktape-qualification-corpus/reports/combined-35f0027a/qualification-report.json`.
- At that commit, all **815 inference tests** and **58 CLI importer/native-command tests** passed. The preceding
  combined full CLI source run passed **1,041 tests**; the subsequent delta was only the two Docker evidence guards and
  their seven regressions. All **74 harness tests**, **44 init UI tests**, and full CLI/inference/UI typechecks passed.
- The reusable opt-in `pnpm --filter @stacktape/config-inference run test:docker-source-mapping` passed all **eight
  actual Docker cases**, checking absolute and relative source mapping against the files Docker produced. It uses
  trusted scratch images with no dependency downloads or running application code, and removes only its labeled objects.
  Log: `C:/Projects/qualification-reports/native-docker-source-mapping.log`.
- CLI committed-artifact generation checks, formatting, lint, instruction sync, workspace, pattern, architecture and
  secret checks passed. Final logs have the `final-` prefix under `C:/Projects/qualification-reports`.

These checks ran from native Windows tools with Docker Desktop; no WSL-native workspace was required. Import contracts
include intentional negative cases: a correct refusal to claim AWS readiness is a pass, not a successful deployment.

### Earlier review checkpoints

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

## Remaining unqualified behavior

JobDesk's independent review accepted `965c52cb`; the integration-specific ignore-policy and truncated-scan guards are
in `46a26ed2`. Both are merged. There is no pending repair or corpus adoption from this batch.

The source mapper is deliberately bounded. It does not certify arbitrary downloaded dependency hooks, base-image
behavior or application runtime correctness. Compose runtime `working_dir` overrides are not yet preserved by generated
packaging; that pre-existing limitation needs its own end-to-end case and fix. JobDesk does not use an override.

JobDesk's 29 native tests use in-memory stores and queues. Live PostgreSQL/Redis behavior, actual migration execution,
and process recovery remain unqualified; its Docker packaging now passes. Its source has no authentication or
transactional outbox; do not deploy it with real customer data. Preserve the complete source instead of simplifying it
to make tests pass. Vaultwarden's corrected Debian packaging also passes, but its runtime and live-AWS behavior remain
unqualified by this campaign.

## Environment limits and next execution order

The previous low-disk blocker eased during the morning continuation; the successful runs finished with about 13.6 GiB
free on C:. Recheck capacity before future builds and preserve a safety floor. No source cache, reusable project or run
report was deleted in this continuation. Docker-internal free space is not equivalent to host free space. Do not work
around a denied cleanup operation with a different deletion mechanism.

Next execution order:

1. Add controlled runtime checks for the packaged applications where they add new evidence, particularly JobDesk's real
   database migration and worker flow, or Vaultwarden's startup/persistence behavior. Do not repeat these package passes
   unless code, source or the relevant execution environment changes.
2. Finish the complete public gate and applicable runtime lane before release qualification. Extend Linux corpus
   coverage to adjacent source-link cases as capacity permits. Record environment and upstream failures separately from
   product defects.
3. Only then expand the corpus into a missing customer behavior from `candidate-backlog.md`; do not collect more
   variants of an already-covered hello-world application while known build failures remain.
4. Live AWS still needs the explicit disposable-account identity, region, credential mode, owner, API key and canary
   guard inputs described in [project qualification](project-qualification.md). No AWS deployment ran in this resumed
   session. Do not infer permission or target identity from available credentials.

The user requires at least 30% of the weekly allowance to remain. This continuation used a 40%-remaining stopping
threshold and observed about 49% remaining in recent local rate-limit telemetry. Read fresh telemetry before resuming;
do not infer remaining allowance from tokens or wall-clock duration, and account for other tasks sharing the limit.

Antigravity Flash 3.7 high was available for the morning runs. Grok 4.6 xhigh had supplied earlier research and blind
JobDesk source, but two new read-only diagnosis calls ended with `stopReason: cancelled` and no complete diagnosis; they
were not accepted as review evidence. The Opus CLI OAuth session was previously expired and was not retried here.
Recheck provider availability once when resuming. Follow the budget-sensitive worker rules in the work instructions; do
not silently move unavailable external work onto the reserved subscription.

# Config generation production-readiness plan

Date: 2026-08-17 · Status: **execution checklist**

This document turns the agreed direction in `CONFIG_GENERATION_STRATEGY_2026-08-14.md` into a release gate. It is not a
new architecture proposal. The product outcome is a healthy preview URL with minimal friction, not a structurally valid
configuration.

## Product bar

The primary user is an application developer with limited or moderate infrastructure experience. The flow is ready only
when the developer:

- understands what Stacktape found and the consequence of each decision without needing AWS terminology;
- gets sensible, reversible defaults and at most one ordinary question on the supported lane;
- can see when an existing resource is merely declared versus proven to be live;
- cannot start a knowingly broken deployment;
- reaches a healthy URL, or receives one concrete next action without losing work;
- never has repository secrets, agent-authored prose, or raw failure logs sent to telemetry or a hosted model.

## Fable handoff

These are the five remaining tasks in Fable 5's final handoff, updated for the current checkout.

| Task                                             | Current state                                                                                                                                                                                                     | Production evidence                                                                                                                                                                                                                                             |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Land the `pg`/esbuild buildpack fix              | Owned by the active packaging audit, which has expanded into a full packaging and synthetic-Docker hardening pass                                                                                                 | A plain Express + `pg` image starts and serves a request through the preferred Stacktape image buildpack; packaging-owned checks and runnable container fixtures pass                                                                                           |
| Make the real-deploy lane repeatable             | The guarded one-fixture-per-run runner and first four fixture contracts now exist; no run from this Windows checkout is permitted                                                                                 | A CI matrix executes the versioned AWS outcome subset through the wizard and the exact release binary, records first-attempt and one-repair outcomes, verifies the data plane, and cleans every owned resource after success, failure, timeout, or cancellation |
| Complete a human pass through the full wizard    | A files-only Express journey now covers analysis, review, configuration views, keyboard sizing, save, skipped preflight, narrow layout, and reload/reconnect; no costed deploy was started                        | A developer completes scan → review → local try-out → deploy on messy repositories in local-agent, files-only, and failure/repair paths; copy and consent are reviewed against the business documents                                                           |
| Untangle and commit the shared working tree      | Blocked while the importer and packaging tasks are active in the same checkout                                                                                                                                    | Separate public commits by responsibility, a separately reviewed private Console commit if needed, no accidental submodule pointer change, and green focused/public/integrated gates                                                                            |
| Build the Stacktape-hosted narrow-model fallback | Explicitly gated out of preview: preview offers local Claude Code/Codex or deterministic files-only analysis and makes no hosted model request. Still open before broad production if product chooses to offer it | Users without Claude Code or Codex can resolve eligible material gaps through snippet-only schema-constrained calls, with explicit privacy choice, timeouts, redaction, failure fallback, and category-only telemetry                                           |

Preview policy is therefore fail-closed and consistent with the current product promise: no hosted fallback exists and
no repository source is sent to Stacktape. Adding one is a later product/privacy decision, not an automatic degradation
path. It must be explicit opt-in and meet the evidence in the table before the broad-production label changes.

## Additional work required for production

### 1. Freeze the supported-lane contract and executable corpus

The strategy names the lane, but the release needs versioned fixture matrices rather than an informal list. They have
different jobs and must not be collapsed into one score:

- the **deterministic importer and safety corpus** cheaply covers syntax breadth, misleading declarations, prompt
  injection, unsupported shapes, and non-deployable repositories on every ordinary test run;
- the **local executable corpus** proves composition, schema validation, packaging, and preflight without mutating AWS;
- the smaller **real-AWS outcome corpus** spends money only where a live control-plane or data-plane result proves
  something the first two levels cannot.

Across those levels the matrices must cover:

- Next/Vite/static frontends;
- Node and Python HTTP APIs, including a worker;
- Postgres, MySQL, Redis, and object storage wiring;
- a monorepo with build-from-root behavior;
- migrations and generated secrets;
- Dockerfile ownership (custom versus boilerplate);
- Docker Compose, Render/Fly/Heroku, SAM/Serverless, SST, Terraform, and CDK declarations;
- unsupported or ambiguous cases that must stop safely rather than fabricate.

Each fixture owns semantic expectations for workloads, stores, wires, generated config validation, expected interaction
count, preflight result, deployability, and—where it reaches AWS—health response and cleanup. Importer syntax breadth
can grow independently; an SST parser case should not spend an RDS deployment merely to raise a fixture count.

The first AWS slice is deliberately high-information: a plain Express API, Express + Postgres + migration, Vite static
hosting, and FastAPI. It grows only when a new live fixture proves a distinct layer.

### 2. Separate three confidence levels

Tests and UI must distinguish:

1. **declared** — repository text says a resource exists;
2. **observed** — local execution or AWS inspection proves it;
3. **chosen** — Stacktape recommends creating or connecting it.

A declaration in SST, Terraform, CDK, or a PaaS manifest is not proof that the resource is currently deployed. This is a
safety and copy invariant, not only an importer implementation detail.

### 3. Exercise the released artifact, not only source modules

The release lane must test both the source-built CLI and an immutable preview binary selected by absolute path and exact
version—not a moving `preview` tag. The init process and its deploy child must re-invoke that same binary. It must
generate the config through the browser presentation of `stacktape init`, validate and package the written file using
`validate --thorough`, deploy, retrieve the exact composed resource's typed `url` parameter, and invoke it. Unit-level
composer or probe success is insufficient.

### 4. Prove safety and cleanup

Before release, automated negative cases must prove:

- prompt-injected repository text cannot reach user-facing copy or widen tool access;
- environment values and raw preflight/deploy logs do not leave the machine;
- missing Docker, agent, network consent, credentials, and account permissions fail clearly;
- existing databases are not replaced and ambiguous IaC declarations are not presented as live;
- cancellation, timeout, failed create, failed update, and failed repair all retain the correct rollback semantics;
- the real-AWS lane deletes owned stacks, generated secrets, log groups, and temporary local state, and refuses to
  delete anything without the exact run owner.

Generated database secrets are currently project-scoped (for example, `<project>.mainDatabase.password`) but are created
outside CloudFormation and have no run tag. The canary therefore proves each exact name was absent before the deploy,
records its ARN and creation time when it appears, checks the fixed `Generated by stacktape init` description, and
deletes only that recorded object. The CloudFormation stack uses the same absent-before rule plus an external 0600
recovery file. Its StackId is recorded as soon as the create becomes observable; after an abrupt stop before that write,
recovery may adopt only the exact reserved name with a creation time inside the run. Cleanup-only reacquires credentials
and revalidates the account, project, stage, region, fixture, owner, creation time, and any recorded StackId. The runner
also refuses a pre-existing recovery file or canary-prefixed log group; cleanup deletes only log groups with this unique
stack prefix whose creation time falls inside the recorded run. S3 buckets listed as resources of that exact stack are
emptied, including versions and multipart uploads, before CloudFormation deletion.

### Preflight coverage is an explicit matrix

`completed` is not synonymous with `passed`. The current engine can select only `web-service`, `worker-service`, and
`private-service`, at most two per run. It can build custom Dockerfiles and Nixpacks; the preferred
`stacktape-image-buildpack` is currently reported as skipped, and static hosting has no local runtime check. Required
fixtures fail the release lane on skipped, inconclusive, unavailable, empty, or failed results. Static-only fixtures
record `unsupported-resource-type` and rely on packaged validation plus their AWS URL; this result is never counted as a
preflight pass.

The product behavior is currently less strict: Deploy is blocked only by an observed service failure, so an unavailable
or skipped preflight still allows deployment. The UI now labels those services **Not checked** or **Inconclusive**, says
that AWS will be their first full run, and never counts that result as a pass. Whether broad release should require a
separate “deploy anyway” acknowledgement remains a product decision; the scorecard may not silently reinterpret it.

### 5. Make the browser journey a release gate

The wizard needs an actual browser-level path covering keyboard use, narrow viewport, reload/reconnect, idle timeout,
long-running SSE, sign-in/AWS recheck, failed analysis retry, local preflight consent, deploy gaps, partial-progress
warning, repair transparency, success launchpad, and explicit close. User-facing wording must explain application-level
consequences and avoid infrastructure jargon.

### 6. Add an operational scorecard and staged rollout

The existing `init_completed` categories are a foundation, not the rollout mechanism. Release owners need a scorecard
for supported-lane eligibility, agent invocation/skips, preflight outcomes, question count, deploy attempts, repair
count, time-to-healthy-URL, cleanup failures, and categorized corrections. It must contain no repository names, source
snippets, environment values, or log lines.

Preview rollout should start behind an explicit channel or feature flag, with a documented rollback path and thresholds
that stop expansion when safety failures or cleanup failures occur.

### 7. Publish honest support and recovery documentation

The CLI/docs must state the verified lane, privacy modes, Docker requirements for local try-out, what is sent for hosted
AI, what Stacktape creates in AWS, how partial deployments can bill, and the exact delete/retry path. Unsupported cases
must be named as such rather than described as successful analysis with hidden gaps.

## Release metrics

The non-negotiable safety and artifact gate is:

- zero phantom stateful resources, silent external-resource replacements, persistence-loss defaults, or secret leaks in
  the safety corpus;
- every supported deterministic fixture composes and validates, and every real-AWS fixture reaches its expected healthy
  data plane within at most one evidence-based repair;
- median mandatory questions of 0 and no more than 1 question for ordinary supported-lane fixtures;
- 100% owned-resource cleanup in the lane, including interrupted and failed runs;
- every generated configuration validates against the real schema; preflight outcomes keep separate passed, failed,
  inconclusive, skipped, and unavailable counts;
- source-built and preview-artifact runs produce equivalent topology and health outcomes.

Fable's ≥70% first-attempt and ≥90% within-one-repair goals remain the early-access operational targets. A 15–20 fixture
sample is too small and too correlated to present those percentages as product reliability. Report numerator,
denominator, files-only versus agent-assisted mode, and confidence interval from the start; use the percentages as a
rollout gate only after at least 50 independent eligible real repositories. The fixed fixture matrix remains a
regression gate, not a substitute for that population.

“Question” also needs one stable definition before this metric can gate release: a mandatory blocking answer is not the
same event as reviewing or reversing a visible default. Until that definition is chosen, record both separately.

## Current execution evidence and blockers

- `apps/cli/scripts/real-aws/init-canary.ts` now drives the loopback wizard API, writes YAML, runs packaged and
  CloudFormation validation with the same CLI selection, enforces fixture/preflight contracts, deploys, reads the typed
  URL, checks health, and cleans by recorded identity. It refuses Windows, implicit credentials, endpoint overrides,
  missing recovery state, unsafe names, a reused stack, and pre-existing generated secrets.
- Four small source fixtures and semantic contracts exist under `apps/cli/_test-stacks/init-canary`. The guarded client,
  fixture, state, URL, and preflight tests run in the ordinary command-safety suite.
- A local files-only run found that a Procfile by itself was described as a live Heroku deployment and that the Postgres
  service did not always receive its `DATABASE_URL`. The importer workstream owns both regressions.
- Express and FastAPI correctly compose to the preferred Stacktape image buildpack, but that packaging type is skipped
  by preflight today. The runner stops before spending AWS money rather than treating the skip as success.
- A human browser pass completed the files-only Express path through save and optional local verification. It exercised
  all three configuration views, keyboard sizing, a 390 px viewport, reload after the one-time handshake, and the
  deploy-account/cost/public-address copy. It found and fixed unsafe partial deploy/delete commands, literal formatting
  in accessible help text, an empty top-level lede, and a skipped check that looked like a weak pass.
- An independent Grok 4.6 xhigh review found two additional release blockers. Action failures now remain in the live
  document instead of replacing it with an unrecoverable “Session ended” page. More importantly, both UI and server now
  refuse paid deploys for a known undeployable composition, a pending/rejected AWS identity, or a missing Stacktape
  sign-in. Direct requests are covered, not only the disabled button.
- A consented local try-out now keeps the loopback server alive even with its page closed. Preflight repair receives
  structured reasons and missing-variable names but no raw container log tail; that log can contain runtime secrets the
  source-reading consent did not authorize sending to an agent.
- The local-run consent now distinguishes the image build—which may download dependencies and execute install hooks—from
  the started container, which receives stubs and has no network. The event stream names a broken connection while the
  browser retries instead of silently freezing. Explicit CLI shutdown stops the active deploy child, while the spend
  screen warns that interrupting a local watcher cannot undo work AWS has already accepted.
- A successful deploy no longer turns URL-looking build or application output into a clickable “Live now” link.
  Repository-controlled output is untrusted; the CLI now resolves only each composed public resource's typed `url`
  parameter from the exact project/stage/region target, accepts HTTPS, bounds and times out the lookup, and sends only
  those URLs to the page. The detailed terminal result payload is stripped from browser state. Regression tests cover
  attacker-controlled log URLs, non-HTTPS values, hung lookups, and result-data redaction.
- A paid deploy is now bound to an observed CloudFormation identity rather than to a generic browser confirmation. The
  first click is read-only and runs the same CLI binary in a target-check mode, so account/profile selection is the one
  `deploy` will actually use (including Stacktape-connected accounts), not merely the ambient Node credential chain. The
  page names the exact account, region, stack name, status and create-versus-update action. Foreign, identity-
  mismatched, incomplete and unsafe-status stacks are blocked. A second click carries create consent or an update tied
  to the exact StackId. The mutating child snapshots that expectation before authored TypeScript config can execute,
  then describes the target with its selected credentials before config loading, dependency installation, hooks, or AWS
  mutations; it checks again before secret creation. Existing-stack CloudFormation mutations use the approved StackId
  ARN rather than the reusable stack name, so a same-name delete/recreate race fails closed. The observation also binds
  consent to the SHA-256 of the exact authored config bytes: a change between review and confirmation returns to review,
  and the deploy child verifies the digest before config execution and again before secret mutation. Concurrent checks
  and wizard configuration changes invalidate both the observation and any previously written config file, and an
  expectation mismatch is never sent to an agent repair loop. The server requires the exact target to have been
  published before a create/update confirmation; a crafted one-step POST becomes only the read-only check. The
  expectation transport and mutually exclusive check/deploy child environments have direct regression coverage.
  `ROLLBACK_COMPLETE` is blocked because a failed-create stack permits deletion, not update. Multi-account organizations
  can pin the account with `init --awsAccount`; that name reaches the check, deploy and typed URL children.
- Generated database secrets now run inside the deploy child, after the mutation-time target assertion and with the same
  selected AWS credentials. This removes an ambient-credential write before confirmation. The canary's absent-before and
  cleanup ownership now tracks the Secrets Manager name the CLI directive actually resolves. The inference workstream
  has made the composer contract explicit as one dot-free, project/resource-scoped secret name plus the `password` JSON
  key; regression coverage resolves the emitted directive through the CLI grammar rather than assuming its shape. Canary
  preflight, recording and cleanup now share one project-prefix predicate, and the paid lane checks the authoritative
  deploy child's account/region/name in addition to its own ambient cleanup credentials.
- The full local upstream-project corpus currently passes 19/19 repositories with 210 semantic assertions and real
  schema validation on every generated config. It includes the Procfile-only false-live-deployment regression and the
  NestJS migration/generated-password contract. This is deterministic evidence, not the 50-repository independent
  population needed for the operational reliability percentage.
- The packaging workstream independently exercised real Docker/runtime artifacts across the supported language, Lambda,
  native-layer and framework paths. Its final release-required packaging E2E matrix passed; this closes the original
  Postgres/esbuild/buildpack blocker locally, while the guarded AWS init lane remains unrun on this Windows host.
- Init telemetry now records measured deploy wall time and separate passed, failed, inconclusive, and skipped service
  counts. A mixture of passed and skipped services is reported as inconclusive, never as a pass. A regression fixture
  proves repository names, paths, resource names, reasons, and log contents are absent from the event.
- The production UI build currently warns about large chunks: approximately 1.95 MB for the main JavaScript and 1.17 MB
  for the lazy diagram chunk before gzip. Loopback delivery hides network latency, but installer/binary size and startup
  cost need a measured budget before release rather than dismissing the warning by configuration.
- The checkout is on Windows, and the real-AWS guardrail intentionally requires Linux or macOS. AWS evidence must come
  from WSL-native credentials or the protected OIDC matrix, never by weakening that guard.

The local browser fixture now also proves the read-only target check → exact absent-stack/account/region → separate
create confirmation journey, without clicking the final action. The remaining browser evidence is agent-assisted
analysis, no-credentials/recheck, failed-analysis recovery, a real preflight pass/failure, deploy repair and
partial-progress copy, success handoff, idle behavior, and explicit close. SSE reconnect state is implemented and
unit-typed but still needs a browser-level disconnect/recovery gate. The real deploy portions belong in the guarded AWS
lane; they must not be simulated into a “passed” human run.

## Execution order

1. Let the active importer and packaging tasks close their owned blockers; consume their verified results, not partial
   assumptions.
2. Build the guarded init release-lane runner and fixture contract without changing importer semantics.
3. Add browser-level wizard coverage and perform a human UX pass.
4. Run the local corpus, then the authorized real-AWS subset from a supported host; fix failures and grow only where a
   new fixture proves another live layer.
5. Implement or explicitly gate the hosted-model fallback and verify privacy/telemetry behavior.
6. Separate commits only after concurrent writers stop, then run focused checks, `check:public`, and `check:integrated`.

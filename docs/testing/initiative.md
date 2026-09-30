# Repository testing and QA initiative

This is the execution plan for improving Stacktape's regression protection across the public repository and private
Console. It builds on the [strategy](strategy.md), [E2E helper design](e2e.md) and [74-slice catalog](slices.md). It
does not start the overhaul by itself.

The objective is reliable customer behavior, useful failure diagnosis and inexpensive repeatable verification. Test
deletion, test count and the percentage called E2E are not success metrics. A slice may keep most of its existing tests
after a careful review. Use MiniStack where its qualified behavior adds value; do not translate every AWS mock into an
emulator test.

## Shape of the initiative

Use 74 initial behavior slices, refined before dispatch. A slice owns one coherent outcome and its regression tests; it
can cross packages and UI/API/worker boundaries. Stable type, naming and calculation contracts remain useful slices
without forcing them into a browser. Some large families will need smaller assignments after discovery.

Build shared infrastructure separately, with one owner. A worker consumes the fixtures supplied at its baseline and
proposes missing capabilities; it does not independently redesign global fixtures, manifests, CI or the testing policy.
The coordinator integrates those changes once and updates dependent assignments.

Keep the normal [testing policy](../testing.md) short. The catalog and this plan are for coordinators; a slice worker
receives only its task packet, the policy, relevant local instructions and links to the procedures it needs. Improve the
guide as pilots reveal reusable lessons, rather than expanding it with every slice's history.

## Phases and decision points

| Phase                      | Work                                                                                                                                                                        | Ready to advance when                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 0. Establish scope         | Verify the catalog against entrypoints, manifests, tests and consumer edges. Record current public/private revisions, known baseline failures and existing useful commands. | Each pilot has a reviewed behavior contract, bounded write scope and runnable baseline. Existing unrelated changes are preserved. |
| 1. Prove the foundations   | Extend existing process, browser, PostgreSQL and MiniStack helpers only far enough to support the four pilot tasks below.                                                   | Each helper has a real consumer, bounded readiness, independent state and verified cleanup, including failed setup.               |
| 2. Review the first batch  | Implement and independently review small assignments using GPT-6.1 Sol and the existing fixtures.                                                                           | Scenarios prove their customer outcome and relevant failures; retained and removed protection has been reviewed.                  |
| 3. Calibrate a small batch | Integrate the reviewed first batch and process 4–6 fresh slices with the proposed assignment/review policy.                                                                 | New work remains good after review and integration; reviewer repairs and fixture churn fit the estimated budget.                  |
| 4. Expand by dependency    | Run independent slices in bounded batches. Revisit shared helpers and selection only between batches.                                                                       | Each batch passes focused checks and the relevant integrated gate at its merged revisions.                                        |
| 5. Qualify the result      | Audit uncovered edges, run cross-slice journeys, selected live checks and release-artifact coverage. Measure the resulting local and CI loops.                              | Completion criteria below are met; blocked product bugs and unverified external promises are not silently counted as done.        |

Do not spend the initiative's whole budget on independent rewrites before seeing the first integrated batch. Estimate
remaining cost from accepted pilot work, including discovery, rejected attempts, review, repair, builds and integration.
Reserve capacity for those activities and final qualification; authoring is only part of the work.

## Foundation work

These are shared deliverables, not seven new packages or seven new frameworks. Start with the existing helpers linked
from [E2E implementation](e2e.md#helper-design).

| ID  | Deliverable and first consumers                                                                                                                                       | Completion check                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Command/coverage map and baseline selection; all slices. Expose existing feature DB lanes, identify duplicate CLI execution, preserve current gates.                  | A task can name exactly which behavior its command runs; public checks work without Console. New selection is checked against broad runs before replacing them. |
| H2  | Owned project/process/artifact fixtures; S06, S19, S32, S34, S72. Reuse qualification process and Lambda helpers.                                                     | A fresh project runs with explicit environment, bounded readiness and cancellation; failures dispose its child tree and temporary resources.                    |
| H3  | Synthetic Playwright app/gallery fixture; S39, then S07/S37/S38. Keep real components/CSS and independent browser contexts.                                           | One meaningful interaction runs alone, repeatedly and beside another case; failure artifacts contain synthetic data only.                                       |
| H4  | Pinned MiniStack SDK fixture; S33 first. Reuse the existing S3 acceptance runner and expand service coverage only on demand.                                          | Actual SDK requests reach owned loopback endpoints, service effects are asserted, unexpected/live endpoints fail closed, and cleanup is verified.               |
| H5  | Console PostgreSQL, identity and HTTP fixture; S43, S54/S55. Reuse incident-agent bootstrap, align the database major version and retain migration-adoption coverage. | Actual router/verifier/SQL pass allowed and denied requests with independent tenants; no developer credentials or shared-dev database are needed.               |
| H6  | Isolated Console browser application; S55 first. Reuse H3/H5 with a synthetic Amplify session fixture.                                                                | Browser action survives API reread and reload; a second tenant is denied; two cases can run concurrently and leave no owned state after failure.                |
| H7  | Narrow provider-event and job-observation fixtures; S48–S51, S56/S63. Reuse existing loopback providers before extracting common code.                                | Actual ingress/consumer code handles duplicate, failed or delayed work with bounded observation of committed terminal state.                                    |

H1 is the starting point. H2–H4 can progress independently when their write scopes do not overlap. H5 precedes H6; H7
follows its first concrete workflow. Initial helper qualification should test plumbing and isolation, leaving the
pilot's feature assertions for the candidate workers. Record helper revisions in task packets. Repair a broken fixture
before accepting results from its consumers, then rerun the affected checks.

Start with helpers already needed by the selected slices. The shared-UI gallery, MiniStack S3 acceptance and isolated
Console issue workflow already exist; extend them only when a concrete consumer needs more. Account for foundation work
separately from slice work, since its cost is shared across actual consumers.

The infrastructure owner may make narrowly reviewed startup/configuration seams needed for real tests. Preserve
production behavior and package boundaries. Feature workers should not refactor product code merely to make assertions
easier or fix product bugs within this initiative's test-only assignments.

### Discover helper needs before a rewrite batch

Every slice needs a runnable test boundary, not necessarily a new helper. Naming and other pure contracts can be ready
with their existing package command. Before dispatching a batch, inspect its real entrypoints and have bounded discovery
workers try one representative setup using the available fixtures. Start with the pilot families; do not send all 74
slices to redesign their test infrastructure independently.

A worker that needs a missing capability returns a compact request in its task handoff:

```text
Slice and customer behavior:
Existing helper/command tried, exact failure or repeated setup cost:
Smallest needed capability, with a concrete proposed test call:
Real boundary/state it must preserve; setup, observation and cleanup needs:
Required for this slice or optional convenience; other known consumers:
```

Distinguish missing infrastructure, unclear product behavior, a product bug, and unfamiliarity with an existing helper.
Do not solve missing infrastructure by mocking away the boundary under test. The coordinator consolidates requests by
capability, prioritizing blocked meaningful tests and repeated setup work. One strong-model infrastructure owner builds
the smallest useful implementation with its first real consumer; a second consumer is needed before inventing a shared
package or general-purpose abstraction. Workers may continue independent parts of their slice while a request is open.

Qualify each helper through the consumer's real boundary: observe the expected state/bytes, a legitimate denied or
failed operation where applicable, independent repeated/concurrent runs, and cleanup after failed setup and failed
assertions. Check that it cannot silently select live endpoints or bypass the behavior it promises to exercise. Record
the helper's supported scope, focused command and limitations in its owning procedure, with one small working example.
Keep qualification results in the ignored queue. A helper that starts successfully is not yet proof that its tests are
meaningful.

Freeze qualified helpers in each batch's task packets. Feature workers propose improvements instead of editing shared
fixtures independently. The owner integrates accepted requests between batches and reruns affected consumers. If a
broken helper invalidates a scenario, repair the fixture and rerun affected consumers before accepting the slice. This
feedback loop continues during the migration, so all future helpers need not be designed before the first small batch.

## Implementation and review

Use **GPT-6.1 Sol** for slice implementation and independent review, as agreed for this overhaul. Record the actual
model and harness configuration in the task packet. A model tournament is not a prerequisite; compare alternatives only
when the owner requests one.

The reviewer receives the behavior contract, baseline, patch and verification results in a fresh context. It inspects
real consumers and effects, checks that removed tests retain their unique protection, and identifies assertions that
would pass despite a broken implementation. Author/reviewer agreement and test count are not acceptance evidence.

For authorization, tenant isolation, deployment identity, retention and other high impact behavior, verify a small
relevant fault through the real boundary when practical: for example, remove a tenant predicate or reuse a stale
artifact in a temporary copy and confirm that the scenario fails. Do not commit deliberately broken product code or
require a universal mutation score. A fault check must reach the intended assertion; a compiler or fixture failure is
not proof that the behavior is protected.

### Four representative tasks

These are bounded assignments within catalog slices, not a demand to rewrite the whole family in a first batch.

| Pilot    | Scope                                                                                                                                 | What the first batch should establish                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| P1 / S03 | Stable names/logical IDs: review and improve a bounded naming contract. Keeping already-good tests is an acceptable result.           | Stable identity contracts remain protected by focused compatibility cases.                                    |
| P2 / S39 | One real shared control, preferably a dialog: open/close, keyboard dismissal, focus restoration and disabled behavior where promised. | Real browser interactions and independent setup cover the control contract.                                   |
| P3 / S33 | Layer upload/reuse and retention around a changed layer, using the qualified MiniStack S3 path.                                       | Real SDK requests, stored bytes and retention state cover success and controlled failure.                     |
| P4 / S55 | Issue-state change through browser → HTTP → PostgreSQL, persistence after reload and cross-tenant denial.                             | Restricted identities exercise real authorization and persistent state through the browser/API/database path. |

Use these existing fixture families for the first bounded batch, then process 4–6 fresh slices before expanding. Keep
setup, review, repair and integration in the cost estimate. Measure focused latency and instability to improve the
working loop; usage accounting and model benchmarking are optional task-specific work.

## Dispatching and integrating slices

One coordinator owns the dependency map, write leases, bug queue and integration branch. Each active worker owns one
bounded assignment. Use Codex/Claude-provided isolated workspaces; do not add repository worktree lifecycle scripts.
Choose the batch size from available agent and machine capacity, reserving capacity for independent review. Run fewer
authors when builds or database/browser workers compete for resources. Do not dispatch the entire catalog at once.

Prepare this compact packet just before dispatch, after inspecting that slice:

```text
Slice ID and objective: customer outcome and important forbidden outcomes.
Baseline: public SHA, private SHA if needed, helper revisions, known unrelated failures.
Read first: full business context required by AGENTS, short testing policy, nearest AGENTS/manifest,
            3–8 source/test entrypoints. Reuse business context already read in this session.
Contract: success/failure invariants and cross-slice edges; distinguish decisions from assumptions.
Write scope: exact test/fixture paths; shared files reserved to infrastructure owner.
Available helpers and commands: focused command, needed services, relevant final gate.
Work: understand the implementation and consumers; keep/improve/replace tests by behavior.
Limits: no product fixes, nested agents, blanket skips or unowned external resources.
Acceptance: required outcomes, independence/cleanup checks and removal review.
Handoff: patch, checks/results, removed protection mapping, bugs, unresolved gaps, usage if available.
```

This is coordination for a large migration, not a new report requirement for ordinary development. Let the worker read
additional code on demand. It must inspect real callers and effects, not infer the contract from old tests alone.
Resolve ambiguous behavior from product/source documentation and maintainer decisions before freezing it in assertions.

Before a deletion is accepted, identify the behavior each removed group protected and where it remains covered, or why
it is obsolete. A concise mapping in the review is enough; do not create a permanent document per deleted test. Removing
mock choreography is useful only if meaningful failures remain observable. Review changed test selectors, skips,
timeouts and snapshots as carefully as added assertions.

Only one owner changes shared helpers, dependency manifests, generated inputs or CI configuration at a time. Other
workers propose a small request and continue independent work. Integrate small patches at a known base, refresh
downstream assignments when shared contracts change, and rerun affected consumers after conflict resolution. Private
Console changes and the public pointer follow the repository's existing two-repository sequence.

Run focused checks in workers. Run the applicable public/integrated gate and affected extra lanes on the combined
revision before accepting a batch. A passing isolated branch is not proof that two patches compose. Keep live mutation
serialized under the existing shared-dev reservation; isolated API/browser suites become the routine path only after
their harness is qualified.

## Product bugs discovered during testing

Keep these separate from test maintenance, as requested. A worker records a minimal reproducer, expected versus actual
behavior, exact revisions, affected scope and a test patch. First rule out fixture mistakes and an incorrect assumed
contract. The coordinator verifies the finding and routes it to a separate product-fix session.

Preserve the failing regression on its task branch or attached patch. Keep existing protection until a replacement is
ready. Unaffected improvements can integrate separately; the blocked test waits for the product fix, then becomes an
ordinary passing regression. Do not make the main gate permanently red, assert the buggy behavior as desired, or mark
the new case skipped merely to call the slice complete.

Use `blocked-product-bug` for the affected work, with a precise next action. This is a status in the initiative queue,
not an instruction to mark a Codex goal blocked. A verified discovery is useful work, but the slice is not fully
accepted until the fix session and regression meet the intended contract. Keep private source, credentials and customer
data out of public bug records.

## Durable progress across sessions and limits

Use an existing issue/task system if available; otherwise keep one small ignored queue under
`.stacktape/qa-initiative/`, with patches retained in the owning workspaces/branches. The coordinator is its single
writer. Record slice ID, state, owner, attempt identity, the frozen task packet/write scope, base/patch revisions,
dependencies, next action, checks and bug references. Use `planned`, `ready`, `running`, `review`, `accepted`,
`blocked-helper` and `blocked-product-bug` consistently.

For a prerequisite, record who can satisfy it and what remains forbidden until then. Checkpoint at slice boundaries,
before handoffs and before stopping for usage limits. Include owned process/container/resource IDs and cleanup state
when they exist. Stop launching new work early enough to finish cleanup. A queue file in one ignored workspace is not
portable: a cross-machine/provider handoff must explicitly transfer the minimal state and patches through an approved
private location. Do not rely on conversation memory or shared access to an uncommitted checkout.

On resume, reconcile every `running` or `review` entry against actual agent/process and workspace state before
redispatch. Verify public/private/helper revisions and the patch, identify still-running owners, and recover or dispose
their owned resources using the existing procedures. Do not reassign a write lease while its earlier worker may still be
editing, or steal a shared-dev reservation because a session ended. Re-establish exclusive ownership, then select the
next action. Results from changed inputs require the affected checks again; a checkpoint is not a fresh pass.

Versioned documentation owns policy, task boundaries and reusable procedures. Per-run scores, logs, usage and completed
task history stay in the task system or ignored artifacts. There is no need to load all of them into each worker.

## Completion

The initiative is complete when every retained slice has an accepted disposition, its meaningful outcomes have named
automated coverage, removed tests have not lost unique protection, and the relevant commands are discoverable in CI.
Critical cross-slice journeys must pass on the integrated public/private revision, with selected live qualification for
external contracts and supported release/runtime coverage. Known product bugs that prevent those outcomes remain
explicit blockers unless the owner deliberately removes that scope from the goal.

Compare before/after focused latency, broad CI critical path, first-attempt instability, setup cost and review effort.
Use those measurements to judge the result alongside defect detection. Preserve a small manual exploratory pass for new
UX and confusing errors: automated assertions cannot establish that a workflow is understandable. Fold reproducible
findings back into the appropriate slice.

Start by validating the first slices against the resulting architecture and running a small independently reviewed batch
with the available fixtures. Expand after the integrated results establish useful coverage and repeatable setup.

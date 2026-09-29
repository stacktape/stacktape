# Repository testing and QA initiative

This is the execution plan for improving Stacktape's regression protection across the public repository and private
Console. It builds on the [strategy](strategy.md), [E2E helper design](e2e.md) and [74-slice catalog](slices.md). It
does not start the rewrite or a model benchmark by itself.

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

| Phase                      | Work                                                                                                                                                                        | Ready to advance when                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 0. Establish scope         | Verify the catalog against entrypoints, manifests, tests and consumer edges. Record current public/private revisions, known baseline failures and existing useful commands. | Each pilot has a reviewed behavior contract, bounded write scope and runnable baseline. Existing unrelated changes are preserved.   |
| 1. Prove the foundations   | Extend existing process, browser, PostgreSQL and MiniStack helpers only far enough to support the four pilot tasks below.                                                   | Each helper has a real consumer, bounded readiness, independent state and verified cleanup, including failed setup.                 |
| 2. Compare models          | Run independent, paired attempts using frozen tasks and helper versions. Grade behavior and defect detection before comparing cost.                                         | At least one configuration meets the quality bar for each class being delegated; uncertainty and unavailable models remain visible. |
| 3. Calibrate a small batch | Integrate the selected pilot work and process 4–6 fresh slices with the proposed assignment/review policy.                                                                  | New work remains good after review and integration; reviewer repairs and fixture churn fit the estimated budget.                    |
| 4. Expand by dependency    | Run independent slices in bounded batches. Revisit shared helpers and selection only between batches.                                                                       | Each batch passes focused checks and the relevant integrated gate at its merged revisions.                                          |
| 5. Qualify the result      | Audit uncovered edges, run cross-slice journeys, selected live checks and release-artifact coverage. Measure the resulting local and CI loops.                              | Completion criteria below are met; blocked product bugs and unverified external promises are not silently counted as done.          |

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
pilot's feature assertions for the candidate workers. Freeze helper revisions during model comparison. Fixing a broken
benchmark fixture requires rerunning affected attempts against the same repaired baseline.

Prepare H2/H3 first and run the inexpensive P1/P2 screen as soon as they are ready. Build H4–H6 only as needed before
P3/P4; the first model comparison should not wait for a complete Console harness or all seven foundation deliverables.
Account for foundation work separately from candidate authoring, since its cost is shared across the initiative.

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
broken helper invalidates a model comparison, repair the baseline and repeat the affected attempts fairly; do not grade
the model on missing or misleading infrastructure. This feedback loop continues during the migration, so all future
helpers need not be designed before the first small batch.

## Model comparison

Start with the user's named candidates: **GPT-6 Luna, GPT-6 Sol, Claude Sonnet 5.5 and Claude Opus 5.5**. Treat each
model, reasoning setting, speed tier and agent harness as one configuration. Use an explicit `medium` setting initially
where supported; record the actual accepted setting. A higher-effort retry is a separate configuration with its own
cost, not a silent repair of the original result. Evaluate author and reviewer roles separately, then compare complete
workflows; a good author is not automatically a reliable reviewer.

Sol and Luna are exposed by the current subagent tool. Claude Code is installed, but account access to the exact Claude
identifier must be verified before each new configuration. A CLI being present or exiting successfully does not
establish that the requested model produced a usable patch. Record requested/resolved identifiers when exposed; do not
silently substitute a model or switch subscription work to billed API requests when a limit is reached.

OpenAI recommends comparing the same inputs and retaining the lightest configuration meeting the quality bar. Anthropic
documents Opus 5.5 as a long-running coding model. These establish sensible candidates, not a winner for this
repository. [OpenAI model selection](https://developers.openai.com/api/docs/guides/model-selection),
[Opus 5.5](https://platform.claude.com/docs/en/models/opus-5-5/overview).

Include [Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5) in the same frozen author screen, including when it is
added after earlier candidates finish. Do not give a late entrant earlier reviews, improved test expectations or newer
helpers without repeating the affected comparison. Avoid a tournament of every available model and pairing.

### Four representative tasks

These are bounded assignments within catalog slices, not a demand to rewrite the whole family in a benchmark run.

| Pilot    | Scope                                                                                                                                 | What the comparison should reveal                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| P1 / S03 | Stable names/logical IDs: review and improve a bounded naming contract. Keeping already-good tests is an acceptable result.           | Whether a model preserves compatibility and recognizes when focused tests are the right choice; no reward for gratuitous edits. |
| P2 / S39 | One real shared control, preferably a dialog: open/close, keyboard dismissal, focus restoration and disabled behavior where promised. | Whether the model replaces weak markup assertions with useful browser interactions and independent setup.                       |
| P3 / S33 | Layer upload/reuse and retention around a changed layer, using the qualified MiniStack S3 path.                                       | Whether it follows real SDK/artifact boundaries, asserts bytes/state and preserves useful controlled failure cases.             |
| P4 / S55 | Issue-state change through browser → HTTP → PostgreSQL, persistence after reload and cross-tenant denial.                             | Whether it understands the product contract, uses restricted identities, and keeps authorization/persistence real.              |

Run P1/P2 on all four candidates: **eight authoring attempts**. Advance up to two qualified candidates to P3/P4: four
more attempts. Repeat a difficult task once with each finalist from a fresh context to detect obvious instability: up to
**14 initial authoring attempts**, plus independent reviews. If only one qualifies, compare it with a stronger reference
on the hard tasks before broad deployment. This is a practical screen, not statistical proof of reliability. Poor
results should trigger a diagnosis of scope, fixtures and instructions before spending on more attempts.

Freeze the advancement rule too: retain the highest-quality qualifying configuration and the most efficient plausible
alternative, using review/repair effort and the weaker of its two task scores. Prefer measured subscription use; label
price-based estimates explicitly and do not claim a cheapest configuration when those measurements are unavailable. If
they are the same, advance the next efficient qualifier as well. If the cheaper finalist fails a hard task, give an
excluded qualifier that task before concluding that the expensive configuration is necessary. These rescue attempts
extend the initial screen and need an explicit bounded allocation. Retain each model's qualification by task class;
success on naming/dialogs alone does not qualify it for database authorization or deployment semantics.

For a fair comparison:

- Give each candidate the same source and helper revisions, task packet, acceptance contract, readable files, browser
  capabilities and permissions. Use independent workspaces/contexts; do not reveal other candidates' patches or reviews.
- Provide required session context consistently. A coordinator may attach the full business documents, root/local
  instructions and short policy as a revisioned private packet, avoiding repeated discovery and incomplete `head` reads.
  Keep private material out of public artifacts. Relevant longer procedures stay on demand. Verify the promised runner,
  browser, formatter and linter are available before dispatch; a changed packet/tool baseline is a new comparison.
- Freeze a per-task time/tool/usage envelope before running it. Calibrate the envelope with the baseline and task size;
  do not declare the cheapest model successful merely because an incomplete attempt consumed little.
- Disable nested delegation in authoring attempts. Otherwise a small model can hide the cost and contribution of a
  larger one. Inspect and record the selected model and harness configuration.
- Keep the first attempt immutable. Allow at most one bounded repair round with equivalent review detail, and report
  first-pass and repaired outcomes separately. Frequent coordinator rewrites are a failed delegation policy.
- Separate cold installation/build costs from warm execution. Do not rank execution speed while one candidate competes
  with unrelated Docker builds on the same machine. Different Codex/Claude harnesses mean this evaluates the practical
  workflow, not model intelligence in isolation.
- Count writer, reviewer, repair and integration usage. Subscription allowance, API dollars and wall time are separate
  measures; do not infer subscription consumption from API price tables. Where exact usage is unavailable, label it
  unknown and retain elapsed time, turns, repairs and observed allowance changes with their measurement limits.

[Codex usage guidance](https://learn.chatgpt.com/docs/pricing) explains that included limits depend on the product and
workload. Use the actual account's usage display at execution time; do not promise a fixed number of slices per reset.

### Subscription efficiency

Optimize accepted, maintainable slices per available allowance. Keep Codex and Claude consumption separate: they are two
budgets with different windows, not interchangeable API dollars. Count discovery, authoring, reviews, failed attempts,
repairs, coordinator work and integration; also record wall time and unresolved defects. Measure cold setup separately
from steady-state runs, and amortize shared helper work across its actual consumers.

Capture available usage bars and reset times before and after comparable batches. Record other active sessions,
rounding, delayed updates and resets; a whole-account percentage change is not attributable to one model when other work
ran concurrently. Preserve raw token counts, cache categories, model/effort/tier and the date of the price table.
Compute API-equivalent cost as a secondary estimate using those categories, not only output tokens or a model's input
price. Mark unknown cache-write TTL or unrecognized model pricing instead of trusting a CLI dollar total blindly.

Do not assume an exact subscription-to-API conversion. OpenAI explicitly distinguishes included limits from credit
prices, and Claude separates its local list-price estimate from plan-usage reporting.
[Codex pricing](https://learn.chatgpt.com/docs/pricing),
[Claude usage reporting](https://code.claude.com/docs/en/costs). Use API prices for a sensitivity comparison when exact
allowance attribution is unavailable, then confirm the proposed workflow against actual subscription usage in the fresh
calibration batch. A combined workflow can be useful because it shifts work away from the allowance that runs out first,
even when its API-equivalent total is higher.

### Test reviewers and author/reviewer combinations

The initial proposed combination is **Sonnet 5.5 author → Luna reviewer**. Test its reviewer before granting it approval
authority. Give fresh reviewer contexts an anonymized mix of actual flawed submissions and acceptable controls,
including lost regression protection, assertions that never exercise their claimed behavior, and realistic boundary
failures. Reviewers receive the original contract and source, not earlier grades, author identity or the answer key.
Freeze expected findings from independently reproduced behavior before running the calibration. Valid new findings
remain welcome; the key is not a whitelist of possible defects.

Measure material defects caught and missed, unsupported blocking findings, actionable feedback, review effort, and the
quality of the author's repair. A verbose review, agreement with another model, or a successful test run is not a
success metric. A missed material defect disqualifies that reviewer configuration as the sole approver for that task
class until a changed configuration passes fresh calibration. Small samples establish limits, not a universal ranking.

Reuse the same frozen author output to compare reviewers. For a promising pair, fork that output into independent repair
attempts with only the respective reviewer's feedback and the same repair budget. Freeze both results and have the
strong evaluator check them against held-back runtime faults and the product contract. The evaluator is the reference
used to measure the pilot; if it must run on every eventual slice, include that ongoing cost in the workflow. Do not
report a cheap reviewer as sufficient when a hidden stronger review is doing the acceptance work.

Start with the requested pair and a stronger-review reference. If cheap review misses material issues, compare a
qualified author with a stronger reviewer, or a cheaper author with stronger review, based on the constrained budget.
Advance at most two complete workflows to the difficult tasks and fresh repeats. Keep readability within the existing
maintainability score: direct scenarios, useful names, clear assertions/failures, small justified helpers and ease of
changing a requirement. Judge anonymized code; provider preference or shorter output alone does not establish quality.

Before broad dispatch, freeze a routing policy by task class, the required reviewer and escalation triggers, and the
qualified helper version. Authorization, tenant isolation, deployment identity and destructive operations retain strong
review until that specific delegation policy is qualified. Recheck the policy on 4–6 fresh slices; ongoing samples and
failed checks can trigger stronger review or a smaller batch without restarting a model tournament for every slice.

### Grading

First apply mandatory conditions: correct scope, no weakened product contract, no lost unique regression protection,
real execution at the required boundary, fail-closed external access, repeatable setup/cleanup, and honest results. A
test that passes by bypassing auth, skipping the broken behavior, swallowing errors or replacing the subject with a mock
fails regardless of its score. A confirmed product bug follows the separate workflow below.

Then score each dimension from 0 to 4: absent/wrong, major repair, partial, acceptable, strong. Multiply by its weight.
The score organizes review; it is not a probability of correctness.

Use concrete acceptance failures before small score differences. Check reviewer consistency against anonymized anchor
cases; retain the original assessment and explain any rubric correction. A few subjective points are insufficient to
rank configurations when findings and verification are equivalent.

| Dimension                    | Weight | What earns a strong score                                                                                                            |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Behavior and risk coverage   | 30%    | Correct customer outcomes, meaningful failure cases, preserved contracts and explicit external limits.                               |
| Defect detection             | 25%    | Detects the reviewed historical regressions or held-back fault changes for the right reason; healthy behavior still passes.          |
| Test design and isolation    | 20%    | Real collaboration across relevant boundaries, independent state, useful assertions, deterministic execution and cleanup.            |
| Maintainability and feedback | 15%    | Small understandable scenarios, appropriate fixture reuse, no unnecessary abstraction, useful failure output and reasonable runtime. |
| Delivery discipline          | 10%    | Focused reproducible patch, correct commands/CI selection, justified removals and precise bug handoffs.                              |

Use **85/100 with all mandatory conditions met** as the initial acceptance threshold. Freeze it before candidate runs.
Also require at least 3/4 in behavior coverage, defect detection and isolation; a high score elsewhere cannot hide a
weak core dimension. Classify results by task type instead of averaging a serious authorization miss away with easy
naming work.

The reviewer receives the original contract and patch without the model's identity or self-assessment when practical. It
traces assertions back to production behavior and independently executes relevant checks. Before seeing candidate
results, prepare a few valid held-back faults per pilot: for example, remove a tenant predicate, reuse a stale artifact,
or break focus restoration. Validate that each fault actually violates the agreed contract; discard equivalent or
unreachable mutations. Apply them only to an isolated review copy, never the shared working tree. A compilation error
alone does not show that a behavioral assertion detects a runtime defect.

No universal mutation-score requirement applies to every future test. Use these checks to calibrate the benchmark and
for high-risk replacements. Check healthy runs, repeated clean runs and known failures. The accepted implementation may
be the existing suite, one candidate's patch, or a reviewed combination; comparison scores refer to original attempts.

For the next bounded batch of test assignments, route narrow artifact, process and contract work with mature fixtures to
**GPT-6 Sol at medium effort** for authoring, and Console/API or browser workflows to **Claude Sonnet 5.5 at medium
effort**. Require an independent review by **Sol at medium effort** and a fault check through the real boundary before
accepting authorization, tenant isolation, retention or other high impact changes. Luna may help with discovery or
supplemental review, but is not a sole approver for these classes. Escalate production IAM, deployment identity,
destructive behavior, reviewer disagreement or a missed validated fault to the stronger reference before integration. A
product bug or an incomplete customer contract blocks the slice; preserve its reproducer instead of making the test pass
around it. These are task class routing decisions from a small pilot, not reliability or cost rankings. Recheck them
after a model, harness or helper change and before widening scope.

## Dispatching and integrating slices

One coordinator owns the dependency map, write leases, bug queue and integration branch. Each active worker owns one
bounded assignment. Use Codex/Claude-provided isolated workspaces; do not add repository worktree lifecycle scripts. At
the current four-agent concurrency limit, start with the coordinator, two authors and one reviewer. Run fewer authors
when builds or database/browser workers compete for resources. Do not dispatch the entire catalog at once.

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
not an instruction to mark a Codex goal blocked. A verified discovery counts as useful model output, but the slice is
not fully accepted until the fix session and regression meet the intended contract. Keep private source, credentials and
customer data out of public bug records.

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

The next executable milestone is **scope validation and the minimum pilot fixtures**, followed by the bounded model
comparison. The large rewrite starts only after choosing the configuration and batch policy from those results.

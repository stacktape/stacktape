---
name: quality-loop
description:
  Run or resume Stacktape's private quality discovery program, independently validate findings, or claim its accepted
  queue for a separately requested fix. Use for spare-allowance review batches and continuing quality work, not ordinary
  feature implementation.
---

# Private quality loop

Use the Python 3 standard-library controller through `pnpm quality` at the public root. The queue is the **private**
`stacktape/console-app` repository's `agent-quality-queue` branch. Reports never go into public issues, PR bodies,
commits or documentation. The controller verifies repository privacy before every operation and again before a write.
There is no public destination or credential fallback. Generic tooling and synthetic tests may be public.

This skill is the coordinator; the CLI stores and arbitrates work. A shell `start` command alone does not launch models.
Use the host's agent tools for execution. Read [the operator guide](../../../docs/testing/quality-loop.md) for commands,
recovery and the consumer protocol. Workers read [the report contract](references/reports.md) for the mode assigned.

## Coordinate discovery

1. Read repository instructions and business documents. Run `pnpm quality status` (or `init` on first use). Resume the
   requested run; do not create duplicate runs just because this is a new session. Inspect outstanding task IDs before
   launching anything. Queue writes are durable transactions; never edit the data branch manually.
2. Choose the requested hours/units and concurrency, defaulting to two hours, eight units, four discovery workers.
   `start` records explicit public **and active Console** commits; it does not capture dirty files. State that choice if
   the parent is dirty. New work uses host-provided isolated worktrees, checked with `verify-baseline`. Never silently
   inherit a stale Console gitlink. Prepare dependencies before parallel heavy work. Do not create checkouts in shell.
3. Use `next --run <id> --request <unique-dispatch-id>`. It reserves a job atomically and returns a packet, model,
   attempt and fencing token. Reuse that request ID after an ambiguous response. A null dispatch means wait for existing
   completions or end the batch with its reason, not spin or invent findings. `status` and `packet` reconstruct state
   after a coordinator restart. Expired claims still own their slots until reconciled.
4. Start one fresh task with the packet, the absolute skill/controller paths, a local ignored evidence directory, the
   source checkout and report contract. Use the assigned Sol/Astra model and independent contexts. Confirm provider
   availability and returned model; no silent substitutions. Use high reasoning effort when supported by the host's
   model catalog. Bind the returned task ID immediately. Give the child the binding identity in its brief if already
   available; otherwise the coordinator ingests its result after binding. Record the delegation result locally before
   another dispatch. After a launch failure, confirm no task exists before recovering the reservation.
5. In T3 use `delegate_task` for isolated checkouts, requested settings or background jobs. Follow its returned `next`:
   completion wakes the coordinator, so finish the turn after launching the intended batch. Do not poll, sleep, install
   watchers or create top-level threads. On the next completion, reconcile the saved job, ingest its report, and take
   the next available packet within the existing run budget. Other harnesses follow their own supported agent tools.
6. Discovery reports candidates promptly with `submit`, then finishes the unit. Validation jobs take precedence. A
   validator receives claim and raw evidence without the explorer's severity or remedy and tries to disprove it. Runtime
   and browser claims require independent execution; source-only agreement cannot accept them. Only two distinct models
   in distinct tasks can make a finding `ready`. No product fixes occur in discovery or validation.
7. Preserve checkpoints at setup, reproduction and cleanup. The CLI caps four discovery / six total jobs globally and
   one heavy browser/Docker job, reserves the final 40% of the time window for validation, and pauses discovery behind
   the validation backlog. It stops dispatching at the deadline; the coordinator cancels over-budget active tasks
   through the host and reconciles cleanup. Limits are dispatch controls, not an OS watchdog. On quota refusal, `pause`
   with the reason; preserve pending validation for `resume`. Never switch to paid API funding or another provider
   unasked.
8. Once the budget or useful coverage is exhausted and every job is settled, use
   `complete --run <id> --request <unique-id>` to record the finished batch. Pending validation prevents completion;
   retain it for a later resume if blocked by quota. Summarize pipeline progress, coverage gaps and queue location. Do
   not demand owner review of every finding. Ask for product decisions only when evidence cannot settle them. User
   feedback can become a narrow persistent reporting rule through `feedback`; do not invent owner preferences. Reports
   already fixed or rejected stay in memory for future jobs.

## Investigation standard

Prioritize first successful deployment, then daily deploy/debug. The seeded charters combine journey exploration,
capability coverage and maintenance. Read the charter's anchors and recent fix history. Use prior probes and known
findings to choose a new realistic scenario; passing the existing suite is not exploration. Former slice IDs in the
testing overhaul guide are coverage aids. State what actually ran, working controls and untested boundaries.

UX findings must affect task completion, comprehension, decisions or substantial visual quality; skip polish. Follow the
business personas and product principles. Maintenance needs demonstrated divergence, a real caller workaround, verified
obsolete material or a meaningful documented boundary violation. Size, style and hypothetical abstractions do not
qualify. Include the likely benefit and regression risk; a rare edge case is not automatically worth fixing.

No minimum finding count. A unit has at most three candidates. After two completed units at the same baseline with no
accepted/unresolved findings, that charter stops consuming work. Blocked setup is not a green run. New revisions reopen
coverage; an explicit new probe can reopen a saturated charter using `reopen`. Do not change deduplication keys just to
report the same problem again. A reproduced regression after a recorded fix may use a revision-qualified key and must
reference the earlier finding.

Only the reserved heavy job may use browser/Docker resources in this program. Allocate free ports and an owned container
prefix from the packet, record them at setup, and verify cleanup before finishing. Other repository tasks may still own
resources: never prune globally. Live AWS is a separately scoped, authorized extension; defaults use isolated fixtures.

## Consume the fixing queue

When asked to fix queued issues, `list --status ready`, then atomically `take` one using the actual worker/task
identity. The returned packet includes source revisions, relative files, reproduction, independent validation, risk and
the claim token. Reproduce against current code before editing; accepted at an older baseline does not mean still
present. Coordinate overlapping code changes with existing workers. A claim assigns ownership; it does not authorize
publication, deployment or unrelated refactoring. Preserve private issue details when a fix changes public source.

Finish with `resolve` and concrete commit/PR references plus actual test results, or `release` with a reason. Never mark
an unmerged proposed PR as fixed: release as blocked with its references until integration is verified. Do not take a
second item while the first is unresolved. For a dead worker, follow the same stop-confirmation and fencing protocol;
lease expiry alone never permits stealing a claim. Only user-supplied feedback becomes an owner rule.

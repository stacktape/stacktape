# Private quality discovery and fixing queue

Use the [quality-loop skill](../../.agents/skills/quality-loop/SKILL.md) from any session in this checkout. Codex
discovers it under `.agents/skills`; Claude has a forwarding skill under `.claude/skills`. If a session's skill catalog
predates installation, explicitly ask it to read the linked file. The workflow uses subscription-funded agents through
the host's agent tools, with no model API key or provider CLI wrapper in the controller.

Example requests:

> Use $quality-loop for two hours, with four discovery workers and at most twenty units. Resume existing work first.

> Use $quality-loop to take one accepted finding from the private queue and fix it.

The skill coordinates agents across completion events. `start` creates persistent work and a budget; it is not a daemon
or a shell command that launches models. A session must be executing the skill to dispatch work. Ending or losing that
session does not delete the queue. Another session can read it, reconcile outstanding tasks and continue. A host that
cannot keep a coordinator active must use explicit resume requests; the controller does not install schedules.

## Private storage

The authoritative queue is `state.json` on the **private** `stacktape/console-app` repository's `agent-quality-queue`
branch. This branch has an independent root commit containing only queue data. It never changes either product branch,
the Console submodule pointer or the caller's working tree. Tools and generic procedures may be committed publicly;
actual findings, validation reports, repro output and rejection notes must stay private.

Every CLI operation verifies the repository's exact identity and private visibility through `gh`. Writes verify again
immediately before pushing. Failure to verify stops the operation. The destination and branch are fixed in code; there
is no public override. Authenticated Git uses the existing `gh` credential helper without printing credential values or
modifying Git's global configuration. Requires Python 3.10+, Git and an authenticated `gh` with private-repo access.

Each write reads the current branch head, creates a child commit and attempts a normal fast-forward push. Concurrent
writers retry against the winner. No force pushes, shared checkout or unreliable issue-label locks. A request ID makes
ambiguous retries idempotent: use the **same** ID after a lost response, a **new** ID for a new action. Returned claim
tokens fence older attempts; they are coordination identifiers, not credentials. Collaborators with write access are
trusted to use the protocol. Queue data has private Git history; do not submit secrets even to this private branch.

Raw logs, screenshots and large artifacts remain in ignored `.stacktape/quality/<run>/<job>/<attempt>/` directories. The
private record must include portable reproduction instructions and essential evidence inline. A local file path alone is
not usable evidence for another machine. Read-only commands emit JSON; use `pnpm --silent quality` when piping. Do not
redirect real queue output into a tracked public file.

## Start and resume

Run from the public repository root:

```sh
pnpm quality init
pnpm quality status
pnpm quality charters
pnpm quality start --id review-01 --hours 2 --units 20 --workers 4
```

`init` creates the private data branch if absent. It is idempotent and never resets existing data. `start` records
public HEAD and **active Console HEAD** separately; explicit `--public-ref` and `--console-ref` are available. Dirty
parent files are not part of the baseline. Workers use clean host-provided worktrees at those commits, allowing only the
expected submodule-pointer difference. Prepare dependencies and select the Console commit before work, then verify:

```sh
pnpm quality verify-baseline --run review-01 --root /absolute/path/to/worker-checkout
```

If the worker's baseline predates this tool, call the controller by its absolute path in the coordinator's checkout:
`python3 /path/to/stacktape/.agents/skills/quality-loop/scripts/quality_queue.py ...`. This reads no private product
source; `verify-baseline --root` checks the worker's checkout. Pass the skill/report-reference paths in its brief as
well.

`start --charters J1-init,J2-deploy-loop` restricts a batch. Charters cover first deployment, Console UX, deploy/debug,
packaging, access and code maintenance. They incorporate the existing journey/slice guide rather than creating another
product taxonomy. Scheduling rotates areas, preferring the user's priorities, and supplies previous probes, known
findings and owner rules. Two completed units with no accepted/unresolved findings saturate a charter at that baseline.
An environment blocker stops repeats until a new baseline or explicit `reopen --charter <id> --probe <new-scenario>`.

When one setup failure demonstrably affects several areas, use
`defer --run <run> --charters <comma-separated-ids> --reason <shared-blocker-and-evidence> --request <unique-id>`. This
records the coverage gap and skips further discovery for those areas in this run without claiming they were tested.
Existing jobs and pending validation are preserved. Use a new run at a compatible baseline to qualify deferred areas;
`reopen` does not override a run-level deferral.

To extend a run from this or another session:

```sh
pnpm quality resume --run review-01 --hours 2 --units 20 --request review-01-extension-1
```

`--units` adds discovery units; pending validators retain their original jobs. Baseline changes require a new run.
Coverage and findings remain global, so a new run at the same revisions does not erase rejection/saturation memory.

## Dispatch and checkpoint protocol

When the unit/time budget or available coverage is exhausted and all jobs have settled, mark the batch with
`complete --run <run> --request <unique-id>`. The controller refuses completion while discovery or validation is pending
or running. Accepted findings remain available to fixing agents, and owner-policy questions remain separate. A later
`resume` can extend a completed run without discarding its history.

```sh
pnpm quality next --run review-01 --request review-01-dispatch-001
pnpm quality bind --job <job> --token <token> --task <actual-task-id> --model <assigned-model> --request <job>-bind
pnpm quality checkpoint --job <job> --token <token> --stage setup --note <owned-resources-and-progress> --request <job>-setup
pnpm quality packet --job <job> --token <token>
```

`next` reserves a job and returns its model, baseline, scope, attempt, token and resource prefix. A fresh task is
required per job. The coordinator confirms the returned provider/model, binds the actual task and ingests its results
according to the [report contract](../../.agents/skills/quality-loop/references/reports.md). Candidates go through
`submit` promptly; `finish` records completed exploration or independent validation. Findings accepted by the second
model become `ready`. Policy questions become `needs_owner`; disproof and already-fixed findings remain recorded but
unavailable to fixers.

Default global limits are four discovery jobs, six total jobs and one heavy browser/Docker job. A run may request fewer
discovery workers. Validation is scheduled first; discovery stops when six validations are pending/running. The final
40% of the time window admits only validation. At the deadline no new job starts. These limits arbitrate jobs using this
queue; they cannot control unrelated sessions, process CPU usage or enforce cancellation inside the host. The
coordinator must cancel overdue tasks and reconcile resources. Claim leases are 40 minutes; fixing claims are one hour.
Expiry warns about missing progress and **never** automatically reassigns work.

After a user requests a larger batch and machine headroom is established,
`configure --total 12 --discovery 8 --heavy 2 --backlog 12 --request scale-01` raises the shared limits; a new run can
then request eight discovery workers. These numbers are an example, not a measured safe setting. No automatic scaling
occurs. Lowering limits stops new admissions until active work drains; it does not kill tasks. Keep browser concurrency
at one when the host shares a single browser.

On quota refusal, the coordinator records a pause and ends dispatching:

```sh
pnpm quality pause --run review-01 --reason 'Provider quota exhausted' --request review-01-quota-stop
```

This does not terminate already running host tasks. Allow authorized work to finish or cancel it using the host's task
tool, then record cleanup. There is no accurate remaining-subscription-token estimator; budget in hours and units. No
automatic provider or funding fallback. Do not fill exhausted coverage with low-value findings just to consume quota.

## Interruption recovery

1. Read `status` and the outstanding task via the host tool. Check whether it still runs. Never duplicate a live task.
2. If it completed, ingest the saved candidate/completion report using its token and stable request ID. A repeated
   successful request returns its original receipt without applying the action twice.
3. If it stopped, confirm the stop and clean up its owned processes/containers/tabs. If it is still running and needs
   replacement, cancel it first and verify termination. A timeout alone is insufficient.
4. `recover --job <id> --token <old> --stopped-task <recorded-task> --proof <termination-and-cleanup-evidence> --request <unique-id>`
   requeues the attempt. `next` grants a new token. Old tokens can no longer submit work.

If reservation succeeded but launch never occurred, use `--stopped-task never-launched` only after verifying no task was
created. A coordinator can crash between launch and bind: find the task using the job ID in its title/local delegation
receipt and bind it; do not assume an unbound reservation was never launched. For tasks on another machine, use its
linked host tools; if termination cannot be verified, leave the claim held. The CLI records the proof but cannot verify
T3 task liveness itself. Stale workers must stop when their token is rejected.

## Fixing-agent queue

```sh
pnpm --silent quality list --status ready
pnpm quality take --worker <actual-task-id> --request <task-id>-take-1
pnpm quality show --id <finding>
pnpm quality resolve --id <finding> --token <claim-token> --file <local-resolution.json> --request <finding>-resolved
```

`take` is atomic and selects the highest-priority ready finding; add `--id` for a particular item. It returns a complete
packet, including both model identities, reproduction, affected files, tested commits and benefit/risk judgments. A
fixer must recheck current source before editing. It must preserve privacy in public commit/PR text and follow the usual
two-repository integration order when applicable. Taking work does not authorize deployment or public disclosure.

`release --id <finding> --token <token> --reason <why> --request <unique-id>` returns unfinished work to the queue.
`resolve` records an integrated, verified fix or a concrete blocker; an open PR is not an integrated fix.
`requeue --id <finding> --reason <resolved-blocker> --request <unique-id>` reopens a validated blocked fix. To recover a
dead fixing worker, use
`recover-fix --id <finding> --token <token> --stopped-task <worker> --proof <stop-and-cleanup-evidence> --request <unique-id>`.
No one steals a claim merely because its lease expired.

Use
`feedback --id <finding> --decision keep|reject --reason <owner-feedback> --rule <optional-narrow-rule> --request <unique-id>`
only for actual owner feedback. Rules are included in future packets. Rejected and already-fixed findings remain
searchable. Do not convert an agent's taste into an owner preference or bypass validation to requeue a rejection.

After the owner settles a policy question, or new evidence warrants checking an old finding, use
`revalidate --id <finding> --run <run> --reason <new-evidence-or-owner-decision> --request <unique-id>`. This creates a
fresh independent validation job and retains the old verdict. The target run must contain that charter; it may use a
newer baseline. Owner feedback is included in the new packet. `feedback keep` alone does not make an unresolved finding
ready or bypass the two-model gate.

## Qualification and limits

`pnpm test:quality` uses temporary bare Git repositories and separate worker processes: no GitHub, AWS or model calls.
It exercises competing claims/dispatch, crash rollback, coordinator reconstruction, stale-token rejection, quota pause
and resume, report boundaries, validation gating and repository-privacy refusal. Public CI runs it on Linux, where
agents run the loop; on Windows its Git subprocesses exceed the two-minute PR lane budget. Passing these tests
establishes the queue protocol, not ten-hour machine stability or model judgment quality. Before a large allowance run,
use a short live coordinator batch, current Console UX, and blind plausible-false/intended-behavior validator cases.
Keep synthetic calibration results separate from genuine accepted findings.

No production migration, Console deployment or v4 cutover is required for this tooling. Queue data is private
operational state; do not merge its branch into either product branch or add per-run reports to the public
documentation.

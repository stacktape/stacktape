# Report contract, version 1

The controller validates every report before committing it to the private queue. Unknown keys, wrong revisions,
unbounded payloads and known credential shapes fail closed. This is not a complete secret detector: review all evidence
before submitting. Use synthetic customer data. Maximum report size is 100 KB; do not upload raw log dumps.

Write local report files under an ignored `.stacktape/quality/<run>/<job>/<attempt>/` directory. Never print secret
values or place real findings in public source-control fixtures. Substitute the packet's exact public and Console SHAs
below. Every text field must be meaningful; strings containing only placeholder text are not evidence. All required
fields are shown; there are no extra optional fields in v1.

## Discovery candidate

Submit each candidate with
`pnpm quality submit --job <job> --token <token> --file <local.json> --request <job>-candidate-1`. The successful
response supplies the finding ID and queues independent validation. The explorer must have been bound to its actual
delegated task first. Keep at most three candidates per unit, without manufacturing a minimum.

```json
{
  "version": 1,
  "kind": "candidate",
  "baseline": { "public": "<40-character SHA>", "console": "<40-character SHA>" },
  "dedupe_key": "component:observable-failure-condition",
  "title": "Concrete customer-visible failure",
  "category": "correctness",
  "priority": "P2",
  "realistic_trigger": "Who encounters this, through which normal action, and how plausible is it?",
  "impact": "Concrete user or maintenance cost; distinguish observation from inference.",
  "expected": "Expected result and the product contract that establishes it.",
  "observed": "Actual result, including the key output or persisted state.",
  "files": ["apps/cli/src/example.ts:42"],
  "reproduction": "Self-contained setup, minimal fixture source if needed, commands or interactions, expected and actual results, and cleanup. Another machine must not need a missing local file.",
  "evidence": "Bounded raw observations, failing case and working control. Include essential fixture/code inline. Local screenshot/log references may supplement, never replace the reproduction.",
  "evidence_kind": "runtime",
  "limitations": "What was substituted or not tested, plus uncertain frequency and environment boundaries.",
  "smallest_fix": "Smallest plausible remedy and rough scope; advisory, not an implementation mandate.",
  "fix_risk": "Possible regressions or tradeoffs; why the benefit warrants the change."
}
```

Categories: `correctness`, `data-safety`, `security`, `ux`, `maintenance`. Priorities: `P1` serious user/data/security
impact, `P2` meaningful normal-path failure/friction, `P3` lower-priority concrete cost. Judge UX by task impact; a
visual finding is not automatically comparable to data loss. Evidence kinds: `runtime`, `browser`, `static`. Use
`static` for claims such as proven dependency violations, not unexecuted runtime suspicions. A mixed claim uses the
stronger required kind. Maintenance needs the real affected callers and consequence, not just scanner output.

## Discovery completion

Finish only after owned processes, containers, ports and browser tabs are cleaned up. A setup blocker records `blocked`;
it is not a successful exploration. Candidates are submitted separately so an interrupted job loses less work.

```json
{
  "version": 1,
  "kind": "discovery",
  "baseline": { "public": "<40-character SHA>", "console": "<40-character SHA>" },
  "cleaned_up": true,
  "cleanup": "What was owned, how it was removed and how absence was checked.",
  "evidence": "Scenarios exercised and observed outcomes; separate checks from full journey claims.",
  "limitations": "Remaining untested boundaries or exact setup blocker.",
  "outcome": "covered",
  "next_probe": "A specific unexplored scenario that a future unit could investigate."
}
```

## Independent validation

Use only the assigned packet initially. Independently reproduce or falsify the claim, check the intended behavior and
recent fixes, then return `accept`, `reject`, `already_fixed` or `needs_owner`. Accept only a meaningful problem whose
remedy is likely worth its risk. An absent environment is a limitation, not confirming evidence. Do not use a forced
crash fixture to claim broad customer frequency. Required runtime/browser reproduction must actually execute.

```json
{
  "version": 1,
  "kind": "validation",
  "baseline": { "public": "<40-character SHA>", "console": "<40-character SHA>" },
  "cleaned_up": true,
  "cleanup": "Owned resources and verified cleanup, or why none were needed.",
  "evidence": "Independent reproduction/control and raw observations, or concrete disproof/current fix evidence.",
  "limitations": "What this independent check does not establish.",
  "verdict": "accept",
  "method": "executed",
  "priority": "P2",
  "realistic_trigger": "Independent judgment of customer plausibility, including uncertainties.",
  "fix_risk": "Independent benefit/risk judgment; reject disproportionate hardening."
}
```

`method` is `executed` or `inspected`. A runtime/browser acceptance requires `executed`. The controller checks that the
validator's bound task and assigned model differ from the explorer's. These are process checks, not cryptographic proof
that an agent ran a tool: the coordinator checks the actual delegate result and evidence before ingestion.

## Fixing-agent resolution

Use `resolve --id <finding> --token <claim-token> --file <resolution.json> --request <unique-operation>`.

```json
{
  "outcome": "fixed",
  "summary": "What changed and which current baseline was checked.",
  "checks": "Actual reproducer/regression checks and outcomes, including limitations.",
  "references": "Integrated commit SHAs and private PR links when applicable; no inaccessible local-only evidence."
}
```

`outcome` is `fixed` or `blocked`. A proposed fix or open PR is `blocked` until integrated and verified. `release`
returns an unfinished item to `ready`; `requeue` makes an explicitly resolved blocker available again without changing
its original independent validation. A newly disproved finding should be released and routed to the coordinator for
review.

After an owner decision or materially new evidence, `revalidate` creates a fresh validator job; it does not alter the
explorer's original evidence. The new validation records its own tested baseline. Both versions remain available to
fixing agents, who still recheck current source before editing.

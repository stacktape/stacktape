---
name: stacktape-testing
description:
  Select and run sufficient tests for Stacktape features and bugfixes, including changes spanning Console, CLI,
  packaging and AWS. Use when implementing a behavior change, planning its acceptance evidence, or reviewing whether it
  is sufficiently tested.
---

# Testing a Stacktape change

Work from the public repository root. Read the nearest `AGENTS.md` and affected manifests. The canonical policy is
[docs/testing.md](../../../docs/testing.md); read its sufficiency criteria and the lanes relevant to this change. This
skill is an execution guide, not a claim that every feature already has E2E coverage.

## Choose the evidence before implementing

Run `pnpm test:plan` (or `pnpm test:plan -- --since=<ref>`). Treat path-based suggestions as candidate commands: explain
any substitution with equivalent evidence at the same failure boundary. Do not deploy simply because a path matcher
suggested a deployment. Inspect existing tests and, for Console, the current
[readiness ledger](../../../apps/console/e2e/readiness.md) before assuming fixtures or runners are qualified.

Write a short plan connecting each affected behavior to:

- the customer-visible success assertion;
- the process, database, browser, provider or AWS boundary where it could fail;
- the cheapest test that actually crosses that boundary;
- the relevant denial, invalid-input, retry or cancellation case;
- the durable result and any owned cleanup.

Keep this plan scoped to the requested change. Track each required boundary as proved, failed, or unqualified, with its
evidence or concrete blocker. An unavailable fixture does not justify a weaker substitute: continue independent work and
ask for the smallest missing setup step. Recheck the affected boundary when that fixture becomes available.

Infer routine choices from the requested feature and repository context. A plan is not an approval checkpoint. For a
security feature spanning CLI and Console, use [the worked testing recipe](references/security-feature.md).

## Execute the smallest complete journey

Run focused offline regressions first. Reproduce a bug before fixing it when practical. Reuse the repository's real
adapters, generated artifacts and scenario fixtures; add a feature-specific scenario when the existing suite does not
exercise the behavior. A generic login test, mocked database or successful build cannot stand in for that scenario.

For Console runtime work, read [console-development](../console-development/SKILL.md), then use its setup and cleanup
procedure. Run `pnpm test:doctor -- --for=console` before a long Console lane, unless a still-applicable result is
already recorded in this task. Read the fixture instructions only for the scenarios you need.

For Console browser tests, start with [agent browser access](../../../apps/console/e2e/README.md#agent-browser-access).
Reuse its SSM-backed login and the appropriate Developer or Admin fixture before asking the owner to perform Console
clicks. Provider sign-in and MFA are separate from Console login. Keep the detailed setup in that guide and its
qualification status in the readiness ledger.

- UI changes supported by deployed dev can use UI-only mode. API, permissions or API/UI changes require full local
  `pnpm dev:console` and a browser scenario that verifies its actual API target.
- A changed CLI/API contract must run the current source CLI as a process against the intended API revision. The source
  CLI defaults to deployed dev, independently of whether a local API is running.
- Provider callbacks and background workers require the deployed dev code and a real event when localhost cannot execute
  the changed path. Local API success does not qualify those workers.
- Use disposable PostgreSQL for query/transaction contracts. `test:db` currently proves migration/adoption behavior;
  feature-specific queries need their own real-query evidence.

For browser configuration, deployed artifacts, provider callbacks, queues or runner lifecycle tests, use
[runtime acceptance and diagnosis](references/runtime-acceptance.md). It covers effective runtime targets, exact
fixture/event identity, worker completion, test-harness failures and cleanup. Successful deployment or HTTP acceptance
does not establish that the consumer started or completed the operation.

Reserve shared dev before migrations, full local sessions or version-sensitive acceptance. Preserve existing
authorization: ordinary dev operations are already permitted, but a newly discovered destructive effect on unrelated
shared data requires a concrete explanation and approval. Follow `docs/testing.md` for live AWS ownership, cost and
cleanup; never label the Console hosting account disposable to satisfy an older runner's guard.

Assert the operation's result, not just the transport status: tRPC HTTP 207 can contain a failed procedure. For stored
changes, reload or read through the real API/database. Check access with the intended restricted identity. Retain no
credential-bearing browser artifacts.

## Stop when the evidence is sufficient

Run the affected repository gate after focused checks. Avoid concurrent generators writing the same materializations;
finish local startup before another generating command, and preferably stop local mode before the full gate. Reuse
passing evidence unless source changes, a failure or a new concern invalidates it.

If acceptance finds another bug, fix and repeat the affected scenario before marking it proved. For a documentation-only
follow-up, validate instructions, formatting and links; do not repeat live deployments solely to update the evidence.

Handoff: state the behavior proved, `command — result`, final source revision or uncommitted diff, and remaining
untested boundaries. For live work, include account, region, fixture ownership, cleanup result and reservation release.
Update the Console readiness ledger when qualifying reusable infrastructure or discovering a reusable blocker; do not
turn it into a log of every ordinary feature change. Keep detailed per-run commands and sanitized results in the ignored
`.stacktape/` evidence directory; put only reusable conclusions and prerequisites in the ledger. Update fixture
qualification only for the exact capability proved. A missing required fixture or failed acceptance case stays
unqualified even when the repository gate is green.

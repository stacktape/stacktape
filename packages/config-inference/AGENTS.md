# Stacktape config inference

This package turns a repository into a Stacktape configuration. It contains **no AI**, and that is the point: an agent's
only contribution to the pipeline is a schema-validated facts document, and everything that decides what infrastructure
gets created lives here, where it can be tested.

```
probes ──► candidate facts ──► [agent reviews] ──► verification ──► composer ──► config
  (deterministic)                (elsewhere)       (deterministic)  (deterministic)
```

## The rules that hold this together

**Facts are observational, never prescriptive.** Every field must be confirmable or refutable by reading the repository.
`exposesHttp` belongs; `resourceType` does not. The moment a field describes desired infrastructure, the agent is
writing the config again with extra steps — and the variance we removed comes straight back. Classification is
`compose/classify.ts`'s job.

**Environment values never leave the machine.** `policy/file-access.ts` gives every `.env*` file `names-only` access,
with **no exception for `.env.example`** — example files pick up real values by accident, and a rule with an exception
is one someone gets wrong at a call site. The single exception in the whole package is `ProbeContext.readPrivileged`,
used only by `scan/probes/environment.ts` to reduce a connection string to two enum members. Citations from that probe
quote only the left of the `=`, so a facts document is safe to show, store and transmit by construction rather than by
everyone downstream remembering to redact.

**The agent submits a different, smaller schema than the one the pipeline uses.** `facts/agent-submission.ts` carries
observations only. It has no `source`, no `blocksDeploy`, no `recommended`, no identifiers and no prose; those are
stamped on deterministically by `mergeAgentSubmission` against an immutable probe baseline.

This is not tidiness. The first version let the agent submit a whole `ProjectFacts`, and verification skips downgrading
anything marked `source: 'probe'` — so an agent writing `source: 'probe'` on a fabricated database was never checked and
never questioned. One field disabled the entire verification layer. Keep the boundary a type. If you add a field the
agent can set, ask what a prompt-injected agent would do with it.

**Nothing the agent authors may reach the user as words.** Uncertainties are a closed discriminated union of parameters
(`facts/uncertainty.ts`); the wizard owns every question, option and price. The agent reads untrusted repository
content, so free text it produces could otherwise reach the user as "paste your AWS key here". `ProjectFacts.notes` is a
probe-and-verifier field; agent submissions cannot populate it.

**Unanswered questions stop a deploy.** `composeConfig` returns `blockedBy` and `deployable`, and the deploy path must
consult those rather than the config's existence. Composition still produces a configuration while questions are
outstanding, because the user needs the diagram and the cost while deciding — but an earlier version dropped the input
uncertainties entirely, which meant a carefully downgraded claim was composed into real infrastructure and its question
vanished.

**A live external database is never quietly replaced.** When `currentlyHostedOn` names a real provider, composition
creates nothing and raises `external-database-disposition`. Provisioning RDS beside a running Supabase database is worse
than never having detected it.

**Downgrade, never drop.** `verify/verify-facts.ts` turns unconfirmed claims into questions and removes nothing. A
silently deleted database produces a config that deploys and an app that crashes — from the user's chair that is wrong
infrastructure, not reduced coverage.

**Every required field needs an honest escape hatch.** `checkFactsCompleteness` accepts a missing start command when a
`command-unknown` uncertainty was raised. A required field a model cannot satisfy truthfully is a fabrication generator.

**Containers unless proven otherwise.** A container runs what the repository already runs. A function needs a
handler-shaped entrypoint, no local disk, and a fixed timeout — so it requires evidence, never a guess. Being
conservative costs a few dollars a month; being wrong costs the user's first impression.

## Working here

- `bun test src` and `tsc -p tsconfig.json` both stay clean.
- Subpath exports only, no barrels. `facts/*` and `compose/*` must stay browser-safe — the wizard UI imports them.
  `scan/*` and `verify/*` may use `node:` APIs.
- Anchors in `verify/anchors.ts` should almost never reject a correct claim. They exist to catch confident nonsense (a
  MongoDB claim citing a Prisma Postgres import), not to classify. When tightening one, add the false-positive case to
  the tests first.
- Probes never guess. See it in the bytes and emit a fact; see that it is ambiguous and emit an uncertainty; otherwise
  stay silent and let the agent fill the gap.
- Probes overlap on purpose. That redundancy is what lets verification treat an agent claim as corroborated, so merging
  in `scan/assemble.ts` accumulates evidence rather than replacing it.
- Cross-probe reconciliation belongs in the assembler, not in a probe. A probe cannot know what another one found.

## Known gaps

- Probes cover the JavaScript/TypeScript ecosystem and environment files. Python, Go, Ruby, PHP and Java manifests,
  `docker-compose.yml`, Dockerfiles, existing IaC manifests and source-level signals (port binds, health endpoints,
  local filesystem writes) are not yet probed — the agent currently supplies all of it.
- `mergeDependencies` keys on kind, so two Postgres instances collapse into one. The agent can split them; no probe
  currently can.
- Composed output is asserted structurally in tests. It is not yet validated against the real Stacktape config schema —
  that belongs in an integration test in `apps/cli`, which may legally import the validator.
